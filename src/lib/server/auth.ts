// Autentificare: parole cu scrypt (din `node:crypto`, fara dependinte) si
// sesiuni opace in cookie. Fara JWT — nu avem nevoie de stateless, iar o
// sesiune in DB se poate revoca instantaneu.
import { randomBytes, scryptSync, timingSafeEqual, randomUUID } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { db } from './db';

const SCRYPT = { N: 16384, r: 8, p: 1 };
const KEYLEN = 64;
const SESSION_COOKIE = 'pontaj_session';
const SESSION_DAYS = 30;

export function hashPassword(password: string): string {
	const salt = randomBytes(16).toString('hex');
	const key = scryptSync(password, salt, KEYLEN, SCRYPT).toString('hex');
	return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt}$${key}`;
}

export function verifyPassword(password: string, stored: string): boolean {
	const [scheme, N, r, p, salt, key] = stored.split('$');
	if (scheme !== 'scrypt') return false;
	const expected = Buffer.from(key, 'hex');
	const actual = scryptSync(password, salt, expected.length, {
		N: Number(N),
		r: Number(r),
		p: Number(p)
	});
	// Comparatie in timp constant: altfel durata raspunsului scurge informatie.
	return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function createSession(userId: number, cookies: Cookies, secure: boolean): string {
	const id = randomUUID();
	const expires = Date.now() + SESSION_DAYS * 86400_000;
	db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(
		id,
		userId,
		expires
	);
	cookies.set(SESSION_COOKIE, id, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
		maxAge: SESSION_DAYS * 86400
	});
	return id;
}

export function destroySession(cookies: Cookies) {
	const id = cookies.get(SESSION_COOKIE);
	if (id) db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

export type SessionUser = { id: number; username: string; totp_enabled: number };

export function userFromCookies(cookies: Cookies): SessionUser | null {
	const id = cookies.get(SESSION_COOKIE);
	if (!id) return null;
	const row = db
		.prepare(
			`SELECT u.id, u.username, u.totp_enabled, s.expires_at
			 FROM sessions s JOIN users u ON u.id = s.user_id
			 WHERE s.id = ?`
		)
		.get(id) as (SessionUser & { expires_at: number }) | undefined;
	if (!row) return null;
	if (row.expires_at < Date.now()) {
		db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
		return null;
	}
	return { id: row.id, username: row.username, totp_enabled: row.totp_enabled };
}

// Contul initial din PONTAJ_USER/PONTAJ_PASS, pentru instalari automate: creat
// o singura data, la prima pornire cu DB gol. Fara ele, primul cont se face din
// pagina de instalare (`/setup`).
export function seedInitialUser() {
	const count = (db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n;
	if (count > 0) return;
	const username = process.env.PONTAJ_USER;
	const password = process.env.PONTAJ_PASS;
	if (!username || !password) return;
	createUser(username, password, null);
	console.log(`[pontaj] Initial account created: ${username}`);
}

export function createUser(username: string, password: string, prefs: string | null): number {
	const r = db
		.prepare('INSERT INTO users (username, password_hash, prefs) VALUES (?, ?, ?)')
		.run(username, hashPassword(password), prefs);
	return Number(r.lastInsertRowid);
}

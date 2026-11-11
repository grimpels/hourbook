// Preferintele de limba si format, pe utilizator. Stau in `users.prefs` (JSON);
// NULL inseamna valorile implicite ale limbii implicite.
import type { Cookies } from '@sveltejs/kit';
import { db } from './db';
import { normalizePrefs, isLocale, DEFAULT_PREFS, type Prefs, type Locale } from '$lib/prefs';
import { defaultLang } from './instance';

// Pagina de autentificare nu are utilizator, dar trebuie sa vorbeasca limba
// lui: cookie-ul se scrie la autentificare si la salvarea preferintelor.
const LANG_COOKIE = 'pontaj_lang';

export function getPrefs(userId: number): Prefs {
	const row = db.prepare('SELECT prefs FROM users WHERE id = ?').get(userId) as
		| { prefs: string | null }
		| undefined;
	let raw: unknown = null;
	try {
		raw = row?.prefs ? JSON.parse(row.prefs) : null;
	} catch {
		// O valoare stricata nu blocheaza aplicatia: se cade pe valorile implicite.
	}
	return normalizePrefs(raw, defaultLang());
}

export function setPrefs(userId: number, p: Prefs) {
	db.prepare('UPDATE users SET prefs = ? WHERE id = ?').run(JSON.stringify(p), userId);
}

export function guestPrefs(cookies: Cookies): Prefs {
	const c = cookies.get(LANG_COOKIE);
	return DEFAULT_PREFS[isLocale(c) ? c : defaultLang()];
}

export function setLangCookie(cookies: Cookies, lang: Locale, secure: boolean) {
	cookies.set(LANG_COOKIE, lang, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
		maxAge: 31536000
	});
}

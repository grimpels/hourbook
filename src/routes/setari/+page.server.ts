import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { hashPassword, verifyPassword } from '$lib/server/auth';
import { newSecret, totpUri, verifyTotp } from '$lib/server/totp';
import { listLocks, listRecent, unlock, unlockAll } from '$lib/server/ratelimit';
import { getSmtp, setSetting, getSchedule, smtpConfigured, getProvider } from '$lib/server/settings';
import { sendMail, recentSends } from '$lib/server/mailer';
import { clientsWithEmail } from '$lib/server/entries';
import { setPrefs, setLangCookie } from '$lib/server/prefs';
import { cookieSecure } from '$lib/server/instance';
import { normalizePrefs } from '$lib/prefs';
import { translate, type Key, type Params } from '$lib/i18n';
import { toDataURL } from 'qrcode';

const tr = (locals: App.Locals, key: Key, params?: Params) =>
	translate(locals.prefs.lang, key, params);

export const load: PageServerLoad = async ({ locals }) => {
	const row = db
		.prepare('SELECT totp_enabled FROM users WHERE id = ?')
		.get(locals.user!.id) as { totp_enabled: number };
	const sessions = (
		db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?').get(locals.user!.id) as {
			n: number;
		}
	).n;
	return {
		user: locals.user,
		totpEnabled: !!row.totp_enabled,
		sessions,
		locks: listLocks(),
		recent: listRecent(),
		// Parola nu pleaca niciodata catre browser; se trimite doar daca e schimbata.
		provider: getProvider(),
		smtp: { ...getSmtp(), pass: '' },
		smtpSet: smtpConfigured(),
		schedule: getSchedule(),
		recipients: clientsWithEmail(locals.user!.id).map((c) => ({ name: c.name, email: c.doc_email })),
		sends: recentSends()
	};
};

export const actions: Actions = {
	// Genereaza un secret nou si il tine in DB ca "in curs de activare"
	// (totp_enabled ramane 0 pana la confirmarea unui cod valid).
	start2fa: async ({ locals }) => {
		const secret = newSecret();
		db.prepare('UPDATE users SET totp_secret = ?, totp_enabled = 0 WHERE id = ?').run(
			secret,
			locals.user!.id
		);
		const uri = totpUri(secret, locals.user!.username);
		return { secret, uri, qr: await toDataURL(uri, { margin: 1, width: 220 }) };
	},

	confirm2fa: async ({ locals, request }) => {
		const code = String((await request.formData()).get('code') ?? '');
		const row = db
			.prepare('SELECT totp_secret FROM users WHERE id = ?')
			.get(locals.user!.id) as { totp_secret: string | null };
		if (!row.totp_secret) return fail(400, { error: tr(locals, 'err.noPendingSecret') });
		if (!verifyTotp(row.totp_secret, code)) return fail(400, { error: tr(locals, 'err.badCode') });
		db.prepare('UPDATE users SET totp_enabled = 1 WHERE id = ?').run(locals.user!.id);
		return { enabled: true };
	},

	disable2fa: async ({ locals, request }) => {
		const password = String((await request.formData()).get('password') ?? '');
		const row = db
			.prepare('SELECT password_hash FROM users WHERE id = ?')
			.get(locals.user!.id) as { password_hash: string };
		if (!verifyPassword(password, row.password_hash))
			return fail(400, { error: tr(locals, 'err.badPassword') });
		db.prepare('UPDATE users SET totp_enabled = 0, totp_secret = NULL WHERE id = ?').run(
			locals.user!.id
		);
		return { disabled: true };
	},

	password: async ({ locals, request }) => {
		const f = await request.formData();
		const current = String(f.get('current') ?? '');
		const next = String(f.get('next') ?? '');
		if (next.length < 10) return fail(400, { error: tr(locals, 'err.pwTooShort') });
		const row = db
			.prepare('SELECT password_hash FROM users WHERE id = ?')
			.get(locals.user!.id) as { password_hash: string };
		if (!verifyPassword(current, row.password_hash))
			return fail(400, { error: tr(locals, 'err.currentPwWrong') });
		db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
			hashPassword(next),
			locals.user!.id
		);
		return { passwordChanged: true };
	},

	// Limba si formatele. Se valideaza prin `normalizePrefs`: o valoare
	// necunoscuta devine cea implicita, nu ajunge in baza de date.
	prefs: async ({ locals, request, cookies, url }) => {
		const f = await request.formData();
		const p = normalizePrefs(
			{
				lang: f.get('lang'),
				dateFormat: f.get('dateFormat'),
				hour12: f.get('clock') === '12',
				weekStart: Number(f.get('weekStart')),
				decimal: f.get('decimal')
			},
			locals.prefs.lang
		);
		setPrefs(locals.user!.id, p);
		setLangCookie(cookies, p.lang, cookieSecure(url));
		// Paginile se randeaza dupa actiune, in aceeasi cerere: cu preferintele noi,
		// altfel confirmarea ar aparea inca in limba veche.
		locals.prefs = p;
		return { prefsSaved: true };
	},

	provider: async ({ request }) => {
		const f = await request.formData();
		setSetting('provider', {
			firma: String(f.get('firma') ?? '').trim(),
			reprezentant: String(f.get('reprezentant') ?? '').trim(),
			cui: String(f.get('cui') ?? '').trim(),
			adresa: String(f.get('adresa') ?? '').trim()
		});
		return { providerSaved: true };
	},

	smtp: async ({ request }) => {
		const f = await request.formData();
		const pass = String(f.get('pass') ?? '');
		const current = getSmtp();
		setSetting('smtp', {
			host: String(f.get('host') ?? '').trim(),
			port: Number(f.get('port') ?? 587) || 587,
			secure: f.get('secure') === 'on',
			user: String(f.get('user') ?? '').trim(),
			// Campul gol inseamna "pastreaza parola existenta", nu "sterge-o":
			// altfel orice salvare a celorlalte campuri ar goli parola.
			pass: pass || current.pass,
			from: String(f.get('from') ?? '').trim()
		});
		return { smtpSaved: true };
	},

	testMail: async ({ request, locals }) => {
		const to = String((await request.formData()).get('to') ?? '').trim();
		if (!to) return fail(400, { error: tr(locals, 'err.testAddress') });
		try {
			await sendMail(
				to,
				tr(locals, 'mail.testSubject'),
				`<p>${tr(locals, 'mail.testBody')}</p>
				 <p style="color:#6b6b66;font-size:13px">${tr(locals, 'mail.testBy', { user: locals.user!.username })}</p>`
			);
			return { testSent: to };
		} catch (e) {
			return fail(502, {
				error: tr(locals, 'err.sendFailed', { detail: e instanceof Error ? e.message : String(e) })
			});
		}
	},

	schedule: async ({ request }) => {
		const f = await request.formData();
		const current = getSchedule();
		const frequency = f.get('frequency') === 'saptamanal' ? 'saptamanal' : 'lunar';
		const day = Math.min(Math.max(Number(f.get('day') ?? 1) || 1, 1), frequency === 'saptamanal' ? 7 : 28);
		setSetting('schedule', {
			...current,
			enabled: f.get('enabled') === 'on',
			frequency,
			day,
			hour: Math.min(Math.max(Number(f.get('hour') ?? 8) || 0, 0), 23)
		});
		return { scheduleSaved: true };
	},

	deblocheaza: async ({ request }) => {
		const key = String((await request.formData()).get('key') ?? '');
		const ok = unlock(key);
		return { unlocked: ok ? 1 : 0 };
	},

	deblocheazaTot: async () => ({ unlocked: unlockAll() }),

	// Deconecteaza toate sesiunile, inclusiv cea curenta.
	revoke: async ({ locals }) => {
		db.prepare('DELETE FROM sessions WHERE user_id = ?').run(locals.user!.id);
		return { revoked: true };
	}
};

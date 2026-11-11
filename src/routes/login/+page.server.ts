import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { db } from '$lib/server/db';
import { verifyPassword, createSession } from '$lib/server/auth';
import { verifyTotp } from '$lib/server/totp';
import { checkLogin, recordFailure, recordSuccess } from '$lib/server/ratelimit';
import { getPrefs, setLangCookie } from '$lib/server/prefs';
import { clientIp, cookieSecure } from '$lib/server/instance';
import { translate } from '$lib/i18n';
import type { Locale } from '$lib/prefs';

function waitLabel(seconds: number, lang: Locale): string {
	const m = Math.ceil(seconds / 60);
	return m <= 1 ? translate(lang, 'login.oneMinute') : translate(lang, 'login.minutes', { n: m });
}

type Row = { id: number; password_hash: string; totp_secret: string | null; totp_enabled: number };

export const actions: Actions = {
	default: async (event) => {
		const { request, cookies, url, setHeaders, locals } = event;
		const lang = locals.prefs.lang;
		const form = await request.formData();
		const username = String(form.get('username') ?? '').trim();
		const password = String(form.get('password') ?? '');
		const code = String(form.get('code') ?? '').trim();

		// IP-ul real al vizitatorului, nu al proxy-ului din fata: vezi `clientIp`.
		const ip = clientIp(event);

		// Verificarea blocarii se face INAINTE de scrypt: altfel fiecare incercare
		// gresita ar costa serverul o derivare costisitoare.
		const wait = checkLogin(ip, username);
		if (wait > 0) {
			console.warn(`[pontaj] sign-in blocked ip=${ip} user=${username} remaining=${wait}s`);
			// 429, nu 400: cererea e perfect valida, doar vine prea des. `Retry-After`
			// e antetul standard prin care clientul afla cat sa astepte.
			setHeaders({ 'Retry-After': String(wait) });
			return fail(429, {
				error: translate(lang, 'login.tooMany', { wait: waitLabel(wait, lang) }),
				username
			});
		}

		const user = db
			.prepare('SELECT id, password_hash, totp_secret, totp_enabled FROM users WHERE username = ?')
			.get(username) as Row | undefined;

		// Acelasi mesaj pentru user inexistent si parola gresita: altfel formularul
		// spune unui atacator care conturi exista.
		// 401, nu 400: datele trimise sunt valide ca forma, doar nu se potrivesc.
		if (!user || !verifyPassword(password, user.password_hash)) {
			const locked = recordFailure(ip, username);
			console.warn(`[pontaj] wrong password ip=${ip} user=${username}${locked ? ' -> LOCKED' : ''}`);
			return fail(401, { error: translate(lang, 'login.bad'), username });
		}

		if (user.totp_enabled) {
			// Lipsa codului nu e o incercare esuata: e primul pas normal al
			// formularului. Un cod gresit este. 401 fiindca cererea inca nu e
			// autentificata — nu e o cerere malformata.
			if (!code) return fail(401, { needCode: true, username });
			if (!verifyTotp(user.totp_secret!, code)) {
				const locked = recordFailure(ip, username);
				console.warn(`[pontaj] wrong 2FA code ip=${ip} user=${username}${locked ? ' -> LOCKED' : ''}`);
				return fail(401, { needCode: true, error: translate(lang, 'err.badCode'), username });
			}
		}

		recordSuccess(ip, username);
		createSession(user.id, cookies, cookieSecure(url));
		// Pagina de autentificare de data viitoare vorbeste limba contului.
		setLangCookie(cookies, getPrefs(user.id).lang, cookieSecure(url));
		throw redirect(303, url.searchParams.get('next') || '/');
	}
};

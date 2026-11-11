import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { createUser, createSession } from '$lib/server/auth';
import { setLangCookie } from '$lib/server/prefs';
import {
	checkSetupToken, needsSetup, setInstance, cookieSecure, siteOrigin
} from '$lib/server/instance';
import { normalizePrefs } from '$lib/prefs';
import { translate } from '$lib/i18n';

export const load: PageServerLoad = async ({ url, request }) => {
	const token = url.searchParams.get('token') ?? '';
	return {
		token,
		tokenOk: !!token && checkSetupToken(token),
		// Adresa fixata prin ORIGIN nu se mai alege aici.
		fixedOrigin: process.env.ORIGIN ?? '',
		// Un X-Forwarded-For in cerere inseamna aproape sigur ca in fata e un proxy.
		proxyHint: !!request.headers.get('x-forwarded-for') || !!process.env.ADDRESS_HEADER,
		dbPath: process.env.PONTAJ_DB ?? 'data/pontaj.db'
	};
};

/** `https://time.example.com/ceva/` -> `https://time.example.com`; altceva -> null. */
function cleanOrigin(raw: string): string | null {
	try {
		const u = new URL(raw.trim());
		return u.protocol === 'http:' || u.protocol === 'https:' ? u.origin : null;
	} catch {
		return null;
	}
}

export const actions: Actions = {
	default: async ({ request, cookies, url, locals }) => {
		const f = await request.formData();
		const prefs = normalizePrefs(
			{
				lang: f.get('lang'),
				dateFormat: f.get('dateFormat'),
				hour12: f.get('clock') === '12',
				weekStart: Number(f.get('weekStart')),
				decimal: f.get('decimal')
			},
			locals.prefs.lang
		);
		const t = (k: Parameters<typeof translate>[1]) => translate(prefs.lang, k);
		const username = String(f.get('username') ?? '').trim();
		const password = String(f.get('password') ?? '');
		const origin = process.env.ORIGIN ?? cleanOrigin(String(f.get('origin') ?? ''));
		const proxy = f.get('proxy') === 'on';
		const keep = { username, origin: String(f.get('origin') ?? ''), proxy };

		if (!checkSetupToken(String(f.get('token') ?? '')))
			return fail(403, { ...keep, error: t('setup.badToken') });
		if (!origin) return fail(400, { ...keep, error: t('setup.badOrigin') });
		if (!username || username.length > 64) return fail(400, { ...keep, error: t('setup.badUser') });
		if (password.length < 10) return fail(400, { ...keep, error: t('err.pwTooShort') });
		if (password !== String(f.get('password2') ?? ''))
			return fail(400, { ...keep, error: t('setup.pwMismatch') });

		// Verificare si creare in aceeasi tranzactie: doua formulare trimise deodata
		// nu pot face amandoua cate un prim cont.
		let userId = 0;
		db.exec('BEGIN IMMEDIATE');
		try {
			if (!needsSetup()) {
				db.exec('ROLLBACK');
				throw redirect(303, '/login');
			}
			userId = createUser(username, password, JSON.stringify(prefs));
			setInstance({ origin, proxy, lang: prefs.lang });
			db.exec('COMMIT');
		} catch (e) {
			if (db.isTransaction) db.exec('ROLLBACK');
			throw e;
		}
		console.log(`[pontaj] Setup complete: account "${username}", address ${siteOrigin()}`);

		createSession(userId, cookies, cookieSecure(url));
		setLangCookie(cookies, prefs.lang, cookieSecure(url));
		throw redirect(303, '/');
	}
};

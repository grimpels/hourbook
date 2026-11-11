// Setarile instantei: ce se alege o singura data, in pagina de instalare —
// adresa site-ului, daca sta in spatele unui proxy, limba implicita. Stau in
// baza, nu in variabile de mediu, ca instalarea sa nu ceara editarea fisierelor.
// Variabilele de mediu (ORIGIN, ADDRESS_HEADER, PONTAJ_LANG) au in continuare
// prioritate: instalarile mai vechi, configurate asa, merg neschimbate.
import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from './db';
import { getSetting, setSetting } from './settings';
import { isLocale, type Locale } from '$lib/prefs';

export type Instance = {
	/** `https://time.example.com`, fara `/` la final. Gol = adresa cererii. */
	origin: string;
	/** In fata sta un proxy (Caddy, nginx...) care pune IP-ul real in X-Forwarded-For. */
	proxy: boolean;
	lang: Locale;
};

export function getInstance(): Partial<Instance> {
	return getSetting<Partial<Instance>>('instance', {});
}

export function setInstance(i: Instance) {
	setSetting('instance', i);
}

/** Limba paginii de autentificare si a conturilor fara preferinte. */
export function defaultLang(): Locale {
	const env = process.env.PONTAJ_LANG;
	if (isLocale(env)) return env;
	const l = getInstance().lang;
	return isLocale(l) ? l : 'en';
}

/** `https://...` daca e cunoscuta: din ORIGIN, apoi din instalare. */
export function siteOrigin(): string {
	return (process.env.ORIGIN || getInstance().origin || '').replace(/\/+$/, '');
}

/**
 * Cookie-urile sunt `Secure` doar cand cererea chiar vine pe HTTPS. Pe HTTP
 * simplu (`http://server:3000`, prima pornire) browserul ar arunca un cookie
 * `Secure`, iar autentificarea ar „reusi" fara sa te lase sa intri. In spatele
 * unui proxy cererea ajunge pe HTTP, deci decide adresa configurata — dar doar
 * pentru gazda ei: accesul direct pe IP ramane pe HTTP si trebuie sa mearga.
 */
export function cookieSecure(url: URL): boolean {
	const o = siteOrigin();
	if (o) {
		try {
			const u = new URL(o);
			if (u.host === url.host) return u.protocol === 'https:';
		} catch {
			// Adresa stricata: se judeca dupa cerere.
		}
	}
	return url.protocol === 'https:';
}

/**
 * IP-ul vizitatorului, pentru limitarea incercarilor de autentificare.
 * Antetul X-Forwarded-For se crede DOAR daca s-a declarat un proxy: altfel
 * oricine ar trimite un antet fals si ar ocoli limitarea. Se ia ultima
 * valoare — cea scrisa de proxy-ul nostru, nu de vizitator.
 */
export function clientIp(event: RequestEvent): string {
	if (process.env.ADDRESS_HEADER) return event.getClientAddress();
	if (getInstance().proxy) {
		const xff = event.request.headers.get('x-forwarded-for');
		const last = xff?.split(',').map((s) => s.trim()).filter(Boolean).pop();
		if (last) return last;
	}
	return event.getClientAddress();
}

// --- Instalarea --------------------------------------------------------

export function needsSetup(): boolean {
	return (db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n === 0;
}

// Codul de instalare: doar cine vede log-urile serverului poate crea primul
// cont. Fara el, oricine nimereste primul pe un server proaspat pornit ar
// deveni administrator. Se tine in memorie: la repornire se genereaza altul.
let token = '';

export function setupToken(): string {
	if (!token) token = randomBytes(12).toString('hex');
	return token;
}

export function checkSetupToken(t: string): boolean {
	const a = Buffer.from(t);
	const b = Buffer.from(setupToken());
	return a.length === b.length && timingSafeEqual(a, b);
}

/** Mesajul din log, cu adresa gata de deschis. */
export function announceSetup() {
	if (!needsSetup()) return;
	const base = siteOrigin() || `http://<server>:${process.env.PORT ?? 3000}`;
	console.log(
		[
			'',
			'  Pontaj is not set up yet. Open this address to create the first account:',
			'',
			`    ${base}/setup?token=${setupToken()}`,
			'',
			'  The code changes every time the server restarts.',
			''
		].join('\n')
	);
}

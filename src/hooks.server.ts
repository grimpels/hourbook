import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { userFromCookies, seedInitialUser } from '$lib/server/auth';
import { startScheduler } from '$lib/server/scheduler';
import { getPrefs, guestPrefs, setLangCookie } from '$lib/server/prefs';
import { isLocale, DEFAULT_PREFS } from '$lib/prefs';
import { translate } from '$lib/i18n';
import { needsSetup, announceSetup, cookieSecure } from '$lib/server/instance';
import { crossSiteForm } from '$lib/csrf';

seedInitialUser();
announceSetup();
startScheduler();

const PUBLIC = ['/login'];

// Odata creat primul cont, instalarea nu mai revine: nu se mai intreaba baza.
let installed = false;

export const handle: Handle = async ({ event, resolve }) => {
	// In locul verificarii din SvelteKit (dezactivata in vite.config.ts), care
	// cere ORIGIN fixat la pornire. Vezi `$lib/csrf`.
	const req = event.request;
	if (crossSiteForm(req.method, req.headers.get('content-type'), req.headers.get('origin'), event.url.host))
		return new Response(`Cross-site ${req.method} form submissions are forbidden`, { status: 403 });

	const path = event.url.pathname;
	if (!installed) installed = !needsSetup();
	if (!installed) {
		// Inainte de primul cont exista doar pagina de instalare.
		event.locals.user = null;
		// Limba aleasa in pagina de instalare (`?lang=`), tinuta in cookie.
		const l = event.url.searchParams.get('lang');
		if (isLocale(l)) setLangCookie(event.cookies, l, cookieSecure(event.url));
		event.locals.prefs = isLocale(l) ? DEFAULT_PREFS[l] : guestPrefs(event.cookies);
		if (path !== '/setup') {
			if (path.startsWith('/api/')) return new Response('Not set up yet', { status: 503 });
			throw redirect(303, '/setup');
		}
		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html.replace('%pontaj.theme%', '').replace('%pontaj.lang%', event.locals.prefs.lang)
		});
	}
	if (path === '/setup') throw redirect(303, '/');

	event.locals.user = userFromCookies(event.cookies);
	event.locals.prefs = event.locals.user
		? getPrefs(event.locals.user.id)
		: guestPrefs(event.cookies);

	const isPublic = PUBLIC.some((p) => path === p || path.startsWith(p + '/'));

	if (!event.locals.user && !isPublic) {
		if (path.startsWith('/api/'))
			return new Response(translate(event.locals.prefs.lang, 'err.unauthenticated'), { status: 401 });
		throw redirect(303, '/login?next=' + encodeURIComponent(path));
	}
	if (event.locals.user && path === '/login') throw redirect(303, '/');

	// Tema aleasa se scrie in HTML pe server, din cookie: fara asta pagina ar
	// aparea o clipa in tema gresita la fiecare incarcare.
	const theme = event.cookies.get('pontaj_theme');
	const attr = theme === 'dark' || theme === 'light' ? theme : '';

	// `locals.prefs` se citeste la randare, nu aici: o actiune de formular care
	// schimba limba il actualizeaza, iar pagina trebuie sa iasa deja in limba noua.
	return resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replace('%pontaj.theme%', attr).replace('%pontaj.lang%', event.locals.prefs.lang)
	});
};

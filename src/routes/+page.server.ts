import type { PageServerLoad } from './$types';
import { listEntries, listClients, listProjects, listActivities } from '$lib/server/entries';
import { getTimer } from '$lib/server/timer';
import { startOfWeek, startOfMonth, addDays, toISODay } from '$lib/time';

export const load: PageServerLoad = async ({ locals, url }) => {
	const view = (url.searchParams.get('view') ?? 'week') as 'week' | 'month' | 'list';
	const date = url.searchParams.get('date') ?? toISODay(new Date());

	// Intervalul incarcat depinde de vizualizare. Pentru luna se incarca si
	// zilele din saptamanile de margine, ca sa nu apara casute goale in grila.
	// Saptamana incepe in ziua aleasa de utilizator (luni sau duminica).
	const ws = locals.prefs.weekStart;
	let from: string, to: string;
	if (view === 'week') {
		from = startOfWeek(date, ws);
		to = addDays(from, 6);
	} else if (view === 'month') {
		const first = startOfMonth(date);
		const [y, m] = first.split('-').map(Number);
		const last = toISODay(new Date(y, m, 0));
		from = startOfWeek(first, ws);
		to = addDays(startOfWeek(last, ws), 6);
	} else {
		from = url.searchParams.get('from') ?? startOfMonth(date);
		to = url.searchParams.get('to') ?? addDays(startOfMonth(addDays(startOfMonth(date), 31)), -1);
	}

	return {
		user: locals.user,
		view,
		date,
		from,
		to,
		entries: listEntries(locals.user!.id, from, to),
		clients: listClients(locals.user!.id),
		projects: listProjects(locals.user!.id),
		activities: listActivities(locals.user!.id),
		// Incarcat odata cu pagina, ca bara cronometrului sa apara imediat, fara salt.
		timer: getTimer(locals.user!.id)
	};
};

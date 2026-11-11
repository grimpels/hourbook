import type { RequestHandler } from './$types';
import { buildReport, reportCsv } from '$lib/server/report';

// Export timesheet. Acelasi CSV ca atasamentul din email, deci aceleasi coloane,
// formate si separator — vezi `reportCsv`.
export const GET: RequestHandler = async ({ locals, url }) => {
	const from = url.searchParams.get('from') ?? '0000-01-01';
	const to = url.searchParams.get('to') ?? '9999-12-31';

	const r = buildReport({
		userId: locals.user!.id,
		username: locals.user!.username,
		from,
		to,
		client: url.searchParams.get('client') || undefined,
		project: url.searchParams.get('project') || undefined,
		prefs: locals.prefs
	});

	return new Response(reportCsv(r), {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="pontaj_${from}_${to}.csv"`
		}
	});
};

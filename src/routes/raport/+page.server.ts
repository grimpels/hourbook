import type { PageServerLoad } from './$types';
import { listClients, listProjects } from '$lib/server/entries';
import { buildReport } from '$lib/server/report';
import { listTemplates } from '$lib/server/templates';
import { smtpConfigured } from '$lib/server/settings';
import { startOfMonth, toISODay } from '$lib/time';

export const load: PageServerLoad = async ({ locals, url }) => {
	const today = toISODay(new Date());
	const from = url.searchParams.get('from') ?? startOfMonth(today);
	const to = url.searchParams.get('to') ?? today;
	const client = url.searchParams.get('client') ?? '';
	const project = url.searchParams.get('project') ?? '';

	// Previzualizare de sablon: se randeaza pe datele reale, dar nu se salveaza
	// nimic si documentul clientului ramane neatins.
	const templateId = Number(url.searchParams.get('sablon')) || 0;
	const template = templateId
		? listTemplates(locals.user!.id).find((t) => t.id === templateId)
		: undefined;

	const report = buildReport({
		userId: locals.user!.id,
		username: locals.user!.username,
		from,
		to,
		client: client || undefined,
		project: project || undefined,
		prefs: locals.prefs,
		overrideBody: template?.body
	});

	return {
		from, to, client, project,
		preview: template ? { id: template.id, name: template.name } : null,
		entries: report.entries,
		body: report.body,
		header: report.header,
		footer: report.footer,
		email: report.email,
		clients: listClients(locals.user!.id),
		projects: listProjects(locals.user!.id),
		smtpReady: smtpConfigured(),
		user: locals.user
	};
};

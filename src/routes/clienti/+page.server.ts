import type { PageServerLoad } from './$types';
import { listClients, listProjects } from '$lib/server/entries';
import { listTemplates } from '$lib/server/templates';

export const load: PageServerLoad = async ({ locals }) => ({
	clients: listClients(locals.user!.id),
	projects: listProjects(locals.user!.id),
	templates: listTemplates(locals.user!.id),
	user: locals.user
});

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getEntry, updateEntry, deleteEntry, pruneOrphans } from '$lib/server/entries';
import { parseBody, resolveRefs } from '$lib/server/entryInput';
import { translate } from '$lib/i18n';

export const PUT: RequestHandler = async ({ locals, request, params }) => {
	const id = Number(params.id);
	if (!getEntry(locals.user!.id, id)) throw error(404, translate(locals.prefs.lang, 'err.entryNotFound'));
	const b = parseBody(await request.json(), locals.prefs.lang);
	const { clientId, projectId } = resolveRefs(locals.user!.id, b);
	updateEntry(locals.user!.id, id, {
		day: b.day,
		start_min: b.start,
		end_min: b.end,
		description: (b.description ?? '').trim(),
		client_id: clientId,
		project_id: projectId
	});
	pruneOrphans(locals.user!.id);
	return json(getEntry(locals.user!.id, id));
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	deleteEntry(locals.user!.id, Number(params.id));
	pruneOrphans(locals.user!.id);
	return new Response(null, { status: 204 });
};

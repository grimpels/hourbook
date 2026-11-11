import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listTemplates, saveTemplate, deleteTemplate } from '$lib/server/templates';
import { sanitizeHtml } from '$lib/server/sanitize';
import { translate } from '$lib/i18n';

export const GET: RequestHandler = async ({ locals }) => json(listTemplates(locals.user!.id));

export const POST: RequestHandler = async ({ locals, request }) => {
	const b = (await request.json()) as { id?: number; name?: string; body?: string };
	const name = (b.name ?? '').trim();
	if (!name) throw error(400, translate(locals.prefs.lang, 'err.templateName'));
	if (name.length > 80) throw error(400, translate(locals.prefs.lang, 'err.nameTooLong'));
	// Corpul trece prin aceeasi curatare ca documentele: un sablon ajunge oricum
	// copiat intr-un document.
	saveTemplate(locals.user!.id, name, sanitizeHtml(b.body ?? ''), b.id);
	return json(listTemplates(locals.user!.id));
};

export const DELETE: RequestHandler = async ({ locals, request }) => {
	const b = (await request.json()) as { id?: number };
	if (!Number.isInteger(b.id)) throw error(400, translate(locals.prefs.lang, 'err.invalidId'));
	deleteTemplate(locals.user!.id, b.id!);
	return json(listTemplates(locals.user!.id));
};

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	listClients,
	listProjects,
	setClientColor,
	setProjectColor,
	setClientDoc,
	setProjectDoc
} from '$lib/server/entries';
import { isColorKey } from '$lib/colors';
import { sanitizeHtml } from '$lib/server/sanitize';
import { translate, type Key } from '$lib/i18n';

// Sursa pentru cautarea activa din formular.
export const GET: RequestHandler = async ({ locals }) =>
	json({
		clients: listClients(locals.user!.id),
		projects: listProjects(locals.user!.id)
	});

type PatchBody = {
	kind?: string;
	id?: number;
	color?: string | null;
	doc?: { body?: string; header?: string; footer?: string; email?: string };
};

// Schimbarea culorii unei etichete sau a documentului unui client.
export const PATCH: RequestHandler = async ({ locals, request }) => {
	const t = (k: Key) => translate(locals.prefs.lang, k);
	const body = (await request.json()) as PatchBody;
	if (!Number.isInteger(body.id)) throw error(400, t('err.invalidId'));
	const uid = locals.user!.id;

	if (body.doc) {
		if (body.kind !== 'client' && body.kind !== 'project') throw error(400, t('err.docTarget'));
		const email = (body.doc.email ?? '').trim();
		if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw error(400, t('err.invalidEmail'));
		const doc = {
			// Curatarea se face pe SERVER, nu in editor: interfata poate fi ocolita.
			body: sanitizeHtml(body.doc.body ?? ''),
			header: sanitizeHtml(body.doc.header ?? ''),
			footer: sanitizeHtml(body.doc.footer ?? ''),
			email
		};
		if (body.kind === 'client') setClientDoc(uid, body.id!, doc);
		else setProjectDoc(uid, body.id!, doc);
	} else {
		const color = body.color == null || body.color === '' ? null : body.color;
		if (color !== null && !isColorKey(color)) throw error(400, t('err.unknownColor'));
		if (body.kind === 'client') setClientColor(uid, body.id!, color);
		else if (body.kind === 'project') setProjectColor(uid, body.id!, color);
		else throw error(400, t('err.unknownKind'));
	}

	return json({ clients: listClients(uid), projects: listProjects(uid) });
};

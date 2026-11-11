import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTimer, startTimer, updateTimer, clearTimer } from '$lib/server/timer';
import { translate } from '$lib/i18n';

type Body = { description?: string; client?: string; project?: string };

export const GET: RequestHandler = async ({ locals }) => json(getTimer(locals.user!.id));

export const POST: RequestHandler = async ({ locals, request }) => {
	const b = (await request.json().catch(() => ({}))) as Body;
	const t = startTimer(locals.user!.id, b);
	// 409, nu 400: cererea e corecta, dar starea nu permite — un cronometru merge deja.
	if (!t) throw error(409, translate(locals.prefs.lang, 'err.timerRunning'));
	return json(t, { status: 201 });
};

export const PATCH: RequestHandler = async ({ locals, request }) => {
	const t = updateTimer(locals.user!.id, (await request.json()) as Body);
	if (!t) throw error(404, translate(locals.prefs.lang, 'err.noTimer'));
	return json(t);
};

export const DELETE: RequestHandler = async ({ locals }) => {
	clearTimer(locals.user!.id);
	return new Response(null, { status: 204 });
};

import { error } from '@sveltejs/kit';
import { findOrCreateClient, findOrCreateProject } from './entries';
import { translate } from '$lib/i18n';
import type { Locale } from '$lib/prefs';

// Corpul acceptat de POST/PUT: clientul si proiectul vin ca NUME, nu ca id.
// Asa formularul poate crea entitati noi fara un pas separat, iar potrivirea cu
// cele existente se face pe server, unde e si constrangerea de unicitate.
export type EntryBody = {
	day: string;
	start: number;
	end: number;
	description?: string;
	client?: string;
	project?: string;
};

export function parseBody(b: unknown, lang: Locale): EntryBody {
	const o = b as EntryBody;
	if (!o || typeof o.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.day))
		throw error(400, translate(lang, 'err.invalidDay'));
	if (!Number.isInteger(o.start) || !Number.isInteger(o.end))
		throw error(400, translate(lang, 'err.invalidTimes'));
	if (o.end <= o.start) throw error(400, translate(lang, 'err.endBeforeStart'));
	if (o.end - o.start > 24 * 60) throw error(400, translate(lang, 'err.over24h'));
	return o;
}

export function resolveRefs(userId: number, b: EntryBody) {
	const clientId = b.client ? findOrCreateClient(userId, b.client) : null;
	const projectId = b.project ? findOrCreateProject(userId, b.project, clientId) : null;
	return { clientId, projectId };
}

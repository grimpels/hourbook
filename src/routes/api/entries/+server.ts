import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listEntries, createEntry, pruneOrphans } from '$lib/server/entries';
import { parseBody, resolveRefs } from '$lib/server/entryInput';
import { clearTimer } from '$lib/server/timer';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals, url }) => {
	const from = url.searchParams.get('from') ?? '0000-01-01';
	const to = url.searchParams.get('to') ?? '9999-12-31';
	return json(listEntries(locals.user!.id, from, to));
};

export const POST: RequestHandler = async ({ locals, request }) => {
	const raw = (await request.json()) as { opresteCronometrul?: boolean };
	const b = parseBody(raw, locals.prefs.lang);
	const uid = locals.user!.id;

	// Cand intrarea vine din cronometru, crearea ei si oprirea cronometrului se
	// fac in aceeasi tranzactie: altfel o eroare intre ele ar lasa cronometrul
	// pornit dupa ce intrarea a fost deja salvata, iar a doua oprire ar dubla-o.
	db.exec('BEGIN');
	try {
		const { clientId, projectId } = resolveRefs(uid, b);
		const id = createEntry(uid, {
			day: b.day,
			start_min: b.start,
			end_min: b.end,
			description: (b.description ?? '').trim(),
			client_id: clientId,
			project_id: projectId
		});
		if (raw.opresteCronometrul) clearTimer(uid);
		pruneOrphans(uid);
		db.exec('COMMIT');
		return json({ id }, { status: 201 });
	} catch (e) {
		db.exec('ROLLBACK');
		throw e;
	}
};

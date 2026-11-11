import { db } from './db';

export type Timer = {
	started_at: number;
	description: string;
	client: string;
	project: string;
};

export function getTimer(userId: number): Timer | null {
	return (
		(db
			.prepare('SELECT started_at, description, client, project FROM running_timers WHERE user_id = ?')
			.get(userId) as Timer | undefined) ?? null
	);
}

/** Porneste un cronometru. Intoarce null daca unul merge deja — nu se suprascrie pe tacute. */
export function startTimer(
	userId: number,
	t: { description?: string; client?: string; project?: string }
): Timer | null {
	if (getTimer(userId)) return null;
	db.prepare(
		'INSERT INTO running_timers (user_id, started_at, description, client, project) VALUES (?, ?, ?, ?, ?)'
	).run(userId, Date.now(), (t.description ?? '').trim(), (t.client ?? '').trim(), (t.project ?? '').trim());
	return getTimer(userId);
}

export function updateTimer(
	userId: number,
	t: { description?: string; client?: string; project?: string }
) {
	const cur = getTimer(userId);
	if (!cur) return null;
	db.prepare(
		'UPDATE running_timers SET description = ?, client = ?, project = ? WHERE user_id = ?'
	).run(
		(t.description ?? cur.description).trim(),
		(t.client ?? cur.client).trim(),
		(t.project ?? cur.project).trim(),
		userId
	);
	return getTimer(userId);
}

export function clearTimer(userId: number) {
	db.prepare('DELETE FROM running_timers WHERE user_id = ?').run(userId);
}

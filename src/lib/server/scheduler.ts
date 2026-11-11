import { db } from './db';
import { getSchedule, setSetting, smtpConfigured } from './settings';
import { clientsWithEmail } from './entries';
import { sendReport } from './mailer';
import { toISODay } from '$lib/time';
import { previousPeriod } from '$lib/period';
import { getPrefs } from './prefs';

// Planificator simplu: un tic din minut in minut, care compara ora curenta cu
// programarea. Nu e nevoie de cron sau de un container in plus, iar starea
// (`lastRun`) sta in baza de date, deci o repornire nu duce la trimitere dubla
// si nici la sarirea unei perioade.

const TICK_MS = 60_000;
let timer: ReturnType<typeof setInterval> | null = null;

function isDue(now: Date, s: ReturnType<typeof getSchedule>): boolean {
	if (!s.enabled) return false;
	if (now.getHours() !== s.hour) return false;
	if (s.frequency === 'saptamanal') {
		const dow = now.getDay() === 0 ? 7 : now.getDay(); // 1 = luni
		if (dow !== s.day) return false;
	} else if (now.getDate() !== s.day) return false;

	// O singura data pe zi, chiar daca ticul trece de mai multe ori prin ora tinta.
	return s.lastRun !== toISODay(now);
}

export async function runScheduled(now = new Date()): Promise<number> {
	const s = getSchedule();
	if (!isDue(now, s)) return 0;
	if (!smtpConfigured()) {
		console.warn('[pontaj] scheduled report skipped: SMTP is not configured');
		return 0;
	}

	// Marcarea se face INAINTE de trimitere: daca un email esueaza, nu vrem ca
	// ticul urmator sa reia toata lista si sa trimita de doua ori celor carora
	// le-a plecat deja. Esecurile raman vizibile in istoric.
	setSetting('schedule', { ...s, lastRun: toISODay(now) });

	const user = db.prepare('SELECT id, username FROM users ORDER BY id LIMIT 1').get() as
		| { id: number; username: string }
		| undefined;
	if (!user) return 0;
	// Raportul pleaca in limba si formatele utilizatorului, iar „saptamana
	// incheiata" incepe in ziua pe care a ales-o el.
	const prefs = getPrefs(user.id);
	const { from, to } = previousPeriod(s.frequency, now, prefs.weekStart);

	let sent = 0;
	for (const c of clientsWithEmail(user.id)) {
		const res = await sendReport({
			userId: user.id,
			username: user.username,
			from,
			to,
			client: c.name,
			recipient: c.doc_email!,
			kind: 'programat',
			prefs
		});
		if (res.ok) sent++;
		console.log(
			`[pontaj] scheduled report ${c.name} -> ${c.doc_email} ${res.ok ? 'sent' : 'FAILED: ' + res.detail}`
		);
	}
	return sent;
}

export function startScheduler() {
	if (timer) return;
	timer = setInterval(() => {
		runScheduled().catch((e) => console.error('[pontaj] scheduler:', e));
	}, TICK_MS);
	// `unref` ca ticul sa nu tina procesul in viata la oprire.
	timer.unref?.();
}

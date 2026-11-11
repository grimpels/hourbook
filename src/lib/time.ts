// Conversii intre minutele stocate in DB si textul din interfata.
export function minToHHMM(min: number): string {
	const m = ((min % 1440) + 1440) % 1440;
	return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}

export function hhmmToMin(s: string): number | null {
	const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
	if (!m) return null;
	const h = Number(m[1]);
	const min = Number(m[2]);
	if (h > 23 || min > 59) return null;
	return h * 60 + min;
}

// Durata formatata scurt: 1h 45m, 45m, 2h
export function durationLabel(min: number): string {
	const h = Math.floor(min / 60);
	const m = min % 60;
	if (h && m) return `${h}h ${m}m`;
	if (h) return `${h}h`;
	return `${m}m`;
}

export function toISODay(d: Date): string {
	return (
		d.getFullYear() +
		'-' +
		String(d.getMonth() + 1).padStart(2, '0') +
		'-' +
		String(d.getDate()).padStart(2, '0')
	);
}

export function addDays(day: string, n: number): string {
	const [y, m, d] = day.split('-').map(Number);
	const dt = new Date(y, m - 1, d + n);
	return toISODay(dt);
}

/** Inceputul saptamanii: `weekStart` 1 = luni (implicit), 0 = duminica. */
export function startOfWeek(day: string, weekStart: 0 | 1 = 1): string {
	const [y, m, d] = day.split('-').map(Number);
	const dt = new Date(y, m - 1, d);
	const shift = (dt.getDay() - weekStart + 7) % 7;
	return addDays(day, -shift);
}

export function startOfMonth(day: string): string {
	return day.slice(0, 8) + '01';
}

// Afisarea datelor si a orelor, dupa preferintele utilizatorului, sta in `format.ts`.

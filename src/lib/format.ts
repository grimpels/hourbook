// Formatarea datelor, orelor si cifrelor dupa preferintele utilizatorului.
// Pura: aceeasi pe server (rapoarte, email, CSV) si in browser.
import type { Prefs, Locale } from './prefs.ts';

const pad = (n: number) => String(n).padStart(2, '0');

/** YYYY-MM-DD -> 31.01.2026 / 31/01/2026 / 01/31/2026 / 2026-01-31 */
export function formatDay(iso: string, p: Prefs): string {
	const [y, m, d] = iso.split('-');
	switch (p.dateFormat) {
		case 'dmy/':
			return `${d}/${m}/${y}`;
		case 'mdy':
			return `${m}/${d}/${y}`;
		case 'iso':
			return iso;
		default:
			return `${d}.${m}.${y}`;
	}
}

/** Intervalul intreg, pentru documente si email: „01.09.2026 – 30.09.2026". */
export function formatPeriod(from: string, to: string, p: Prefs): string {
	return `${formatDay(from, p)} – ${formatDay(to, p)}`;
}

/**
 * Interval scurt, pentru titluri: partea comuna se scrie o singura data —
 * „07 – 13.09.2026" in aceeasi luna, „28.09 – 04.10.2026" in acelasi an.
 * Asa incape si pe un ecran de telefon.
 */
export function formatRange(from: string, to: string, p: Prefs): string {
	if (from === to) return formatDay(from, p);
	const [fy, fm, fd] = from.split('-');
	const [ty, tm, td] = to.split('-');
	if (fy !== ty) return formatPeriod(from, to, p);
	switch (p.dateFormat) {
		case 'mdy':
			return `${fm}/${fd} – ${tm}/${td}/${ty}`;
		case 'iso':
			return `${from} – ${tm}-${td}`;
		default: {
			const s = p.dateFormat === 'dmy/' ? '/' : '.';
			return fm === tm ? `${fd} – ${td}${s}${tm}${s}${ty}` : `${fd}${s}${fm} – ${td}${s}${tm}${s}${ty}`;
		}
	}
}

/** Minute de la miezul noptii -> 14:05 sau 2:05 PM. Peste 24h se ia restul. */
export function formatTime(min: number, p: Prefs): string {
	const m = ((min % 1440) + 1440) % 1440;
	const h = Math.floor(m / 60);
	if (!p.hour12) return `${pad(h)}:${pad(m % 60)}`;
	return `${h % 12 || 12}:${pad(m % 60)} ${h < 12 ? 'AM' : 'PM'}`;
}

export function formatSpan(start: number, end: number, p: Prefs): string {
	return `${formatTime(start, p)} – ${formatTime(end, p)}`;
}

/** Ora fixa din grila calendarului: 06:00 sau 6 AM — coloana e ingusta. */
export function formatHour(h: number, p: Prefs): string {
	if (!p.hour12) return `${pad(h)}:00`;
	return `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Ore zecimale cu separatorul ales: 1,75 sau 1.75. */
export function formatDecimal(min: number, p: Prefs): string {
	const v = (min / 60).toFixed(2);
	return p.decimal === ',' ? v.replace('.', ',') : v;
}

/** In CSV, virgula zecimala cere `;` intre campuri — asa il citeste Excel-ul european. */
export function csvSeparator(p: Prefs): string {
	return p.decimal === ',' ? ';' : ',';
}

const DAYS: Record<Locale, string[]> = {
	ro: ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du'],
	en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
};

const MONTHS: Record<Locale, string[]> = {
	ro: [
		'ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
		'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'
	],
	en: [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	]
};

/** Capetele de coloana ale calendarului, in ordinea saptamanii alese. */
export function dayNames(p: Prefs): string[] {
	const d = DAYS[p.lang];
	return p.weekStart === 0 ? [d[6], ...d.slice(0, 6)] : d;
}

/** „septembrie 2026" / „September 2026"; `month` e 1-12. */
export function monthTitle(year: number, month: number, p: Prefs): string {
	return `${MONTHS[p.lang][month - 1]} ${year}`;
}

// Citirea inapoi a ce scrie utilizatorul in campurile de data si ora. Campurile
// native `date`/`time` se afiseaza dupa limba browserului, nu dupa preferinte,
// de aceea formularul foloseste text si le interpreteaza aici.

/** Sablonul afisat in campul gol: „ZZ.LL.AAAA" / „DD/MM/YYYY"... */
export function dayPattern(p: Prefs): string {
	const [d, m, y] = p.lang === 'ro' ? ['ZZ', 'LL', 'AAAA'] : ['DD', 'MM', 'YYYY'];
	switch (p.dateFormat) {
		case 'dmy/':
			return `${d}/${m}/${y}`;
		case 'mdy':
			return `${m}/${d}/${y}`;
		case 'iso':
			return `${y}-${m}-${d}`;
		default:
			return `${d}.${m}.${y}`;
	}
}

/**
 * Text -> YYYY-MM-DD, in ordinea formatului ales; orice separator e acceptat.
 * Fara an („31.01") se ia anul din `ref`; anul pe doua cifre inseamna 20xx.
 */
export function parseDay(text: string, p: Prefs, ref: string): string | null {
	const parts = text.trim().split(/[^0-9]+/).filter(Boolean).map(Number);
	if (parts.length < 2 || parts.length > 3) return null;
	let y: number, m: number, d: number;
	if (p.dateFormat === 'iso') {
		if (parts.length === 2) [m, d] = parts, (y = Number(ref.slice(0, 4)));
		else [y, m, d] = parts;
	} else {
		[d, m] = p.dateFormat === 'mdy' ? [parts[1], parts[0]] : [parts[0], parts[1]];
		y = parts.length === 3 ? parts[2] : Number(ref.slice(0, 4));
	}
	if (y < 100) y += 2000;
	const dt = new Date(y, m - 1, d);
	if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
	return `${y}-${pad(m)}-${pad(d)}`;
}

/**
 * Text -> minute de la miezul noptii. Accepta „14:05", „14.05", „1405", „9"
 * si, oricare ar fi ceasul ales, „2:05 PM" / „2p".
 */
export function parseTime(text: string): number | null {
	const s = text.trim().toLowerCase().replace(/\s+/g, '');
	const m = /^(\d{1,4})(?:[:.](\d{1,2}))?(am|pm|a|p)?$/.exec(s);
	if (!m) return null;
	let h: number, min: number;
	if (m[2] !== undefined) {
		if (m[1].length > 2) return null;
		[h, min] = [Number(m[1]), Number(m[2])];
	} else if (m[1].length <= 2) {
		[h, min] = [Number(m[1]), 0];
	} else {
		[h, min] = [Number(m[1].slice(0, -2)), Number(m[1].slice(-2))];
	}
	if (m[3]) {
		if (h < 1 || h > 12) return null;
		h = (h % 12) + (m[3].startsWith('p') ? 12 : 0);
	}
	if (h > 23 || min > 59) return null;
	return h * 60 + min;
}

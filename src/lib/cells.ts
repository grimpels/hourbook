// Valoarea unei celule de raport, aceeasi in pagina, la tiparire si in email.
import type { ColumnKey } from './docbody.ts';
import type { Prefs } from './prefs.ts';
import { formatDay, formatSpan, formatDecimal } from './format.ts';
import { durationLabel } from './time.ts';

type Row = {
	day: string;
	start_min: number;
	end_min: number;
	description: string;
	client_name: string | null;
	project_name: string | null;
};

export const NUMERIC_COLUMNS: ColumnKey[] = ['ore', 'durata'];

export function cellValue(c: ColumnKey, e: Row, p: Prefs): string {
	switch (c) {
		case 'data':
			return formatDay(e.day, p);
		case 'interval':
			return formatSpan(e.start_min, e.end_min, p);
		case 'ore':
			return formatDecimal(e.end_min - e.start_min, p);
		case 'durata':
			return durationLabel(e.end_min - e.start_min);
		case 'activitate':
			return e.description || '—';
		case 'client':
			return e.client_name ?? '';
		case 'proiect':
			return e.project_name ?? '';
	}
}

/** Totalul se scrie in formatul coloanei sub care sta. */
export function totalValue(c: ColumnKey, total: number, p: Prefs): string {
	return c === 'durata' ? durationLabel(total) : formatDecimal(total, p);
}

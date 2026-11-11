// Variabilele din documente. Cheia canonica e cea romaneasca — asa sunt scrise
// documentele existente — iar fiecare are si un nume englezesc, acceptat la fel.
// Legenda si editorul arata numele din limba utilizatorului.
import type { Locale } from './prefs.ts';

export const PLACEHOLDERS = [
	{ key: 'client', en: 'client' },
	{ key: 'proiect', en: 'project' },
	{ key: 'perioada', en: 'period' },
	{ key: 'total_ore', en: 'total_hours' },
	{ key: 'total_zecimal', en: 'total_decimal' },
	{ key: 'numar_intrari', en: 'entry_count' },
	{ key: 'intervale', en: 'intervals' },
	{ key: 'data', en: 'date' },
	{ key: 'utilizator', en: 'user' },
	{ key: 'firma', en: 'company' },
	{ key: 'reprezentant', en: 'representative' },
	{ key: 'cui', en: 'tax_id' },
	{ key: 'adresa', en: 'address' }
] as const;

export type PlaceholderKey = (typeof PLACEHOLDERS)[number]['key'];

/** Cum se scrie variabila in limba data, fara acolade: `proiect` / `project`. */
export function placeholderToken(key: PlaceholderKey, lang: Locale): string {
	const p = PLACEHOLDERS.find((x) => x.key === key);
	return lang === 'en' && p ? p.en : key;
}

/** Aceleasi valori si sub numele englezesti, ca substitutia sa le prinda pe amandoua. */
export function withAliases(values: Record<string, string>): Record<string, string> {
	const out = { ...values };
	for (const p of PLACEHOLDERS) if (p.key in values) out[p.en] = values[p.key];
	return out;
}

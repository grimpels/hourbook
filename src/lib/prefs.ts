// Preferintele de limba si format ale unui utilizator. Pur, fara acces la baza
// de date, ca sa poata fi folosit si in browser si verificat separat.

export type Locale = 'ro' | 'en';
export const LOCALES: Locale[] = ['ro', 'en'];

/** `dmy.` 31.01.2026 · `dmy/` 31/01/2026 · `mdy` 01/31/2026 · `iso` 2026-01-31 */
export type DateFormat = 'dmy.' | 'dmy/' | 'mdy' | 'iso';
export const DATE_FORMATS: DateFormat[] = ['dmy.', 'dmy/', 'mdy', 'iso'];

export type Prefs = {
	lang: Locale;
	dateFormat: DateFormat;
	hour12: boolean;
	/** 1 = luni, 0 = duminica. */
	weekStart: 0 | 1;
	decimal: ',' | '.';
};

// Valorile implicite urmeaza conventiile limbii. Se aplica doar cand utilizatorul
// n-a ales nimic; o preferinta salvata nu se schimba odata cu limba.
export const DEFAULT_PREFS: Record<Locale, Prefs> = {
	ro: { lang: 'ro', dateFormat: 'dmy.', hour12: false, weekStart: 1, decimal: ',' },
	en: { lang: 'en', dateFormat: 'mdy', hour12: true, weekStart: 0, decimal: '.' }
};

export function isLocale(v: unknown): v is Locale {
	return v === 'ro' || v === 'en';
}

/** Orice intrare (JSON din baza, formular) devine un set complet si valid. */
export function normalizePrefs(raw: unknown, fallback: Locale): Prefs {
	const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
	const lang = isLocale(o.lang) ? o.lang : fallback;
	const d = DEFAULT_PREFS[lang];
	return {
		lang,
		dateFormat: DATE_FORMATS.includes(o.dateFormat as DateFormat)
			? (o.dateFormat as DateFormat)
			: d.dateFormat,
		hour12: typeof o.hour12 === 'boolean' ? o.hour12 : d.hour12,
		weekStart: o.weekStart === 0 || o.weekStart === 1 ? o.weekStart : d.weekStart,
		decimal: o.decimal === ',' || o.decimal === '.' ? o.decimal : d.decimal
	};
}

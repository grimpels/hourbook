// Corpul documentului: HTML scris de utilizator, in care tabelul raportului se
// pune unde vrea, printr-un semn `{raport}`.
//
// Sintaxa e `{raport}` sau `{raport: coloane}`, nu `$raport[...]`, ca sa fie
// aceeasi cu restul substitutiilor ({client}, {perioada}...). Un singur fel de
// paranteze inseamna o singura regula de tinut minte.

// Fiecare coloana are si un nume englezesc, acceptat la fel: `{report: date, hours}`
// e acelasi tabel ca `{raport: data, ore}`.
export const COLUMNS = [
	{ key: 'data', en: 'date' },
	{ key: 'interval', en: 'interval' },
	{ key: 'ore', en: 'hours' },
	{ key: 'durata', en: 'duration' },
	{ key: 'activitate', en: 'activity' },
	{ key: 'client', en: 'client' },
	{ key: 'proiect', en: 'project' }
] as const;

export type ColumnKey = (typeof COLUMNS)[number]['key'];

export const DEFAULT_COLUMNS: ColumnKey[] = ['data', 'interval', 'ore', 'activitate'];

const ALIAS = new Map<string, ColumnKey>(
	COLUMNS.flatMap((c) => [[c.key, c.key] as const, [c.en, c.key] as const])
);

/** Cum se scrie coloana in limba data: `ore` / `hours`. */
export function columnToken(key: ColumnKey, lang: string): string {
	return lang === 'en' ? (COLUMNS.find((c) => c.key === key)?.en ?? key) : key;
}

/** `{raport}` / `{report}`, cu sau fara coloane. Tolereaza spatii si majuscule. */
const RAPORT_RE = /\{\s*(?:raport|report)\s*(?::([^}]*))?\}/gi;

export function parseColumns(spec: string | undefined): {
	columns: ColumnKey[];
	unknown: string[];
} {
	if (!spec || !spec.trim()) return { columns: DEFAULT_COLUMNS, unknown: [] };
	const asked = spec
		.split(',')
		.map((c) => c.trim().toLowerCase())
		.filter(Boolean);
	const columns = asked.flatMap((c) => (ALIAS.has(c) ? [ALIAS.get(c)!] : []));
	const unknown = asked.filter((c) => !ALIAS.has(c));
	// Daca nimic nu s-a potrivit, tabelul tot trebuie sa aiba coloane.
	return { columns: columns.length ? columns : DEFAULT_COLUMNS, unknown };
}

export function hasRaport(body: string): boolean {
	RAPORT_RE.lastIndex = 0;
	return RAPORT_RE.test(body);
}

/**
 * Inlocuieste fiecare `{raport}` cu tabelul generat de `render`, care primeste
 * coloanele cerute. Doua `{raport}` cu coloane diferite in acelasi document
 * sunt permise — un rezumat scurt sus si detaliul jos e un caz real.
 */
export function replaceRaport(
	body: string,
	render: (columns: ColumnKey[]) => string
): { html: string; unknown: string[] } {
	const unknown: string[] = [];
	const html = body.replace(RAPORT_RE, (_full, spec) => {
		const parsed = parseColumns(spec);
		unknown.push(...parsed.unknown);
		return render(parsed.columns);
	});
	return { html, unknown: [...new Set(unknown)] };
}

/**
 * Documentul efectiv, pentru compatibilitate cu antetul/subsolul de dinainte:
 * daca nu exista corp, se compune din antet + tabel + subsol. Asa documentele
 * scrise inainte de sabloane continua sa arate identic, fara sa fie rescrise.
 */
export function effectiveBody(
	body: string | null | undefined,
	header: string | null | undefined,
	footer: string | null | undefined
): string {
	if (body && body.trim()) return body;
	const h = header?.trim() ?? '';
	const f = footer?.trim() ?? '';
	if (!h && !f) return '';
	return `${h}\n{raport}\n${f}`;
}

/**
 * Scoate blocurile ramase complet goale dupa substitutii — de exemplu linia
 * `{cui}<br>{adresa}` cand niciunul nu e completat. Un `&nbsp;` scris intentionat
 * pentru spatiere NU e gol, deci ramane: se sterge doar ce nu contine nimic.
 */
export function dropEmptyBlocks(html: string): string {
	let out = html;
	for (let i = 0; i < 3; i++) {
		const next = out.replace(
			/<(p|div|span)\b[^>]*>(?:\s|<br\s*\/?>)*<\/\1>/gi,
			(full) => (/class="[^"]*(spatiu|pagina-noua|linie-semnatura)/i.test(full) ? full : '')
		);
		if (next === out) break;
		out = next;
	}
	return out;
}

import { listEntries, getClientByName, getProjectByName, type Entry } from './entries';
import { fillPlaceholders } from './sanitize';
import { effectiveBody, replaceRaport, dropEmptyBlocks, type ColumnKey } from '$lib/docbody';
import { inlineDocStyles } from '$lib/docstyles';
import { getProvider } from './settings';
import { durationLabel, toISODay } from '$lib/time';
import { formatDay, formatPeriod, formatTime, formatDecimal, csvSeparator } from '$lib/format';
import { cellValue, totalValue, NUMERIC_COLUMNS } from '$lib/cells';
import { translate, plural, type Key } from '$lib/i18n';
import { withAliases } from '$lib/placeholders';
import type { Prefs } from '$lib/prefs';

export type ReportInput = {
	userId: number;
	username: string;
	from: string;
	to: string;
	client?: string;
	project?: string;
	/** Limba si formatele in care se scrie raportul. */
	prefs: Prefs;
	/** Corp impus, pentru previzualizarea unui sablon fara sa fie salvat nicaieri. */
	overrideBody?: string;
};

export type Report = {
	entries: Entry[];
	total: number;
	/** Corpul documentului, cu substitutiile facute dar cu `{raport}` inca la locul lui. */
	body: string;
	header: string;
	footer: string;
	email: string | null;
	from: string;
	to: string;
	client: string | null;
	project: string | null;
	prefs: Prefs;
};

/**
 * Sursa unica pentru raport: pagina si emailul trebuie sa arate acelasi lucru.
 * Antetul si subsolul se iau de la client si li se aplica substitutiile aici,
 * o singura data, ca sa nu existe doua implementari care pot devia.
 */
export function buildReport(i: ReportInput): Report {
	let entries = listEntries(i.userId, i.from, i.to);
	if (i.client) entries = entries.filter((e) => e.client_name === i.client);
	if (i.project) entries = entries.filter((e) => e.project_name === i.project);

	const total = entries.reduce((s, e) => s + (e.end_min - e.start_min), 0);

	// Antetul are sens doar pentru un raport pe o singura entitate: un proces
	// verbal se incheie cu cineva anume.
	//
	// Proiectul bate clientul, dar CAMP CU CAMP, nu bloc cu bloc: un proiect
	// poate schimba doar subsolul (alte semnaturi) si sa mosteneasca antetul
	// clientului. Aceeasi regula ca la culori, aplicata mai fin.
	const c = i.client ? getClientByName(i.userId, i.client) : undefined;
	const pr = i.project ? getProjectByName(i.userId, i.project, i.client) : undefined;

	const rawHeader = pr?.doc_header ?? c?.doc_header ?? '';
	const rawFooter = pr?.doc_footer ?? c?.doc_footer ?? '';
	const email = pr?.doc_email ?? c?.doc_email ?? null;

	const p = getProvider();
	// Cheile canonice sunt cele romanesti; `withAliases` le adauga si numele
	// englezesti ({project}, {period}...), deci un document merge in orice limba.
	const values = withAliases({
		client: i.client ?? '',
		proiect: i.project ?? '',
		firma: p.firma,
		reprezentant: p.reprezentant,
		cui: p.cui,
		adresa: p.adresa,
		perioada: formatPeriod(i.from, i.to, i.prefs),
		total_ore: durationLabel(total),
		total_zecimal: formatDecimal(total, i.prefs),
		numar_intrari: String(entries.length),
		intervale: plural(i.prefs.lang, 'report.intervals', entries.length),
		// Ziua locala, nu cea UTC: dupa miezul noptii `toISOString` ar da ziua de ieri.
		data: formatDay(toISODay(new Date()), i.prefs),
		utilizator: i.username
	});

	// Corpul are prioritate; daca lipseste, se compune din antet + tabel + subsol,
	// ca documentele scrise inainte de sabloane sa arate la fel.
	const rawBody = i.overrideBody ?? effectiveBody(pr?.doc_body ?? c?.doc_body, rawHeader, rawFooter);

	return {
		entries,
		total,
		body: rawBody ? dropEmptyBlocks(fillPlaceholders(rawBody, values)) : '',
		header: rawHeader ? fillPlaceholders(rawHeader, values) : '',
		footer: rawFooter ? fillPlaceholders(rawFooter, values) : '',
		email,
		from: i.from,
		to: i.to,
		client: i.client ?? null,
		project: i.project ?? null,
		prefs: i.prefs
	};
}

/** Tabelul pentru email: stiluri inline, fiindca programele de email ignora CSS-ul extern. */
export function tableForEmail(r: Report, columns: ColumnKey[]): string {
	const t = (k: Key) => translate(r.prefs.lang, k);
	const td = 'padding:6px 8px;border-bottom:1px solid #e4e4e1';
	const rows = r.entries
		.map(
			(e) =>
				'<tr>' +
				columns
					.map(
						(c) =>
							`<td style="${td}${NUMERIC_COLUMNS.includes(c) ? ';text-align:right' : ''}${
								c === 'client' || c === 'proiect' ? ';color:#6b6b66' : ''
							}">${esc(cellValue(c, e, r.prefs))}</td>`
					)
					.join('') +
				'</tr>'
		)
		.join('');

	const totalIdx = columns.findIndex((c) => NUMERIC_COLUMNS.includes(c));
	const totalCells = columns
		.map((c, k) => {
			if (k === 0) return `<td style="padding:8px;font-weight:600">${t('common.total')}</td>`;
			if (k === totalIdx)
				return `<td style="padding:8px;text-align:right;font-weight:600">${totalValue(c, r.total, r.prefs)}</td>`;
			return '<td style="padding:8px"></td>';
		})
		.join('');

	// Capetele fara majuscule distantate, ca in pagina: linia de sub ele separa deja.
	return `<table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0">
		<thead><tr>${columns
			.map(
				(c) =>
					`<th style="padding:6px 8px;border-bottom:1px solid #1c1c1a;text-align:${
						NUMERIC_COLUMNS.includes(c) ? 'right' : 'left'
					};font-size:12px;font-weight:600;color:#6b6b66">${t(`col.${c}` as Key)}</th>`
			)
			.join('')}</tr></thead>
		<tbody>${
			rows ||
			`<tr><td colspan="${columns.length}" style="padding:20px;text-align:center;color:#6b6b66">${t('report.noEntries')}</td></tr>`
		}</tbody>
		<tfoot><tr>${totalCells}</tr></tfoot>
	</table>`;
}

/** Varianta HTML de sine statatoare, pentru email. */
export function reportHtml(r: Report): string {
	// In email, clasele nu ajuta: stilurile se scriu direct pe elemente.
	const inner = r.body
		? inlineDocStyles(replaceRaport(r.body, (cols) => tableForEmail(r, cols)).html)
		: `<h1 style="font-size:19px;margin:0 0 4px">${translate(r.prefs.lang, 'report.sheet')}</h1>
		   <p style="margin:0 0 18px;color:#6b6b66;font-size:13px">
		     ${formatPeriod(r.from, r.to, r.prefs)}${r.client ? ' · ' + esc(r.client) : ''}
		   </p>
		   ${tableForEmail(r, ['data', 'interval', 'ore', 'activitate', 'client'])}`;

	return `<!doctype html><html lang="${r.prefs.lang}"><body style="margin:0;padding:24px;background:#f6f6f5;
		font:15px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#1c1c1a">
		<div style="max-width:720px;margin:0 auto;background:#fff;border:1px solid #e4e4e1;
			border-radius:8px;padding:28px">${inner}</div>
	</body></html>`;
}

/**
 * CSV cu BOM, ca Excel sa recunoasca diacriticele. Separatorul de campuri
 * urmeaza separatorul zecimal: `;` langa virgula zecimala (Excel-ul european),
 * `,` langa punct — altfel orele s-ar rupe in doua coloane.
 */
export function reportCsv(r: Report): string {
	const p = r.prefs;
	const sep = csvSeparator(p);
	const t = (k: Key) => translate(p.lang, k);
	const cell = (v: string) =>
		v.includes(sep) || /["\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
	const head = ['csv.date', 'csv.start', 'csv.end', 'csv.hours', 'csv.activity', 'csv.client', 'csv.project'] as const;
	const lines = [head.map((k) => cell(t(k))).join(sep)];
	for (const e of r.entries) {
		lines.push(
			[
				formatDay(e.day, p),
				formatTime(e.start_min, p),
				formatTime(e.end_min, p),
				formatDecimal(e.end_min - e.start_min, p),
				e.description,
				e.client_name ?? '',
				e.project_name ?? ''
			]
				.map(cell)
				.join(sep)
		);
	}
	lines.push(['', '', t('csv.total'), formatDecimal(r.total, p), '', '', ''].map(cell).join(sep));
	return '\uFEFF' + lines.join('\r\n') + '\r\n';
}

function esc(v: string): string {
	return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

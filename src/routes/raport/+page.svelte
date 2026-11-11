<script lang="ts">
	import AppBar from '$lib/components/AppBar.svelte';
	import Rich from '$lib/components/Rich.svelte';
	import DayField from '$lib/components/DayField.svelte';
	import { goto } from '$app/navigation';
	import { replaceRaport, hasRaport, type ColumnKey } from '$lib/docbody';
	import { cellValue, totalValue, NUMERIC_COLUMNS } from '$lib/cells';
	import { useI18n } from '$lib/i18n/context';
	import { errorText } from '$lib/http';
	import type { Key } from '$lib/i18n';

	let { data } = $props();
	const i18n = useI18n();
	const { t } = i18n;

	// Campurile sunt editabile, deci sunt stare proprie — dar se resincronizeaza
	// cand se schimba URL-ul (navigare inapoi/inainte in browser).
	let from = $state(data.from);
	let to = $state(data.to);
	let client = $state(data.client);
	let project = $state(data.project);

	$effect(() => {
		from = data.from;
		to = data.to;
		client = data.client;
		project = data.project;
	});

	let query = $derived(
		new URLSearchParams({ from, to, ...(client && { client }), ...(project && { project }) }).toString()
	);

	let total = $derived(data.entries.reduce((s, e) => s + (e.end_min - e.start_min), 0));

	// Pe telefon filtrele ocupau jumatate de ecran inainte de raport. Se string
	// intr-un rezumat pe care il desfaci la nevoie; pe ecran lat raman deschise.
	let filtreDeschise = $state(false);
	let rezumatFiltre = $derived(
		[i18n.period(from, to), client || t('report.allClientsLower'), project || null]
			.filter(Boolean)
			.join(', ')
	);

	let sending = $state(false);
	let sendMsg = $state('');
	let recipient = $state('');
	let askSend = $state(false);

	$effect(() => {
		recipient = data.email ?? '';
	});

	async function send() {
		sending = true;
		sendMsg = '';
		const res = await fetch('/api/trimite', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ from, to, client, project, recipient })
		});
		sending = false;
		sendMsg = res.ok ? t('report.sent', { to: recipient }) : await errorText(res);
		if (res.ok) askSend = false;
	}

	// Grupare pe client si proiect — asa arata un timesheet de facturat.
	let groups = $derived.by(() => {
		const m = new Map<string, { min: number; count: number }>();
		for (const e of data.entries) {
			const k = [e.client_name ?? t('list.noClient'), e.project_name ?? t('list.noProject')].join(' — ');
			const g = m.get(k) ?? { min: 0, count: 0 };
			g.min += e.end_min - e.start_min;
			g.count++;
			m.set(k, g);
		}
		return [...m.entries()].sort((a, b) => b[1].min - a[1].min);
	});

	function apply() {
		goto(`/raport?${query}`, { keepFocus: true, noScroll: true });
	}

	function esc(v: string) {
		return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

	// Celulele vin din `$lib/cells`, aceeasi definitie ca in email.
	function tableHtml(columns: ColumnKey[]): string {
		const p = i18n.prefs;
		const rows = data.entries
			.map(
				(e) =>
					'<tr>' +
					columns
						.map((c) => `<td class="${NUMERIC_COLUMNS.includes(c) ? 'r ' : ''}${c}">${esc(cellValue(c, e, p))}</td>`)
						.join('') +
					'</tr>'
			)
			.join('');
		const totalIdx = columns.findIndex((c) => NUMERIC_COLUMNS.includes(c));
		const foot = columns
			.map((c, k) => {
				if (k === 0) return `<td>${esc(t('common.total'))}</td>`;
				if (k === totalIdx) return `<td class="r">${totalValue(c, total, p)}</td>`;
				return '<td></td>';
			})
			.join('');
		return `<table class="doctable">
			<thead><tr>${columns
				.map((c) => `<th class="${NUMERIC_COLUMNS.includes(c) ? 'r' : ''}">${esc(t(`col.${c}` as Key))}</th>`)
				.join('')}</tr></thead>
			<tbody>${
				rows ||
				`<tr><td colspan="${columns.length}" class="empty">${esc(t('report.noEntries'))}</td></tr>`
			}</tbody>
			<tfoot><tr>${foot}</tr></tfoot>
		</table>`;
	}

	// Corpul e HTML curatat pe server; tabelele se insereaza aici, la locul lor.
	let rendered = $derived.by(() =>
		data.body ? replaceRaport(data.body, (cols) => tableHtml(cols)) : null
	);

	let raportTok = $derived(i18n.prefs.lang === 'en' ? '{report}' : '{raport}');
</script>

<svelte:head><title>{t('nav.report')} · Pontaj</title></svelte:head>

<AppBar titlu={t('nav.report')}>
	{#snippet actiuni()}
		<a class="btn small" href="/api/export?{query}">{t('report.exportCsv')}</a>
		{#if data.smtpReady}
			<button class="btn small" onclick={() => (askSend = !askSend)}>{t('report.email')}</button>
		{/if}
		<button class="btn btn-primary small" onclick={() => window.print()}>{t('report.print')}</button>
	{/snippet}

	{#snippet subtitlu()}
		<button class="btn small filtre-buton" onclick={() => (filtreDeschise = !filtreDeschise)}>
			{filtreDeschise ? t('report.hideFilters') : rezumatFiltre}
		</button>
		<div class="filters" class:deschis={filtreDeschise}>
			<div><label for="f">{t('report.from')}</label><DayField id="f" bind:value={from} onchange={apply} /></div>
			<div><label for="t">{t('report.to')}</label><DayField id="t" bind:value={to} onchange={apply} /></div>
			<div>
				<label for="c">{t('col.client')}</label>
				<select id="c" bind:value={client} onchange={apply}>
					<option value="">{t('report.all')}</option>
					{#each data.clients as c}<option value={c.name}>{c.name}</option>{/each}
				</select>
			</div>
			<div>
				<label for="p">{t('col.proiect')}</label>
				<select id="p" bind:value={project} onchange={apply}>
					<option value="">{t('report.allF')}</option>
					{#each data.projects as p}<option value={p.name}>{p.name}</option>{/each}
				</select>
			</div>
		</div>
	{/snippet}
</AppBar>

{#if askSend}
	<div class="sendbar no-print">
		<label for="dest">{t('report.sendTo')}</label>
		<input id="dest" type="email" bind:value={recipient} placeholder="contact@client.ro" />
		<button class="btn btn-primary" onclick={send} disabled={sending || !recipient}>
			{sending ? t('report.sending') : t('report.send')}
		</button>
		<button class="btn btn-ghost" onclick={() => (askSend = false)}>{t('common.cancel')}</button>
		{#if !data.client}
			<p class="warn">{t('report.noClientWarn')}</p>
		{/if}
	</div>
{/if}

{#if sendMsg}
	<p class="sendmsg no-print">{sendMsg}</p>
{/if}

{#if data.preview}
	<div class="previzualizare no-print">
		<span><Rich text={t('report.preview')} marks={{ name: ['strong', data.preview.name] }} /></span>
		<a class="btn btn-ghost small" href="/sabloane">{t('report.backToTemplates')}</a>
	</div>
{/if}

<main class="container">
	<div class="sheet card">
	{#if rendered}
		{#if rendered.unknown.length}
			<p class="warn no-print">{t('report.unknownCols', { cols: rendered.unknown.join(', ') })}</p>
		{/if}
		{#if !hasRaport(data.body)}
			<p class="warn no-print">
				<Rich text={t('report.noTable')} marks={{ token: ['code', raportTok] }} />
			</p>
		{/if}
		<!-- Documentul clientului/proiectului, cu tabelul pus unde l-a cerut. -->
		<div class="docblock body">{@html rendered.html}</div>
	{:else}
		<div class="head">
			<h1>{t('report.sheet')}</h1>
			<div class="meta muted">
				<div>{i18n.period(from, to)}</div>
				{#if client}<div><Rich text={t('report.clientLabel')} marks={{ name: ['strong', client] }} /></div>{/if}
				{#if project}<div><Rich text={t('report.projectLabel')} marks={{ name: ['strong', project] }} /></div>{/if}
			</div>
		</div>

		<div class="scroll">
			<table>
				<thead>
					<tr><th>{t('col.data')}</th><th>{t('col.interval')}</th><th class="r">{t('col.ore')}</th>
						<th>{t('col.activitate')}</th><th>{t('report.clientProject')}</th></tr>
				</thead>
				<tbody>
					{#each data.entries as e (e.id)}
						<tr>
							<td class="tabular nowrap" data-l={t('col.data')}>{i18n.day(e.day)}</td>
							<td class="tabular nowrap" data-l={t('col.interval')}>{i18n.span(e.start_min, e.end_min)}</td>
							<td class="tabular r nowrap" data-l={t('col.ore')}>{i18n.dec(e.end_min - e.start_min)}</td>
							<td data-l={t('col.activitate')}>{e.description || '—'}</td>
							<td class="dim" data-l={t('report.clientProject')}>{[e.client_name, e.project_name].filter(Boolean).join(' — ')}</td>
						</tr>
					{:else}
						<tr><td colspan="5" class="empty muted">{t('report.noEntries')}</td></tr>
					{/each}
				</tbody>
				<tfoot>
					<tr><td colspan="2">{t('common.total')}</td><td class="tabular r">{i18n.dec(total)}</td>
						<td colspan="2" class="dim">{i18n.dur(total)}</td></tr>
				</tfoot>
			</table>
		</div>

		{#if groups.length > 1}
			<h2>{t('report.summary')}</h2>
			<div class="scroll"><table class="sum">
				<tbody>
					{#each groups as [k, g]}
						<tr><td>{k}</td><td class="dim tabular r">{i18n.tn('report.entries', g.count)}</td>
							<td class="tabular r">{i18n.dec(g.min)} h</td></tr>
					{/each}
				</tbody>
			</table></div>
		{/if}
	{/if}
	</div>
</main>

<style>
	.filters { display: flex; gap: 10px; flex-wrap: wrap; flex: 1; align-items: flex-end; }
	.filtre-buton { display: none; }
	.filters div { min-width: 130px; flex: 1; }
	.filters label { margin-bottom: 2px; }
	.sendbar {
		display: flex;
		gap: 8px;
		align-items: center;
		flex-wrap: wrap;
		padding: 12px 20px;
		background: var(--accent-soft);
		border-bottom: 1px solid var(--border);
	}
	.sendbar label { margin: 0; }
	.sendbar input { width: auto; flex: 1 1 220px; }
	.warn { width: 100%; margin: 0 0 10px; font-size: 13px; color: var(--text-dim); }
	.warn :global(code) { background: var(--surface-2); padding: 1px 5px; border-radius: 4px; }
	.sendmsg { margin: var(--s3) 0 0; font-size: var(--text-md); }
	.previzualizare {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
		padding: 10px 20px;
		background: var(--accent-soft);
		border-bottom: 1px solid var(--border);
		font-size: 13.5px;
	}
	.previzualizare .small { margin-left: auto; font-size: 12.5px; padding: 4px 9px; }
	/* --- Documentul -------------------------------------------------------
	   E o anexa la factura: se tipareste, se semneaza, se stampileaza si se
	   fotocopiaza. De aici doua decizii care se vad in tot ce urmeaza:
	   monocrom (un accent colorat devine gri indistinct la fotocopiere) si
	   aliniat la stanga (un act comercial nu e ceremonial). Cifrele sunt cu
	   `tabular-nums`, ca sa se citeasca pe coloana. */
	.docblock.body {
		font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
		font-size: 14.5px;
		line-height: 1.55;
		font-variant-numeric: tabular-nums;
		color: var(--text);
	}
	.docblock.body :global(p) { margin: 0 0 9px; }
	.docblock.body :global(strong) { font-weight: 600; }

	/* Antetul: numele firmei la stanga, tipul documentului la dreapta, despartite
	   de restul printr-o linie. Singura linie groasa din document. */
	/* Antetul e un tabel, nu flex: aceeasi asezare pe pagina, la tiparire si in
	   programele de email, care nu cunosc flex. */
	.docblock.body :global(table.doc-antet) {
		width: 100%;
		border-collapse: collapse;
		margin-bottom: 22px;
	}
	.docblock.body :global(table.doc-antet td) {
		padding: 0 16px 10px 0;
		border-bottom: 1.5px solid var(--text);
		vertical-align: bottom;
	}
	.docblock.body :global(table.doc-antet td:last-child) { padding-right: 0; }
	.docblock.body :global(.doc-firma) { font-size: 17px; font-weight: 600; letter-spacing: -0.01em; }
	.docblock.body :global(.doc-mic) { font-size: 12px; color: var(--text-dim); line-height: 1.45; }
	.docblock.body :global(.doc-eticheta) {
		font-size: 11.5px;
		color: var(--text-dim);
		display: block;
		margin-bottom: 1px;
	}
	.docblock.body :global(.doc-titlu) {
		font-size: 20px;
		font-weight: 600;
		letter-spacing: -0.015em;
		margin: 0 0 4px;
	}
	/* Singurul moment vizual: cate ore s-au lucrat. Restul documentului sta linistit. */
	.docblock.body :global(.doc-total) {
		font-size: 26px;
		font-weight: 600;
		letter-spacing: -0.02em;
		white-space: nowrap;
	}
	.docblock.body :global(.doc-nota) { font-size: 12.5px; color: var(--text-dim); margin-top: 14px; }
	.docblock.body :global(.linie-semnatura) {
		border-bottom: 1px solid var(--text);
		height: 20mm;
		margin-bottom: 5px;
	}
	.docblock.body :global(h1),
	.docblock.body :global(h2),
	.docblock.body :global(h3) { margin: 0 0 12px; font-weight: 600; }
	.docblock.body :global(h3) { font-size: 17px; }
	.docblock.body :global(.titlu) { text-align: center; }
	.docblock.body :global(.spatiu) { height: 26mm; }
	.docblock.body :global(.semnaturi) { margin-top: 20px; }
	.docblock.body :global(.pagina-noua) { height: 0; }
	/* Tabelele de asezare (doua coloane) raman invizibile. */
	.docblock.body :global(table:not(.doctable)) { width: 100%; border-collapse: collapse; }
	.docblock.body :global(table:not(.doctable) td) {
		border: 0;
		padding: 0 16px 0 0;
		vertical-align: top;
	}
	.docblock.body :global(table:not(.doctable) td:last-child) { padding-right: 0; }

	.docblock { font-size: 14px; }
	.docblock.body :global(.doctable) {
		width: 100%;
		border-collapse: collapse;
		margin: 16px 0 4px;
		font-size: 13.5px;
	}
	/* Capetele nu sunt cu majuscule: linia de sub ele separa deja, iar
	   majusculele tracked sunt maniera, nu informatie. */
	.docblock.body :global(.doctable th) {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-dim);
		text-align: left;
		padding: 0 10px 6px 0;
		border-bottom: 1px solid var(--text);
	}
	.docblock.body :global(.doctable td) {
		padding: 7px 10px 7px 0;
		border-bottom: 1px solid var(--border);
		text-align: left;
		vertical-align: top;
	}
	.docblock.body :global(.doctable th:last-child),
	.docblock.body :global(.doctable td:last-child) { padding-right: 0; }
	.docblock.body :global(.doctable .r) { text-align: right; }
	/* Coloanele scurte se string la continut; spatiul ramas se duce la
	   activitate, singura care are text de lungime variabila. */
	.docblock.body :global(.doctable .data),
	.docblock.body :global(.doctable .interval),
	.docblock.body :global(.doctable .proiect),
	.docblock.body :global(.doctable .client),
	.docblock.body :global(.doctable .r) { white-space: nowrap; width: 1%; }
	.docblock.body :global(.doctable .client) { color: var(--text-dim); }
	/* Randul de total: singura linie mai groasa din tabel, si fara linie dedesubt. */
	.docblock.body :global(.doctable tfoot td) {
		font-weight: 600;
		border-bottom: 0;
		border-top: 1.5px solid var(--text);
		padding-top: 8px;
	}
	.docblock.body :global(.doctable .empty) { text-align: center; padding: 22px 0; color: var(--text-dim); }
	.docblock :global(p) { margin: 0 0 8px; }
	.docblock :global(h3) { font-size: 16px; margin: 0 0 8px; }
	.docblock :global(ul), .docblock :global(ol) { margin: 0 0 8px; padding-left: 22px; }
	.docblock :global(table) { width: 100%; }
	.docblock :global(td), .docblock :global(th) { border: 0; padding: 4px 8px; }
	main { padding-block: var(--s5) var(--s6); }
	.sheet { padding: calc(var(--card-pad) * 1.4); }
	/* Tabelul nu poate iesi din card: daca nu incape, se deruleaza in interiorul lui. */
	.scroll { overflow-x: auto; margin: 0 -4px; padding: 0 4px; }
	.head { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 20px; flex-wrap: wrap; }
	h1 { font-size: 19px; }
	h2 { font-size: var(--text-sm); color: var(--text-dim); margin: 24px 0 8px; }
	.meta { font-size: 13px; text-align: right; }
	table { width: 100%; border-collapse: collapse; }
	th, td { padding: 7px 10px; text-align: left; border-bottom: 1px solid var(--border); }
	th { font-size: var(--text-xs); color: var(--text-dim); font-weight: 600; }
	tfoot td { font-weight: 600; border-bottom: 0; }
	.sum td { border-bottom: 1px solid var(--border); }
	.r { text-align: right; }
	.nowrap { white-space: nowrap; }
	.dim { color: var(--text-dim); }
	.empty { text-align: center; padding: 30px; }
	a.btn { text-decoration: none; color: inherit; }
	/* Sub prag tabelul devine o listă de fișe: fiecare rând e un bloc cu
	   etichete, fiindcă un timesheet cu 5 coloane nu încape pe un telefon.
	   `screen and` e esential: la TIPARIRE tabelul trebuie sa ramana tabel, altfel
	   capetele stau pe un rand iar celulele stivuite — coloane nealiniate in PDF. */
	@media screen and (max-width: 767px) {
		/* Rezumatul tine locul filtrelor pana e nevoie de ele. */
		/* Rezumatul filtrelor e o eticheta, nu un buton de actiune: textul sta la
		   stanga, ca sa se citeasca de la inceput. */
		.filtre-buton { display: block; width: 100%; text-align: left; }
		.filters { display: none; }
		.filters.deschis { display: flex; width: 100%; }

		/* Pe latimea unui telefon bara devine verticala: altfel linkul "Înapoi"
		   ramanea prins intre randurile de filtre. */
		.filters div { min-width: 0; flex: 1 0 calc(50% - 5px); }
		main { padding-block: var(--s3) var(--s5); }
		.sheet { padding: 16px; }
		.head { gap: 8px; }
		.meta { text-align: left; }

		table, thead, tbody, tfoot, tr, td, th { display: block; }
		thead { display: none; }
		tbody tr {
			padding: 10px 0;
			border-bottom: 1px solid var(--border);
		}
		tbody td {
			display: flex;
			gap: 10px;
			justify-content: space-between;
			align-items: baseline;
			padding: 2px 0;
			border: 0;
			text-align: left;
		}
		tbody td::before {
			content: attr(data-l);
			flex: 0 0 auto;
			font-size: var(--text-xs);
			color: var(--text-dim);
		}
		tbody td:empty { display: none; }
		tbody td.empty { justify-content: center; }
		tbody td.empty::before { content: none; }
		tfoot tr { display: flex; justify-content: space-between; gap: 10px; padding-top: 10px; }
		tfoot td { padding: 0; border: 0; }
		/* Sinteza ramane pe randuri: e deja compacta, nu are nevoie de etichete. */
		.sum tr { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; padding: 6px 0; border-bottom: 1px solid var(--border); }
		/* Sinteza n-are etichete pe rand, deci nu primeste tratamentul de fisa:
		   pseudo-elementul gol impingea numele grupului la dreapta. */
		.sum td { padding: 0; border: 0; justify-content: flex-start; }
		.sum td::before { content: none; }
		.sum td:first-child { flex: 1 0 100%; font-weight: 500; text-align: left; }
		.sum td:last-child { margin-left: auto; }
	}

	@media print {
		/* Foaie A4 cu margini de act. Fara asta, browserul pune marginile lui si
		   antetul/subsolul paginii peste continut. */
		@page {
			size: A4 portrait;
			margin: 18mm 16mm 20mm;
		}
		main { padding: 0; max-width: none; }
		.sheet { border: 0; box-shadow: none; padding: 0; background: #fff; }
		.scroll { overflow: visible; }
		table, thead, tbody, tfoot, tr, td, th { display: revert; }

		/* Pe hartie totul e negru pe alb: documentul ajunge la fotocopiator. */
		.docblock.body { font-size: 10.5pt; line-height: 1.45; color: #000; }
		.docblock.body :global(.doc-firma) { font-size: 13pt; }
		.docblock.body :global(.doc-titlu) { font-size: 15pt; }
		.docblock.body :global(.doc-total) { font-size: 19pt; }
		.docblock.body :global(.doc-mic),
		.docblock.body :global(.doc-eticheta) { font-size: 8.5pt; color: #444; }
		.docblock.body :global(.doc-nota) { font-size: 9pt; color: #444; }
		.docblock.body :global(.doc-antet) { border-bottom-color: #000; }
		.docblock.body :global(.doctable) { font-size: 9.5pt; }
		.docblock.body :global(.doctable th) { color: #000; border-bottom-color: #000; }
		.docblock.body :global(.doctable td) { border-bottom-color: #bbb; }
		.docblock.body :global(.doctable tfoot td) { border-top-color: #000; }
		.docblock.body :global(.linie-semnatura) { border-bottom-color: #000; }
		/* Capul de tabel se repeta pe fiecare pagina; un rand nu se rupe in doua. */
		.docblock.body :global(.doctable thead) { display: table-header-group; }
		.docblock.body :global(.doctable tr) { break-inside: avoid; }
		/* Semnaturile nu se despart de numele de deasupra lor. */
		.docblock.body :global(.semnaturi) { break-inside: avoid; }
		.docblock.body :global(.pagina-noua) { break-before: page; }
	}
</style>

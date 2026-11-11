<script lang="ts">
	import { entryColor } from '$lib/colors';
	import { useI18n } from '$lib/i18n/context';
	import type { Entry } from '$lib/types';

	type Props = { entries: Entry[]; onedit: (e: Entry) => void };
	let { entries, onedit }: Props = $props();
	const i18n = useI18n();
	const { t } = i18n;

	type SortKey = 'day' | 'duration' | 'client' | 'description';

	let search = $state('');
	let client = $state('');
	let project = $state('');
	let sortKey = $state<SortKey>('day');
	let desc = $state(false);

	// Ordinea alfabetica e a limbii utilizatorului (ș dupa s, nu la sfarsit).
	const cmpText = (a: string, b: string) => a.localeCompare(b, i18n.prefs.lang);

	let clientOptions = $derived(
		[...new Set(entries.map((e) => e.client_name).filter(Boolean))].sort((a, b) =>
			cmpText(a!, b!)
		) as string[]
	);
	let projectOptions = $derived(
		[...new Set(
			entries
				.filter((e) => !client || e.client_name === client)
				.map((e) => e.project_name)
				.filter(Boolean)
		)].sort((a, b) => cmpText(a!, b!)) as string[]
	);

	let filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();
		return entries.filter((e) => {
			if (client && e.client_name !== client) return false;
			if (project && e.project_name !== project) return false;
			if (!q) return true;
			// Cautarea acopera activitatea, clientul si proiectul deodata:
			// pe volumul asta e mai util decat trei campuri separate.
			return [e.description, e.client_name, e.project_name]
				.filter(Boolean)
				.some((v) => v!.toLowerCase().includes(q));
		});
	});

	let sorted = $derived.by(() => {
		const dir = desc ? -1 : 1;
		const byDay = (a: Entry, b: Entry) =>
			a.day === b.day ? a.start_min - b.start_min : a.day < b.day ? -1 : 1;
		const cmp: Record<SortKey, (a: Entry, b: Entry) => number> = {
			day: byDay,
			duration: (a, b) => a.end_min - a.start_min - (b.end_min - b.start_min),
			// Grupurile raman coerente: la egalitate de client (sau de activitate)
			// se cade inapoi pe ordinea cronologica.
			client: (a, b) => cmpText(a.client_name ?? '', b.client_name ?? '') || byDay(a, b),
			description: (a, b) => cmpText(a.description, b.description) || byDay(a, b)
		};
		return [...filtered].sort((a, b) => cmp[sortKey](a, b) * dir);
	});

	let total = $derived(sorted.reduce((s, e) => s + (e.end_min - e.start_min), 0));

	let perClient = $derived.by(() => {
		const m = new Map<string, { min: number; color: string | null }>();
		for (const e of sorted) {
			const k = e.client_name ?? t('list.noClient');
			const g = m.get(k) ?? { min: 0, color: e.client_color };
			g.min += e.end_min - e.start_min;
			m.set(k, g);
		}
		return [...m.entries()].sort((a, b) => b[1].min - a[1].min);
	});

	function sortBy(k: SortKey) {
		if (sortKey === k) desc = !desc;
		else {
			sortKey = k;
			desc = false;
		}
	}

	function reset() {
		search = '';
		client = '';
		project = '';
		sortKey = 'day';
		desc = false;
	}

	let filtersOn = $derived(!!(search.trim() || client || project));

	let sortari = $derived([
		['day', t('list.sortDay')],
		['duration', t('col.durata')],
		['client', t('col.client')],
		['description', t('col.activitate')]
	]);
</script>

<div class="controls card">
	<input
		type="text"
		bind:value={search}
		placeholder={t('list.search')}
		class="search"
	/>
	<select bind:value={client} onchange={() => (project = '')} aria-label={t('list.filterClient')}>
		<option value="">{t('list.allClients')}</option>
		{#each clientOptions as c}<option value={c}>{c}</option>{/each}
	</select>
	<select bind:value={project} aria-label={t('list.filterProject')}>
		<option value="">{t('list.allProjects')}</option>
		{#each projectOptions as p}<option value={p}>{p}</option>{/each}
	</select>
	<div class="sortrow">
		<span class="lbl">{t('list.sort')}</span>
		{#each sortari as [k, label]}
			<button
				class="sortbtn"
				class:on={sortKey === k}
				onclick={() => sortBy(k as SortKey)}
				title={t('list.sortBy', { field: label })}
			>
				{label}{#if sortKey === k}<span class="arrow">{desc ? '↓' : '↑'}</span>{/if}
			</button>
		{/each}
		{#if filtersOn || sortKey !== 'day' || desc}
			<button class="btn btn-ghost reset" onclick={reset}>{t('list.reset')}</button>
		{/if}
	</div>
</div>

{#if sorted.length === 0}
	<p class="muted empty">
		{entries.length ? t('list.noMatch') : t('list.empty')}
	</p>
{:else}
	<div class="card scroll">
		<table>
			<thead>
				<tr>
					<th>{t('col.data')}</th><th>{t('col.interval')}</th><th class="r">{t('col.durata')}</th>
					<th>{t('col.activitate')}</th><th>{t('col.client')}</th><th>{t('col.proiect')}</th>
				</tr>
			</thead>
			<tbody>
				{#each sorted as e (e.id)}
					{@const col = entryColor(e.project_color, e.client_color)}
					<tr onclick={() => onedit(e)} style:--line="var(--c-{col}-line)">
						<td class="tabular nowrap dot" data-l={t('col.data')}>{i18n.day(e.day)}</td>
						<td class="tabular nowrap" data-l={t('col.interval')}>{i18n.span(e.start_min, e.end_min)}</td>
						<td class="tabular r nowrap" data-l={t('col.durata')}>{i18n.dur(e.end_min - e.start_min)}</td>
						<td data-l={t('col.activitate')}>{e.description || '—'}</td>
						<td class="dim" data-l={t('col.client')}>{e.client_name ?? ''}</td>
						<td class="dim" data-l={t('col.proiect')}>{e.project_name ?? ''}</td>
					</tr>
				{/each}
			</tbody>
			<tfoot>
				<tr>
					<td colspan="2">{t('common.total')}</td>
					<td class="tabular r nowrap">{i18n.dur(total)}</td>
					<td colspan="3" class="dim tabular">{t('list.hours', { n: i18n.dec(total) })}</td>
				</tr>
			</tfoot>
		</table>
	</div>

	<div class="perclient card">
		<h3>{t('list.perClient')}</h3>
		{#each perClient as [name, g]}
			<div class="pc">
				<span class="sw" style:background="var(--c-{g.color ?? 'implicit'}-line)"></span>
				<span class="nm">{name}</span>
				<span class="tabular">{i18n.dur(g.min)} · {i18n.dec(g.min)}h</span>
			</div>
		{/each}
	</div>
{/if}

<style>
	.controls {
		display: flex;
		gap: 8px;
		align-items: center;
		flex-wrap: wrap;
		padding: var(--card-pad);
		margin-bottom: 12px;
	}
	.search { flex: 2 1 240px; }
	.controls select { flex: 1 1 150px; width: auto; }
	.sortrow { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; }
	.lbl { font-size: var(--text-xs); color: var(--text-dim); margin-right: 2px; }
	.sortbtn {
		border: 1px solid transparent;
		background: transparent;
		border-radius: 6px;
		padding: 5px 9px;
		font-size: 13px;
		color: var(--text-dim);
		cursor: pointer;
	}
	.sortbtn:hover { background: var(--surface-2); }
	.sortbtn.on { background: var(--accent-soft); color: var(--text); border-color: color-mix(in srgb, var(--accent) 40%, transparent); }
	.arrow { margin-left: 4px; }
	.reset { font-size: 13px; padding: 5px 9px; }

	.scroll { overflow-x: auto; }
	table { width: 100%; border-collapse: collapse; }
	th, td { padding: 9px 12px; text-align: left; border-bottom: 1px solid var(--border); }
	th { font-size: var(--text-xs); color: var(--text-dim); font-weight: 600; }
	tbody tr { cursor: pointer; }
	tbody tr:hover { background: var(--surface-2); }
	/* Bara de culoare a clientului/proiectului, pe prima coloana. */
	tbody .dot { box-shadow: inset 3px 0 0 var(--line, transparent); }
	tfoot td { font-weight: 600; border-bottom: 0; background: var(--surface-2); }
	.r { text-align: right; }
	.nowrap { white-space: nowrap; }
	.dim { color: var(--text-dim); }
	.empty { padding: 40px; text-align: center; }
	.perclient { margin-top: 16px; padding: var(--card-pad); max-width: 460px; }
	.perclient h3 { font-size: var(--text-sm); color: var(--text-dim); margin-bottom: 8px; }
	.pc { display: flex; align-items: center; gap: 10px; padding: 5px 0; border-top: 1px solid var(--border); }
	.nm { flex: 1; }
	.sw { width: 10px; height: 10px; border-radius: 3px; flex: 0 0 auto; }

	/* Doar pe ECRAN: la tiparire tabelul trebuie sa ramana tabel, altfel capetele
	   raman pe un rand iar celulele se stivuiesc — coloane nealiniate in PDF. */
	@media screen and (max-width: 767px) {

		.search, .controls select { flex: 1 1 100%; }
		.sortrow { width: 100%; }
		.scroll { overflow-x: visible; }
		table, thead, tbody, tfoot, tr, td, th { display: block; }
		thead { display: none; }
		tbody tr { padding: 10px 14px; border-bottom: 1px solid var(--border); box-shadow: inset 3px 0 0 var(--line, transparent); }
		tbody td { display: flex; gap: 10px; justify-content: space-between; align-items: baseline; padding: 2px 0; border: 0; }
		tbody td::before {
			content: attr(data-l);
			font-size: var(--text-xs);
			color: var(--text-dim);
		}
		tbody td:empty { display: none; }
		tbody .dot { box-shadow: none; }
		tfoot tr { display: flex; justify-content: space-between; padding: 10px 14px; }
		tfoot td { padding: 0; border: 0; }
	}
</style>

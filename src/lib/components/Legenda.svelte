<script lang="ts">
	// Legenda a ce se poate scrie intr-un document. Sta inchisa: cine stie deja
	// sintaxa n-are nevoie de ea pe ecran, dar cine scrie primul sablon are unde
	// sa se uite fara sa plece din pagina.
	//
	// Numele variabilelor si ale coloanelor sunt cele din limba utilizatorului;
	// documentele accepta oricum ambele forme (`{proiect}` si `{project}`).
	import Rich from './Rich.svelte';
	import { COLUMNS, DEFAULT_COLUMNS } from '$lib/docbody';
	import type { PlaceholderKey } from '$lib/placeholders';
	import { useI18n } from '$lib/i18n/context';

	const i18n = useI18n();
	const { t } = i18n;

	let deschisa = $state(false);

	// Grupate dupa de unde vine valoarea: altfel e o lista lunga fara logica.
	const GRUPE: { titlu: 'legend.groupReport' | 'legend.groupTotals' | 'legend.groupProvider'; chei: PlaceholderKey[] }[] = [
		{ titlu: 'legend.groupReport', chei: ['client', 'proiect', 'perioada', 'data'] },
		{ titlu: 'legend.groupTotals', chei: ['total_ore', 'total_zecimal', 'intervale', 'numar_intrari'] },
		{ titlu: 'legend.groupProvider', chei: ['firma', 'reprezentant', 'cui', 'adresa', 'utilizator'] }
	];

	let lista = $derived(i18n.placeholders());
	const eticheta = (cheie: PlaceholderKey) =>
		lista.find((p) => p.canonical === cheie)?.label ?? cheie;
	let raportTok = $derived(i18n.prefs.lang === 'en' ? '{report}' : '{raport}');
</script>

<section class="card legenda">
	<button class="cap" onclick={() => (deschisa = !deschisa)} aria-expanded={deschisa}>
		<span>{t('legend.title')}</span>
		<span class="semn" class:rotit={deschisa} aria-hidden="true">
			<svg viewBox="0 0 16 16"><path d="M4 6l4 4 4-4" /></svg>
		</span>
	</button>

	{#if deschisa}
		<div class="continut">
			<div class="bloc">
				<h3>{t('legend.table')}</h3>
				<p>
					<Rich
						text={t('legend.tableText', { cols: DEFAULT_COLUMNS.map((c) => i18n.col(c)).join(', ') })}
						marks={{ token: ['code', raportTok] }}
					/>
				</p>
				<p class="exemplu"><code>{t('legend.example')}</code></p>
				<p class="coloane">
					{#each COLUMNS as c, k}<code>{i18n.col(c.key)}</code>{k < COLUMNS.length - 1 ? ' ' : ''}{/each}
				</p>
				<p class="mic">{t('legend.multi')}</p>
			</div>

			{#each GRUPE as g}
				<div class="bloc">
					<h3>{t(g.titlu)}</h3>
					<dl>
						{#each g.chei as cheie}
							<dt><code>{i18n.ph(cheie)}</code></dt>
							<dd>{eticheta(cheie)}</dd>
						{/each}
					</dl>
				</div>
			{/each}

			<div class="bloc">
				<h3>{t('legend.blocks')}</h3>
				<p class="mic">{t('legend.blocksText')}</p>
			</div>

			<p class="mic nota">
				<Rich text={t('legend.typo')} marks={{ example: ['code', t('legend.typoExample')] }} />
			</p>
		</div>
	{/if}
</section>

<style>
	.legenda { overflow: hidden; }
	.cap {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		width: 100%;
		padding: 12px var(--card-pad);
		border: 0;
		background: transparent;
		cursor: pointer;
		font-size: var(--text-md);
		font-weight: 600;
		color: inherit;
		text-align: left;
	}
	.cap:hover { background: var(--surface-2); }
	.semn svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.7;
		stroke-linecap: round; display: block; transition: transform 0.15s; color: var(--text-dim); }
	.semn.rotit svg { transform: rotate(180deg); }

	.continut {
		padding: 0 var(--card-pad) var(--card-pad);
		border-top: 1px solid var(--border);
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
		gap: 18px 24px;
		align-items: start;
	}
	.bloc:first-child { grid-column: 1 / -1; }
	h3 { font-size: var(--text-sm); color: var(--text-dim); margin: 14px 0 6px; }
	p { margin: 0 0 6px; font-size: var(--text-sm); }
	.exemplu { margin: 8px 0; }
	.coloane { display: flex; flex-wrap: wrap; gap: 4px; }
	.mic { font-size: var(--text-xs); color: var(--text-dim); }
	.nota { grid-column: 1 / -1; margin: 0; }
	dl { display: grid; grid-template-columns: auto 1fr; gap: 4px 10px; margin: 0; align-items: baseline; }
	dt { margin: 0; }
	dd { margin: 0; font-size: var(--text-sm); color: var(--text-dim); }
	.legenda :global(code) {
		background: var(--surface-2);
		border: 1px solid var(--border);
		padding: 1px 5px;
		border-radius: 4px;
		font-size: 12px;
		white-space: nowrap;
	}
</style>

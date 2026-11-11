<script lang="ts">
	import { durationLabel, addDays, toISODay } from '$lib/time';
	import { entryColor } from '$lib/colors';
	import { useI18n } from '$lib/i18n/context';
	import type { Entry } from '$lib/types';

	type Props = {
		from: string;
		to: string;
		month: string; // orice zi din luna afisata
		entries: Entry[];
		onnew: (day: string, startMin: number) => void;
		onedit: (e: Entry) => void;
	};
	let { from, to, month, entries, onnew, onedit }: Props = $props();
	const i18n = useI18n();

	const today = toISODay(new Date());
	let monthPrefix = $derived(month.slice(0, 7));

	let days = $derived.by(() => {
		const out: string[] = [];
		for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
		return out;
	});

	function forDay(day: string) {
		return entries.filter((e) => e.day === day).sort((a, b) => a.start_min - b.start_min);
	}
	function total(day: string) {
		return forDay(day).reduce((s, e) => s + (e.end_min - e.start_min), 0);
	}
</script>

<div class="monthwrap">
<div class="month card">
	{#each i18n.days() as dn}
		<div class="dow">{dn}</div>
	{/each}

	{#each days as day}
		{@const list = forDay(day)}
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div
			class="cell"
			class:other={day.slice(0, 7) !== monthPrefix}
			class:today={day === today}
			onclick={(e) => e.target === e.currentTarget && onnew(day, 9 * 60)}
		>
			<div class="top">
				<span class="num">{Number(day.slice(8))}</span>
				{#if total(day)}<span class="tot tabular">{durationLabel(total(day))}</span>{/if}
			</div>
			{#each list.slice(0, 4) as e (e.id)}
				{@const col = entryColor(e.project_color, e.client_color)}
				<button class="chip" onclick={() => onedit(e)}
					style:--line="var(--c-{col}-line)" style:--fill="var(--c-{col}-bg)"
					title="{i18n.span(e.start_min, e.end_min)} {e.description}">
					<span class="tabular">{i18n.time(e.start_min)}</span>
					{e.description || '—'}
				</button>
			{/each}
			{#if list.length > 4}<span class="more">+{list.length - 4}</span>{/if}
		</div>
	{/each}
</div>
</div>

<style>
	.monthwrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
	.month {
		display: grid;
		grid-template-columns: repeat(7, minmax(46px, 1fr));
		min-width: 340px;
		overflow: hidden;
	}
	.dow {
		padding: 8px;
		font-size: var(--text-xs);
		color: var(--text-dim);
		border-bottom: 1px solid var(--border);
		border-left: 1px solid var(--border);
	}
	.dow:first-child { border-left: 0; }
	.cell {
		min-height: 104px;
		padding: 6px;
		border-left: 1px solid var(--border);
		border-top: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		gap: 3px;
		cursor: copy;
	}
	.cell:nth-child(7n + 1) { border-left: 0; }
	.cell.other { background: var(--surface-2); color: var(--text-faint); }
	.cell.today .num { background: var(--accent); color: var(--accent-text); }
	.top { display: flex; align-items: center; justify-content: space-between; }
	.num {
		font-size: 13px;
		font-weight: 600;
		min-width: 22px;
		height: 22px;
		display: grid;
		place-items: center;
		border-radius: 999px;
	}
	.tot { font-size: 11px; color: var(--text-dim); }
	.chip {
		display: flex;
		gap: 5px;
		width: 100%;
		text-align: left;
		border: 0;
		background: var(--fill, var(--accent-soft));
		border-left: 3px solid var(--line, var(--accent));
		border-radius: 4px;
		padding: 2px 5px;
		font-size: 11.5px;
		cursor: pointer;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.chip:hover { filter: brightness(1.05); }
	.chip span { color: var(--text-dim); }
	.more { font-size: 11px; color: var(--text-dim); padding-left: 4px; }

	@media (max-width: 767px) {
		.cell { min-height: 76px; padding: 4px; }
		.chip { font-size: 10.5px; padding: 1px 3px; }
		.chip span { display: none; } /* ora dispare: pe latimea asta conteaza descrierea */
		.dow { padding: 6px 4px; }
	}
</style>

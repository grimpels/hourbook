<script lang="ts">
	import { durationLabel, addDays, toISODay } from '$lib/time';
	import { entryColor } from '$lib/colors';
	import { layoutZi } from '$lib/weeklayout';
	import { useI18n } from '$lib/i18n/context';
	import type { Entry } from '$lib/types';

	type Props = {
		from: string;
		entries: Entry[];
		onnew: (day: string, startMin: number) => void;
		onedit: (e: Entry) => void;
	};
	let { from, entries, onnew, onedit }: Props = $props();
	const i18n = useI18n();

	const HOUR_H = 44; // px pe ora

	// Inaltimea minima a unei intrari: cat sa incapa cele trei randuri — ora,
	// activitatea si clientul — indiferent cat de scurta e intrarea. O intrare
	// de 5 minute are altfel 4 px si nu se poate nici citi, nici apasa.
	//
	//   3 px + 3 px  padding
	//   2 x 1 px     spatiul dintre randuri
	//   12.5 px      ora (10 px x 1.25)
	//   15 px        activitatea (12 px x 1.25)
	//   12.5 px      client · proiect (10 px x 1.25)
	//   2 x 1 px     chenarul
	const MIN_H = 50;

	// Cat „ocupa" vizual o intrare minima, in minute. Suprapunerile se calculeaza
	// pe durata ASTA, nu pe cea reala: altfel doua intrari scurte la 10 minute
	// distanta nu s-ar considera suprapuse, dar desenate s-ar acoperi una pe alta.
	const MIN_MIN = Math.ceil((MIN_H / HOUR_H) * 60);
	const START_H = 6; // grila incepe la 06:00; orele de dinainte raman accesibile prin scroll
	const END_H = 24;

	let days = $derived(Array.from({ length: 7 }, (_, i) => addDays(from, i)));
	let hours = $derived(Array.from({ length: END_H - START_H }, (_, i) => START_H + i));
	// Capetele urmeaza prima zi aleasa: `from` e deja inceputul saptamanii.
	let names = $derived(i18n.days());
	const today = toISODay(new Date());

	function forDay(day: string) {
		return entries.filter((e) => e.day === day);
	}

	// Asezarea pe coloane sta in `$lib/weeklayout`, ca sa poata fi verificata
	// separat: e singura bucata de logica din calendar care se poate insela.
	const layout = (list: Entry[]) => layoutZi(list, MIN_MIN);

	function totalFor(day: string) {
		return forDay(day).reduce((s, e) => s + (e.end_min - e.start_min), 0);
	}

	function clickSlot(ev: MouseEvent, day: string) {
		const box = (ev.currentTarget as HTMLElement).getBoundingClientRect();
		const y = ev.clientY - box.top;
		const min = START_H * 60 + Math.floor(y / HOUR_H * 60 / 15) * 15;
		onnew(day, Math.min(min, 23 * 60 + 45));
	}
</script>

<div class="weekwrap">
<div class="week">
	<div class="corner"></div>
	{#each days as day, i}
		<div class="head" class:today={day === today}>
			<span class="dn">{names[i]}</span>
			<span class="dd">{day.slice(8)}</span>
			{#if totalFor(day)}<span class="tot tabular">{durationLabel(totalFor(day))}</span>{/if}
		</div>
	{/each}

	<div class="gutter">
		{#each hours as h}
			<div class="hr tabular" style:height="{HOUR_H}px">{i18n.hour(h)}</div>
		{/each}
	</div>

	{#each days as day}
		{@const list = forDay(day)}
		{@const pos = layout(list)}
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div class="col" class:today={day === today} onclick={(e) => clickSlot(e, day)}
			style:height="{(END_H - START_H) * HOUR_H}px">
			{#each hours as h}
				<div class="line" style:top="{(h - START_H) * HOUR_H}px"></div>
			{/each}
			{#each list as e (e.id)}
				{@const p = pos.get(e.id)!}
				{@const top = ((e.start_min - START_H * 60) / 60) * HOUR_H}
				{@const height = Math.max(((e.end_min - e.start_min) / 60) * HOUR_H - 2, MIN_H)}
				{@const col = entryColor(e.project_color, e.client_color)}
				<button
					class="entry"
					style:--line="var(--c-{col}-line)"
					style:--fill="var(--c-{col}-bg)"
					style:top="{top}px"
					style:height="{height}px"
					style:left="calc({(p.col / p.of) * 100}% + 2px)"
					style:width="calc({100 / p.of}% - 4px)"
					onclick={(ev) => { ev.stopPropagation(); onedit(e); }}
					title="{i18n.span(e.start_min, e.end_min)} {e.description}"
				>
					<span class="t tabular">{i18n.time(e.start_min)}</span>
					<span class="d">{e.description || '—'}</span>
					{#if e.client_name || e.project_name}
						<span class="cp">{[e.client_name, e.project_name].filter(Boolean).join(' · ')}</span>
					{/if}
				</button>
			{/each}
		</div>
	{/each}
</div>
</div>

<style>
	/* Sub ~700px cele 7 coloane ar deveni ilizibile, deci grila se deruleaza pe
	   orizontala in loc sa se stranga. Latimea minima tine o coloana peste 80px. */
	.weekwrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
	.week {
		display: grid;
		grid-template-columns: 54px repeat(7, minmax(80px, 1fr));
		min-width: 640px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		overflow: hidden;
	}
	.corner, .head {
		position: sticky;
		top: 0;
		z-index: 5;
		background: var(--surface);
		border-bottom: 1px solid var(--border);
		padding: 8px 6px;
	}
	.head {
		display: flex;
		align-items: baseline;
		gap: 6px;
		border-left: 1px solid var(--border);
		font-size: 13px;
	}
	.head.today { background: var(--accent-soft); }
	.dn { color: var(--text-dim); font-size: var(--text-xs); }
	.dd { font-weight: 600; font-size: 15px; }
	.tot { margin-left: auto; font-size: 11px; color: var(--text-dim); }
	.gutter { border-right: 1px solid var(--border); padding-top: 7px; }
	.hr {
		font-size: 11px;
		color: var(--text-faint);
		text-align: right;
		padding-right: 6px;
		transform: translateY(-6px);
	}
	.col { position: relative; border-left: 1px solid var(--border); cursor: copy; margin-top: 7px; }
	.col.today { background: color-mix(in srgb, var(--accent-soft) 40%, transparent); }
	.line { position: absolute; left: 0; right: 0; border-top: 1px solid var(--border); }
	.entry {
		position: absolute;
		display: flex;
		flex-direction: column;
		gap: 1px;
		padding: 3px 5px;
		background: var(--fill, var(--accent-soft));
		border: 1px solid color-mix(in srgb, var(--line, var(--accent)) 45%, transparent);
		border-left: 3px solid var(--line, var(--accent));
		border-radius: 5px;
		text-align: left;
		overflow: hidden;
		cursor: pointer;
		font-size: 12px;
		line-height: 1.25;
	}
	.entry:hover { filter: brightness(1.04); border-color: var(--line, var(--accent)); }
	.t { color: var(--text-dim); font-size: 10px; }
	.d { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.cp { color: var(--text-dim); font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>

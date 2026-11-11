<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import WeekView from '$lib/components/WeekView.svelte';
	import MonthView from '$lib/components/MonthView.svelte';
	import ListView from '$lib/components/ListView.svelte';
	import EntryDialog from '$lib/components/EntryDialog.svelte';
	import AppBar from '$lib/components/AppBar.svelte';
	import TimerBar from '$lib/components/TimerBar.svelte';
	import { addDays, startOfWeek, toISODay } from '$lib/time';
	import { useI18n } from '$lib/i18n/context';
	import { errorText } from '$lib/http';
	import type { Entry } from '$lib/types';

	let { data } = $props();
	const i18n = useI18n();
	const { t } = i18n;

	let dialog: (Partial<Entry> & { day: string; start_min: number; end_min: number }) | null =
		$state(null);
	let dinCronometru = $state(false);
	let nota = $state('');

	function deschide(e: typeof dialog, optiuni: { dinCronometru?: boolean; nota?: string } = {}) {
		dinCronometru = optiuni.dinCronometru ?? false;
		nota = optiuni.nota ?? '';
		dialog = e;
	}

	// --- Cronometru -----------------------------------------------------------

	async function porneste(campuri: { description?: string; client?: string; project?: string } = {}) {
		const res = await fetch('/api/cronometru', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(campuri)
		});
		if (!res.ok) { alert(await errorText(res)); return false; }
		await invalidateAll();
		return true;
	}

	/**
	 * Oprirea deschide dialogul completat cu ce e scris acum in bara — nu cu
	 * `data.timer`, care e starea de la ultima incarcare a paginii.
	 */
	function opreste(campuri: { description: string; client: string; project: string }) {
		const tm = data.timer;
		if (!tm) return;
		const s = new Date(tm.started_at);
		const start = s.getHours() * 60 + s.getMinutes();
		let durata = Math.max(1, Math.round((Date.now() - tm.started_at) / 60000));
		let mesaj = '';
		// O intrare nu poate depasi 24 de ore; un cronometru uitat pornit peste
		// noapte se limiteaza, iar utilizatorul corecteaza ora de sfarsit.
		if (durata > 1439) {
			mesaj = t('timer.capped', { hours: Math.floor(durata / 60) });
			durata = 1439;
		}
		deschide(
			{
				day: toISODay(s),
				start_min: start,
				end_min: start + durata,
				description: campuri.description,
				client_name: campuri.client.trim() || null,
				project_name: campuri.project.trim() || null
			},
			{ dinCronometru: true, nota: mesaj }
		);
	}

	async function renuntaCronometru() {
		await fetch('/api/cronometru', { method: 'DELETE' });
		await invalidateAll();
	}

	// --- Duplica / Continua, din dialogul unei intrari existente --------------

	function duplica(e: Entry) {
		deschide({
			day: toISODay(new Date()),
			start_min: e.start_min,
			end_min: e.end_min,
			description: e.description,
			client_name: e.client_name,
			project_name: e.project_name
		});
	}

	async function continua(e: Entry) {
		const pornit = await porneste({
			description: e.description,
			client: e.client_name ?? '',
			project: e.project_name ?? ''
		});
		if (pornit) dialog = null;
	}

	let total = $derived(data.entries.reduce((s, e) => s + (e.end_min - e.start_min), 0));

	let title = $derived.by(() => {
		if (data.view === 'week') return i18n.range(data.from, addDays(data.from, 6));
		if (data.view === 'month') {
			const [y, m] = data.date.split('-').map(Number);
			return i18n.month(y, m);
		}
		return i18n.range(data.from, data.to);
	});

	function nav(delta: number) {
		let date: string;
		if (data.view === 'week') date = addDays(startOfWeek(data.date, i18n.prefs.weekStart), delta * 7);
		else {
			const [y, m] = data.date.split('-').map(Number);
			const d = new Date(y, m - 1 + delta, 1);
			date = toISODay(d);
		}
		goto(`/?view=${data.view}&date=${date}`, { keepFocus: true, noScroll: true });
	}

	function setView(v: string) {
		goto(`/?view=${v}&date=${data.date}`, { keepFocus: true, noScroll: true });
	}

	function today() {
		goto(`/?view=${data.view}&date=${toISODay(new Date())}`, { keepFocus: true, noScroll: true });
	}

	function newEntry(day: string, startMin: number) {
		deschide({ day, start_min: startMin, end_min: startMin + 30 });
	}

	function quickAdd() {
		const now = new Date();
		const min = Math.floor((now.getHours() * 60 + now.getMinutes()) / 15) * 15;
		deschide({ day: toISODay(now), start_min: Math.max(min - 30, 0), end_min: min || 30 });
	}

	async function saved() {
		dialog = null;
		await invalidateAll();
	}

	function onkey(e: KeyboardEvent) {
		const el = e.target as HTMLElement;
		if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
		if (e.key === 'n') { e.preventDefault(); quickAdd(); }
		else if (e.key === 'ArrowLeft') nav(-1);
		else if (e.key === 'ArrowRight') nav(1);
		else if (e.key === 't') today();
	}

	let vederi = $derived([
		['week', t('view.week')],
		['month', t('view.month')],
		['list', t('view.list')]
	]);
</script>

<svelte:window onkeydown={onkey} />

<AppBar titlu={title}>
	{#snippet inainte()}
		<button class="btn btn-ghost sq" onclick={() => nav(-1)} aria-label={t('home.prev')}>‹</button>
		<button class="btn btn-ghost sq" onclick={() => nav(1)} aria-label={t('home.next')}>›</button>
		<button class="btn btn-ghost" onclick={today}>{t('home.today')}</button>
	{/snippet}

	{#snippet actiuni()}
		<span class="total tabular muted">{i18n.dur(total)} · {i18n.dec(total)}h</span>
		{#if !data.timer}
			<button class="btn" onclick={() => porneste()} title={t('home.startTitle')}>
				<svg class="ic-play" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5v9l7.5-4.5z" /></svg>
				{t('home.start')}
			</button>
		{/if}
		<button class="btn btn-primary" onclick={quickAdd}>{t('home.newEntry')}</button>
	{/snippet}

	{#snippet subtitlu()}
		<div class="tabs">
			{#each vederi as [v, label]}
				<button class="tab" class:on={data.view === v} onclick={() => setView(v)}>{label}</button>
			{/each}
		</div>
	{/snippet}
</AppBar>

{#if data.timer}
	<TimerBar timer={data.timer} clients={data.clients} projects={data.projects} activities={data.activities}
		onstop={opreste} ondiscard={renuntaCronometru} />
{/if}

<main class="container">
	{#if data.view === 'week'}
		<WeekView from={data.from} entries={data.entries} onnew={newEntry} onedit={(e) => deschide(e)} />
	{:else if data.view === 'month'}
		<MonthView from={data.from} to={data.to} month={data.date} entries={data.entries}
			onnew={newEntry} onedit={(e) => deschide(e)} />
	{:else}
		<ListView entries={data.entries} onedit={(e) => deschide(e)} />
	{/if}
</main>

{#if dialog}
	<!-- `key`: cand Duplica inlocuieste intrarea deschisa cu una noua, dialogul se
	     reconstruieste. Altfel isi pastra starea initiala si arata tot intrarea veche. -->
	{#key dialog}
		<EntryDialog entry={dialog} clients={data.clients} projects={data.projects} activities={data.activities}
			{dinCronometru} {nota}
			onduplica={duplica} oncontinua={continua}
			onclose={() => (dialog = null)} onsaved={saved} />
	{/key}
{/if}

<style>
	.sq { width: var(--control-h); padding: 0; font-size: var(--text-xl); line-height: 1; }
	.total { font-size: var(--text-sm); }
	.ic-play { width: 12px; height: 12px; fill: currentColor; }
	/* Selector segmentat, ca in sistemele obisnuite: un grup, nu butoane
	   separate — alegerea e exclusiva. */
	.tabs {
		display: flex;
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 2px;
	}
	.tab {
		border: 0;
		background: transparent;
		height: var(--control-h-sm);
		padding: 0 12px;
		border-radius: 6px;
		cursor: pointer;
		font-size: var(--text-md);
		font-weight: 500;
		color: var(--text-dim);
	}
	.tab.on { background: var(--surface); color: var(--text); box-shadow: var(--shadow); font-weight: 500; }

	main { padding-block: var(--s4) var(--s6); }
	a.btn { text-decoration: none; color: inherit; }

	@media (max-width: 767px) {
		.tabs { flex: 1 1 auto; }
		.total { display: none; } /* se vede oricum in capul fiecarei zile */
		.tab { flex: 1; text-align: center; padding: 6px 4px; }
		main { padding-block: 10px; }
	}
</style>

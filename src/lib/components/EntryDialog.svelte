<script lang="ts">
	import Combobox from './Combobox.svelte';
	import DayField from './DayField.svelte';
	import TimeField from './TimeField.svelte';
	import { minToHHMM, hhmmToMin, durationLabel } from '$lib/time';
	import { useI18n } from '$lib/i18n/context';
	import { errorText } from '$lib/http';
	import { completeaza } from '$lib/activity';
	import type { Entry, Client, Project, Activity } from '$lib/types';

	type Props = {
		entry: Partial<Entry> & { day: string; start_min: number; end_min: number };
		clients: Client[];
		projects: Project[];
		activities?: Activity[];
		onclose: () => void;
		onsaved: () => void;
		/** Intrarea vine din oprirea cronometrului: salvarea il si opreste. */
		dinCronometru?: boolean;
		/** Un mesaj deasupra formularului (de exemplu, o durata limitata). */
		nota?: string;
		/** Actiuni pe o intrare existenta. */
		onduplica?: (e: Entry) => void;
		oncontinua?: (e: Entry) => void;
	};
	let {
		entry, clients, projects, activities = [], onclose, onsaved,
		dinCronometru = false, nota = '', onduplica, oncontinua
	}: Props = $props();
	const { t } = useI18n();

	// Campurile afiseaza data si ora in formatul ales in setari, dar valorile
	// legate aici raman YYYY-MM-DD si HH:MM pe 24 de ore (goale daca textul e invalid).
	let day = $state(entry.day);
	let start = $state(minToHHMM(entry.start_min));
	let end = $state(minToHHMM(entry.end_min));
	let description = $state(entry.description ?? '');
	let client = $state(entry.client_name ?? '');
	let project = $state(entry.project_name ?? '');
	let error = $state('');
	let busy = $state(false);

	const isNew = $derived(!entry.id);

	function alegeActivitatea(v: string) {
		({ client, project } = completeaza(activities.find((a) => a.description === v), client, project));
	}

	// Starea curenta a formularului, ca o intrare: Duplica si Continua pornesc de
	// la ce e scris acum in formular, nu de la ce era salvat.
	function curent(): Entry {
		return {
			...(entry as Entry),
			description,
			client_name: client.trim() || null,
			project_name: project.trim() || null
		};
	}

	// Proiectele propuse se restrang la clientul ales — asa lista ramane scurta
	// si nu se leaga din greseala un proiect de alt client.
	let projectOptions = $derived.by(() => {
		const all = projects;
		if (!client.trim()) return [...new Set(all.map((p) => p.name))];
		const c = client.trim().toLowerCase();
		const mine = all.filter((p) => (p.client_name ?? '').toLowerCase() === c);
		return [...new Set(mine.map((p) => p.name))];
	});

	let duration = $derived.by(() => {
		const s = hhmmToMin(start);
		let e = hhmmToMin(end);
		if (s === null || e === null) return null;
		if (e <= s) e += 1440; // trece de miezul noptii
		return e - s;
	});

	async function save(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		if (!day) { error = t('err.invalidDay'); return; }
		const s = hhmmToMin(start);
		let en = hhmmToMin(end);
		if (s === null || en === null) { error = t('err.invalidTimes'); return; }
		if (en <= s) en += 1440;

		busy = true;
		const res = await fetch(isNew ? '/api/entries' : `/api/entries/${entry.id}`, {
			method: isNew ? 'POST' : 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				day, start: s, end: en, description, client, project,
				opresteCronometrul: dinCronometru
			})
		});
		busy = false;
		if (!res.ok) { error = await errorText(res); return; }
		onsaved();
	}

	async function remove() {
		if (!confirm(t('entry.confirmDelete'))) return;
		busy = true;
		await fetch(`/api/entries/${entry.id}`, { method: 'DELETE' });
		busy = false;
		onsaved();
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="backdrop" onclick={(e) => e.target === e.currentTarget && onclose()}>
	<form class="card dialog" onsubmit={save}>
		<header>
			<h2>{dinCronometru ? t('entry.stopTimer') : isNew ? t('entry.new') : t('entry.edit')}</h2>
			<button type="button" class="btn btn-ghost x" onclick={onclose} aria-label={t('common.close')}>×</button>
		</header>

		{#if error}<div class="error">{error}</div>{/if}
		{#if nota}<div class="nota">{nota}</div>{/if}

		<div class="row">
			<div class="col">
				<label for="d">{t('col.data')}</label>
				<DayField id="d" bind:value={day} required />
			</div>
			<div class="col narrow">
				<label for="s">{t('entry.start')}</label>
				<TimeField id="s" bind:value={start} required />
			</div>
			<div class="col narrow">
				<label for="e">{t('entry.end')}</label>
				<TimeField id="e" bind:value={end} required />
			</div>
			<div class="dur muted">{duration ? durationLabel(duration) : '—'}</div>
		</div>

		<div>
			<label for="desc">{t('col.activitate')}</label>
			<Combobox id="desc" bind:value={description} options={activities.map((a) => a.description)}
				placeholder={t('entry.activityPh')} creare={false} onselect={alegeActivitatea} />
		</div>

		<div class="row">
			<div class="col">
				<label for="cl">{t('col.client')} <span class="opt">{t('entry.optional')}</span></label>
				<Combobox id="cl" bind:value={client} options={clients.map((c) => c.name)}
					placeholder={t('entry.searchOrAdd')} />
			</div>
			<div class="col">
				<label for="pr">{t('col.proiect')} <span class="opt">{t('entry.optional')}</span></label>
				<Combobox id="pr" bind:value={project} options={projectOptions}
					placeholder={t('entry.searchOrAdd')} />
			</div>
		</div>

		<footer>
			{#if !isNew}
				<button type="button" class="btn btn-danger" onclick={remove} disabled={busy}>{t('common.delete')}</button>
				{#if onduplica}
					<button type="button" class="btn" onclick={() => onduplica(curent())} disabled={busy}
						title={t('entry.duplicateTitle')}>{t('entry.duplicate')}</button>
				{/if}
				{#if oncontinua}
					<button type="button" class="btn" onclick={() => oncontinua(curent())} disabled={busy}
						title={t('entry.continueTitle')}>{t('entry.continue')}</button>
				{/if}
			{/if}
			<div class="spacer"></div>
			<button type="button" class="btn" onclick={onclose}>{t('common.cancel')}</button>
			<button class="btn btn-primary" disabled={busy}>
				{busy ? t('common.saving') : dinCronometru ? t('entry.saveStop') : t('common.save')}
			</button>
		</footer>
	</form>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.35);
		display: grid;
		place-items: start center;
		padding: 8vh 16px 16px;
		z-index: 50;
		overflow-y: auto;
	}
	.dialog {
		width: 100%;
		max-width: 520px;
		padding: var(--card-pad);
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	header { display: flex; align-items: center; justify-content: space-between; }
	h2 { font-size: 17px; }
	.x { font-size: 22px; line-height: 1; padding: 2px 8px; }
	.row { display: flex; gap: 10px; align-items: flex-end; }
	.col { flex: 1; min-width: 0; }
	.col.narrow { flex: 0 0 108px; }
	.dur { padding-bottom: 9px; font-size: 13px; min-width: 52px; text-align: right; }
	.opt { color: var(--text-faint); font-size: var(--text-xs); }
	footer { display: flex; gap: 8px; align-items: center; margin-top: 4px; }
	.spacer { flex: 1; }
	.nota {
		font-size: var(--text-sm);
		padding: 8px 10px;
		border-radius: 6px;
		background: var(--surface-2);
		border: 1px solid var(--border);
	}
	@media (max-width: 767px) {
		.backdrop { padding: 12px 10px 24px; }
		.dialog { padding: 16px; gap: 12px; }
		.row { flex-wrap: wrap; }
		/* Data pe rand propriu, orele alaturi. Fara asta campul datei era
		   strivit la latime zero intre cele doua campuri de ora. */
		.col { flex: 1 0 100%; }
		.col.narrow { flex: 1 0 calc(50% - 5px); }
		.dur { width: 100%; text-align: left; padding-bottom: 0; }
		footer { flex-wrap: wrap; }
		footer :global(.btn) { flex: 1 1 auto; justify-content: center; }
		.spacer { display: none; }
	}
</style>

<script lang="ts">
	// Bara cronometrului in desfasurare. Apare sub bara de sus cat timp merge,
	// pe orice pagina de pontaj. Descrierea se poate scrie din mers — altfel
	// pana la oprire uiti ce faceai — la fel clientul si proiectul. Totul se
	// salveaza pe server, deci ramane si daca deschizi aplicatia pe alt dispozitiv.
	import Combobox from './Combobox.svelte';
	import { completeaza } from '$lib/activity';
	import type { Timer, Client, Project, Activity } from '$lib/types';
	import { useI18n } from '$lib/i18n/context';

	type Campuri = { description: string; client: string; project: string };
	type Props = {
		timer: Timer;
		clients: Client[];
		projects: Project[];
		activities?: Activity[];
		/** Primeste ce e scris ACUM in bara, nu ce era salvat la pornire. */
		onstop: (c: Campuri) => void;
		ondiscard: () => void;
	};
	let { timer, clients, projects, activities = [], onstop, ondiscard }: Props = $props();
	const i18n = useI18n();
	const { t } = i18n;

	let acum = $state(Date.now());
	let descriere = $state(timer.description);
	let client = $state(timer.client);
	let project = $state(timer.project);
	let salvare: ReturnType<typeof setTimeout> | undefined;

	// Aceeasi restrangere ca in dialogul intrarii: proiectele clientului ales.
	let proiecte = $derived.by(() => {
		const c = client.trim().toLowerCase();
		const lista = c ? projects.filter((p) => (p.client_name ?? '').toLowerCase() === c) : projects;
		return [...new Set(lista.map((p) => p.name))];
	});

	// Orice schimbare se salveaza dupa o jumatate de secunda de liniste. Cheia
	// ultimei salvari evita o cerere la montare, cand nimic nu s-a schimbat.
	let salvat = [timer.description, timer.client, timer.project].join('\n');
	$effect(() => {
		const campuri = { description: descriere, client, project };
		const cheie = [descriere, client, project].join('\n');
		if (cheie === salvat) return;
		clearTimeout(salvare);
		salvare = setTimeout(() => {
			salvat = cheie;
			fetch('/api/cronometru', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(campuri)
			});
		}, 500);
	});

	$effect(() => {
		const id = setInterval(() => (acum = Date.now()), 1000);
		return () => clearInterval(id);
	});

	let secunde = $derived(Math.max(0, Math.floor((acum - timer.started_at) / 1000)));
	let afisat = $derived.by(() => {
		const h = Math.floor(secunde / 3600);
		const m = Math.floor((secunde % 3600) / 60);
		const s = secunde % 60;
		const doua = (n: number) => String(n).padStart(2, '0');
		return h ? `${h}:${doua(m)}:${doua(s)}` : `${doua(m)}:${doua(s)}`;
	});
	// Peste 12 ore aproape sigur a fost uitat pornit.
	let uitat = $derived(secunde > 12 * 3600);

	let inceput = $derived.by(() => {
		const d = new Date(timer.started_at);
		return i18n.time(d.getHours() * 60 + d.getMinutes());
	});

	function alegeActivitatea(v: string) {
		({ client, project } = completeaza(activities.find((a) => a.description === v), client, project));
	}

	function renunta() {
		if (confirm(t('timer.confirmDiscard'))) ondiscard();
	}
</script>

<div class="cronometru no-print" class:uitat>
	<div class="container rand">
		<span class="punct" aria-hidden="true"></span>
		<span class="timp tabular" aria-live="off">{afisat}</span>
		<span class="de-la muted">{t('timer.since', { time: inceput })}</span>
		<div class="descriere">
			<Combobox id="cr-desc" bind:value={descriere} options={activities.map((a) => a.description)}
				placeholder={t('timer.placeholder')} label={t('timer.descLabel')}
				creare={false} onselect={alegeActivitatea} />
		</div>
		<div class="camp-cp">
			<Combobox id="cr-client" bind:value={client} options={clients.map((c) => c.name)}
				placeholder={t('col.client')} label={t('col.client')} />
		</div>
		<div class="camp-cp">
			<Combobox id="cr-proiect" bind:value={project} options={proiecte}
				placeholder={t('col.proiect')} label={t('col.proiect')} />
		</div>
		<button class="btn btn-ghost small" onclick={renunta}>{t('common.cancel')}</button>
		<button class="btn btn-primary small"
			onclick={() => onstop({ description: descriere, client, project })}>{t('timer.stop')}</button>
	</div>
	{#if uitat}
		<div class="container avertisment">
			{t('timer.forgotten')}
		</div>
	{/if}
</div>

<style>
	.cronometru {
		background: var(--accent-soft);
		border-bottom: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
	}
	.cronometru.uitat { background: color-mix(in srgb, var(--danger) 10%, var(--surface)); }
	.rand {
		display: flex;
		align-items: center;
		gap: var(--s2) var(--s3);
		flex-wrap: wrap;
		padding-block: var(--s2);
	}
	/* Punctul pulseaza: e singurul element care se misca in toata aplicatia, si
	   anume ca sa arate ca ceva ruleaza. Se opreste daca utilizatorul a cerut
	   miscare redusa. */
	.punct {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--accent);
		animation: puls 1.6s ease-in-out infinite;
	}
	.uitat .punct { background: var(--danger); }
	@keyframes puls {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.35; }
	}
	@media (prefers-reduced-motion: reduce) {
		.punct { animation: none; }
	}
	.timp { font-size: var(--text-lg); font-weight: 600; min-width: 5ch; }
	.de-la { font-size: var(--text-sm); }
	.descriere { flex: 1 1 200px; min-width: 0; }
	.camp-cp { flex: 0 1 180px; min-width: 120px; }
	/* Bara e un singur rand de controale mici. */
	.descriere :global(input), .camp-cp :global(input) { height: var(--control-h-sm); }
	.avertisment { font-size: var(--text-sm); color: var(--danger); padding-bottom: var(--s2); }

	@media (max-width: 767px) {
		/* Pe telefon: timpul si butoanele pe primul rand, descrierea dedesubt, pe
		   toata latimea — acolo e loc sa scrii. */
		.de-la { display: none; }
		.descriere { order: 5; flex: 1 1 100%; }
		/* Clientul si proiectul, cate o jumatate de rand sub descriere. */
		.camp-cp { order: 6; flex: 1 1 40%; }
		.timp { margin-right: auto; }
	}
</style>

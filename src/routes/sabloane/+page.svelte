<script lang="ts">
	import AppBar from '$lib/components/AppBar.svelte';
	import Rich from '$lib/components/Rich.svelte';
	import { invalidateAll } from '$app/navigation';
	import RichText from '$lib/components/RichText.svelte';
	import Legenda from '$lib/components/Legenda.svelte';
	import { useI18n } from '$lib/i18n/context';
	import { errorText } from '$lib/http';

	let { data, form } = $props();
	const i18n = useI18n();
	const { t } = i18n;

	let templates = $state(data.templates);
	let editing = $state<number | 'nou' | null>(null);
	let name = $state('');
	let body = $state('');
	let busy = $state(false);
	let err = $state('');

	$effect(() => {
		templates = data.templates;
	});

	function edit(tpl: { id: number; name: string; body: string }) {
		editing = editing === tpl.id ? null : tpl.id;
		name = tpl.name;
		body = tpl.body;
		err = '';
	}

	function nou() {
		editing = 'nou';
		name = '';
		body = t('templates.newBody');
		err = '';
	}

	async function save() {
		busy = true;
		err = '';
		const res = await fetch('/api/sabloane', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: editing === 'nou' ? undefined : editing, name, body })
		});
		busy = false;
		if (!res.ok) { err = await errorText(res); return; }
		templates = await res.json();
		editing = null;
		await invalidateAll();
	}

	async function remove(tpl: { id: number; name: string }) {
		if (!confirm(t('templates.confirmDelete', { name: tpl.name }))) return;
		const res = await fetch('/api/sabloane', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: tpl.id })
		});
		if (res.ok) { templates = await res.json(); editing = null; await invalidateAll(); }
	}

	let placeholders = $derived(i18n.placeholders());
	let raportTok = $derived(i18n.prefs.lang === 'en' ? '{report}' : '{raport}');
</script>

<svelte:head><title>{t('nav.templates')} · Pontaj</title></svelte:head>

<AppBar titlu={t('templates.title')}>
	{#snippet actiuni()}
		<button class="btn btn-primary small" onclick={nou}>{t('templates.add')}</button>
	{/snippet}
</AppBar>

<main class="container">
	<p class="muted intro">
		<Rich text={t('templates.intro')} marks={{ import: ['strong', t('templates.importWord')] }} />
	</p>

	{#if form?.added !== undefined}
		<div class="ok">{form.added ? t('templates.added', { n: form.added }) : t('templates.allExist')}</div>
	{/if}
	{#if err}<div class="error">{err}</div>{/if}

	<Legenda />

	{#if editing !== null}
		<section class="card edit">
			<label for="n">{t('templates.name')}</label>
			<input id="n" bind:value={name} placeholder={t('templates.namePh')} />

			<label for="b">{t('clients.body')}</label>
			<p class="muted hint">
				<Rich text={t('templates.hint')} marks={{ token: ['code', raportTok] }} />
			</p>
			<RichText id="b" bind:value={body} {placeholders} />

			<div class="btns">
				{#if editing !== 'nou'}
					<a class="btn" target="_blank"
						href="/raport?sablon={editing}&from={data.preview.from}&to={data.preview.to}&client={encodeURIComponent(data.preview.client)}">
						{t('templates.preview')}
					</a>
				{/if}
				<button class="btn btn-primary" onclick={save} disabled={busy || !name.trim()}>
					{busy ? t('common.saving') : t('common.save')}
				</button>
				<button class="btn" onclick={() => (editing = null)}>{t('common.cancel')}</button>
			</div>
		</section>
	{/if}

	{#if templates.length === 0}
		<section class="card empty">
			<p class="muted">{t('templates.none')}</p>
			<form method="POST" action="?/starters">
				<button class="btn">{t('templates.addStarters', { n: data.starters.length })}</button>
			</form>
			<p class="muted small">{data.starters.join(' · ')}</p>
		</section>
	{:else}
		{#each templates as tpl (tpl.id)}
			<section class="card row">
				<div class="nm">
					<strong>{tpl.name}</strong>
					<span class="muted prev">{tpl.body.replace(/<[^>]*>/g, ' ').trim().slice(0, 90)}…</span>
				</div>
				<a class="btn btn-ghost small" target="_blank"
					href="/raport?sablon={tpl.id}&from={data.preview.from}&to={data.preview.to}&client={encodeURIComponent(data.preview.client)}">
					{t('templates.preview')}
				</a>
				<button class="btn btn-ghost small" onclick={() => edit(tpl)}>
					{editing === tpl.id ? t('common.close') : t('templates.edit')}
				</button>
				<button class="btn btn-ghost small danger" onclick={() => remove(tpl)}>{t('common.delete')}</button>
			</section>
		{/each}
		<form method="POST" action="?/starters" class="starters">
			<button class="btn btn-ghost small">{t('templates.addMissing')}</button>
		</form>
	{/if}
</main>

<style>
	main { max-width: 880px; padding-block: var(--s5) var(--s6); display: flex; flex-direction: column; gap: var(--s3); }
	.intro { font-size: 13px; margin: 0; }
	.row { display: flex; align-items: center; gap: 10px; padding: var(--card-pad); }
	.nm { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
	.prev { font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.edit { padding: var(--card-pad); display: flex; flex-direction: column; gap: 8px; }
	.btns { display: flex; gap: 8px; margin-top: 8px; }
	.danger { color: var(--danger); }
	.empty { padding: 24px; text-align: center; display: flex; flex-direction: column; gap: 10px; align-items: center; }
	.hint { font-size: 12.5px; margin: 0 0 2px; }
	.hint :global(code) { background: var(--surface-2); padding: 1px 5px; border-radius: 4px; font-size: 12px; }
	.starters { text-align: center; }
	a.btn { text-decoration: none; color: inherit; }
	@media (max-width: 767px) {
		main { padding-block: var(--s3) var(--s5); }
		/* Numele trece pe randul lui: altfel e strivit de cele trei actiuni si se
		   rupe in trei linii. */
		.row { flex-wrap: wrap; gap: 6px 10px; }
		.nm { flex: 1 0 100%; }
	}
</style>

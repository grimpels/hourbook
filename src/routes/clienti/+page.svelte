<script lang="ts">
	import AppBar from '$lib/components/AppBar.svelte';
	import Rich from '$lib/components/Rich.svelte';
	import { invalidateAll } from '$app/navigation';
	import { PALETTE } from '$lib/colors';
	import RichText from '$lib/components/RichText.svelte';
	import { DEFAULT_COLUMNS } from '$lib/docbody';
	import { useI18n } from '$lib/i18n/context';
	import { errorText } from '$lib/http';
	import type { Key } from '$lib/i18n';
	import type { Client, Project } from '$lib/types';

	let { data } = $props();
	const i18n = useI18n();
	const { t } = i18n;

	let clients = $state<Client[]>(data.clients);
	let projects = $state<Project[]>(data.projects);
	let open = $state<string | null>(null);
	let editingDoc = $state<number | null>(null);
	let body = $state('');
	let header = $state('');
	let footer = $state('');
	let email = $state('');
	let templates = $state(data.templates);
	let saveAsName = $state('');
	let showLegacy = $state(false);
	let saving = $state(false);
	let saved = $state<number | null>(null);
	let docError = $state('');

	// O singura fisa deschisa odata, fie de client fie de proiect: cheia are si
	// tipul, altfel un client si un proiect cu acelasi id s-ar deschide impreuna.
	let editingKind = $state<'client' | 'project'>('client');

	function openDoc(kind: 'client' | 'project', item: Client | Project) {
		if (editingDoc === item.id && editingKind === kind) { editingDoc = null; return; }
		editingDoc = item.id;
		editingKind = kind;
		header = item.doc_header ?? '';
		footer = item.doc_footer ?? '';
		email = item.doc_email ?? '';
		// Documentele scrise inainte de sabloane (antet + subsol) se ridica in
		// corp la prima deschidere, ca sa existe un singur loc de editat.
		body = item.doc_body ?? (header || footer ? `${header}\n<p>{raport}</p>\n${footer}` : '');
		showLegacy = false;
		saveAsName = '';
		docError = '';
	}

	async function importTemplate(id: string) {
		const tpl = templates.find((x) => String(x.id) === id);
		if (!tpl) return;
		if (body.trim() && !confirm(t('clients.confirmReplace', { name: tpl.name }))) return;
		body = tpl.body;
	}

	async function saveAsTemplate() {
		const name = saveAsName.trim();
		if (!name) return;
		const res = await fetch('/api/sabloane', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name, body })
		});
		if (res.ok) {
			templates = await res.json();
			saveAsName = '';
			await invalidateAll();
		} else docError = await errorText(res);
	}

	const isEditing = (kind: 'client' | 'project', id: number) =>
		editingDoc === id && editingKind === kind;

	async function saveDoc(kind: 'client' | 'project', id: number) {
		saving = true;
		docError = '';
		const res = await fetch('/api/refs', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			// Antetul/subsolul se golesc: corpul le inlocuieste si le contine deja.
			body: JSON.stringify({ kind, id, doc: { body, header: '', footer: '', email } })
		});
		saving = false;
		if (!res.ok) { docError = await errorText(res); return; }
		const fresh = await res.json();
		clients = fresh.clients;
		projects = fresh.projects;
		editingDoc = null;
		saved = id;
		setTimeout(() => (saved = null), 2500);
		await invalidateAll();
	}

	$effect(() => {
		clients = data.clients;
		projects = data.projects;
		templates = data.templates;
	});

	async function pick(kind: 'client' | 'project', id: number, color: string | null) {
		open = null;
		const res = await fetch('/api/refs', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ kind, id, color })
		});
		if (res.ok) {
			const fresh = await res.json();
			clients = fresh.clients;
			projects = fresh.projects;
			await invalidateAll();
		}
	}

	function projectsOf(clientId: number | null) {
		return projects.filter((p) => p.client_id === clientId);
	}

	let orphanProjects = $derived(projects.filter((p) => p.client_id === null));

	const colorName = (key: string) => t(`color.${key}` as Key);
	let placeholders = $derived(i18n.placeholders());
	// Semnul tabelului si un exemplu de coloane, in limba utilizatorului.
	let raportTok = $derived(i18n.prefs.lang === 'en' ? '{report}' : '{raport}');
	let exemplu = $derived(
		`${raportTok.slice(0, -1)}: ${DEFAULT_COLUMNS.map((c) => i18n.col(c)).join(', ')}}`
	);
	let hintMarks = $derived({
		token: ['code', raportTok] as ['code', string],
		example: ['code', exemplu] as ['code', string]
	});
</script>

<svelte:head><title>{t('nav.clients')} · Hourbook</title></svelte:head>

<AppBar titlu={t('clients.title')}>
	{#snippet actiuni()}
		<a class="btn small" href="/sabloane">{t('templates.title')}</a>
	{/snippet}
</AppBar>

<main class="container">
	<p class="muted intro">{t('clients.intro')}</p>

	{#if clients.length === 0 && orphanProjects.length === 0}
		<p class="muted empty">{t('clients.empty')}</p>
	{/if}

	{#each clients as c (c.id)}
		<section class="card">
			<div class="row">
				<span class="sw" style:background="var(--c-{c.color ?? 'implicit'}-line)"></span>
				<strong class="nm">{c.name}</strong>
				<button class="btn btn-ghost small" onclick={() => (open = open === 'c' + c.id ? null : 'c' + c.id)}>
					{t('clients.color')}
				</button>
				<button class="btn btn-ghost small" onclick={() => openDoc('client', c)}>
					{isEditing('client', c.id) ? t('common.close') : t('clients.document')}
				</button>
				{#if c.doc_header || c.doc_footer || c.doc_email}<span class="has">{t('clients.hasDoc')}</span>{/if}
				{#if saved === c.id}<span class="okmark">{t('clients.saved')}</span>{/if}
			</div>

			{#if isEditing('client', c.id)}
				<div class="doc">
					{#if docError}<div class="error">{docError}</div>{/if}

					<div class="tpl">
						<label for="tc{c.id}">{t('clients.template')}</label>
						<select id="tc{c.id}" onchange={(e) => importTemplate(e.currentTarget.value)}>
							<option value="">{t('clients.import')}</option>
							{#each templates as tp}<option value={tp.id}>{tp.name}</option>{/each}
						</select>
						<input type="text" bind:value={saveAsName} placeholder={t('clients.saveAsPh')} />
						<button class="btn small" onclick={saveAsTemplate} disabled={!saveAsName.trim()}>
							{t('clients.saveTemplate')}
						</button>
						<a class="btn btn-ghost small" href="/sabloane">{t('clients.viewTemplates')}</a>
					</div>

					<label for="bc{c.id}">{t('clients.body')}</label>
					<p class="muted hint"><Rich text={t('clients.hint')} marks={hintMarks} /></p>
					<RichText id="bc{c.id}" bind:value={body} {placeholders} />

					<label for="ec{c.id}">{t('clients.email')}</label>
					<input id="ec{c.id}" type="email" bind:value={email} placeholder="contact@client.ro" />

					<div class="docbtns">
						<button class="btn btn-primary small" onclick={() => saveDoc('client', c.id)} disabled={saving}>
							{saving ? t('common.saving') : t('clients.saveDoc')}
						</button>
						<a class="btn small" href="/raport?client={encodeURIComponent(c.name)}" target="_blank">{t('clients.viewReport')}</a>
					</div>
				</div>
			{/if}
			{#if open === 'c' + c.id}
				<div class="palette">
					{#each PALETTE as p}
						<button class="chip" class:on={c.color === p.key} title={colorName(p.key)}
							style:background="var(--c-{p.key}-bg)" style:border-color="var(--c-{p.key}-line)"
							onclick={() => pick('client', c.id, p.key)} aria-label={colorName(p.key)}></button>
					{/each}
					<button class="btn btn-ghost small" onclick={() => pick('client', c.id, null)}>{t('clients.default')}</button>
				</div>
			{/if}

			{#each projectsOf(c.id) as p (p.id)}
				<div class="row sub">
					<span class="sw" style:background="var(--c-{p.color ?? c.color ?? 'implicit'}-line)"></span>
					<span class="nm">{p.name}</span>
					<button class="btn btn-ghost small" onclick={() => (open = open === 'p' + p.id ? null : 'p' + p.id)}>
						{t('clients.color')}
					</button>
					<button class="btn btn-ghost small" onclick={() => openDoc('project', p)}>
						{isEditing('project', p.id) ? t('common.close') : t('clients.document')}
					</button>
					{#if p.doc_header || p.doc_footer || p.doc_email}<span class="has">{t('clients.hasDoc')}</span>{/if}
					{#if saved === p.id && editingKind === 'project'}<span class="okmark">{t('clients.saved')}</span>{/if}
				</div>

				{#if isEditing('project', p.id)}
					<div class="doc sub">
					{#if docError}<div class="error">{docError}</div>{/if}
					<p class="muted inherit">
						<Rich text={t('clients.inherit')} marks={{ name: ['em', c.name] }} />
					</p>
					<div class="tpl">
						<label for="tp{p.id}">{t('clients.template')}</label>
						<select id="tp{p.id}" onchange={(e) => importTemplate(e.currentTarget.value)}>
							<option value="">{t('clients.import')}</option>
							{#each templates as tp}<option value={tp.id}>{tp.name}</option>{/each}
						</select>
						<input type="text" bind:value={saveAsName} placeholder={t('clients.saveAsPh')} />
						<button class="btn small" onclick={saveAsTemplate} disabled={!saveAsName.trim()}>
							{t('clients.saveTemplate')}
						</button>
						<a class="btn btn-ghost small" href="/sabloane">{t('clients.viewTemplates')}</a>
					</div>

					<label for="bp{p.id}">{t('clients.body')}</label>
					<p class="muted hint"><Rich text={t('clients.hint')} marks={hintMarks} /></p>
					<RichText id="bp{p.id}" bind:value={body} {placeholders} />

					<label for="ep{p.id}">{t('clients.email')}</label>
					<input id="ep{p.id}" type="email" bind:value={email} placeholder={c.doc_email || "contact@client.ro"} />

					<div class="docbtns">
						<button class="btn btn-primary small" onclick={() => saveDoc('project', p.id)} disabled={saving}>
							{saving ? t('common.saving') : t('clients.saveDoc')}
						</button>
						<a class="btn small" href="/raport?client={encodeURIComponent(c.name)}&project={encodeURIComponent(p.name)}" target="_blank">{t('clients.viewReport')}</a>
					</div>
				</div>
				{/if}
				{#if open === 'p' + p.id}
					<div class="palette sub">
						{#each PALETTE as q}
							<button class="chip" class:on={p.color === q.key} title={colorName(q.key)}
								style:background="var(--c-{q.key}-bg)" style:border-color="var(--c-{q.key}-line)"
								onclick={() => pick('project', p.id, q.key)} aria-label={colorName(q.key)}></button>
						{/each}
						<button class="btn btn-ghost small" onclick={() => pick('project', p.id, null)}>
							{t('clients.asClient')}
						</button>
					</div>
				{/if}
			{/each}
		</section>
	{/each}

	{#if orphanProjects.length}
		<section class="card">
			<div class="row"><strong class="nm">{t('clients.orphans')}</strong></div>
			{#each orphanProjects as p (p.id)}
				<div class="row sub">
					<span class="sw" style:background="var(--c-{p.color ?? 'implicit'}-line)"></span>
					<span class="nm">{p.name}</span>
					<button class="btn btn-ghost small" onclick={() => (open = open === 'p' + p.id ? null : 'p' + p.id)}>
						{t('clients.change')}
					</button>
				</div>
				{#if open === 'p' + p.id}
					<div class="palette sub">
						{#each PALETTE as q}
							<button class="chip" class:on={p.color === q.key} title={colorName(q.key)}
								style:background="var(--c-{q.key}-bg)" style:border-color="var(--c-{q.key}-line)"
								onclick={() => pick('project', p.id, q.key)} aria-label={colorName(q.key)}></button>
						{/each}
						<button class="btn btn-ghost small" onclick={() => pick('project', p.id, null)}>{t('clients.default')}</button>
					</div>
				{/if}
			{/each}
		</section>
	{/if}
</main>

<style>
	main { max-width: 780px; padding-block: var(--s5) var(--s6); display: flex; flex-direction: column; gap: var(--s3); }
	.intro { font-size: 13px; margin: 0; }
	section { padding: var(--card-pad); }
	.row { display: flex; align-items: center; gap: 10px; }
	.row.sub { padding-left: 22px; margin-top: 8px; border-top: 1px solid var(--border); padding-top: 8px; }
	.nm { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
	.sw { width: 12px; height: 12px; border-radius: 3px; flex: 0 0 auto; }
	.palette { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 10px; }
	.palette.sub { padding-left: 22px; }
	.chip {
		width: 26px; height: 26px; border-radius: 6px; cursor: pointer;
		border: 2px solid;
	}
	.chip.on { outline: 2px solid var(--text); outline-offset: 2px; }
	.empty { padding: 30px; text-align: center; }
	.doc { display: flex; flex-direction: column; gap: 6px; margin-top: 12px;
		padding-top: 12px; border-top: 1px solid var(--border); }
	.doc.sub { padding-left: 22px; }
	.inherit { font-size: 12.5px; margin: 0 0 4px; }
	.has {
		font-size: var(--text-xs);
		color: var(--accent);
		border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
		border-radius: 4px;
		padding: 1px 5px;
	}
	.doc label { margin-top: 6px; }
	.docbtns { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
	.tpl { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
	.tpl select { flex: 1 1 200px; width: auto; }
	.tpl input { flex: 1 1 180px; width: auto; }
	.hint { font-size: 12.5px; margin: 0 0 2px; }
	.hint :global(code) { background: var(--surface-2); padding: 1px 5px; border-radius: 4px; font-size: 12px; }
	.okmark { font-size: 12px; color: var(--accent); }
	a.btn { text-decoration: none; color: inherit; }
	@media (max-width: 767px) { main { padding-block: var(--s3) var(--s5); } }
</style>

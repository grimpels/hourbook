<script lang="ts">
	// Bara de sus, aceeasi pe toate paginile, dar cu doua moduri:
	//
	//   Pe ecran lat — antet clasic: marca si sectiunile vizibile pe un rand,
	//   tema si iesirea in dreapta; dedesubt randul paginii (perioada, titlul,
	//   controalele).
	//
	//   Pe telefon — un singur rand cu titlul si un buton de meniu, care tine
	//   sectiunile, tema si iesirea. Altfel bara ar manca un sfert din ecran:
	//   inainte de schimbarea asta avea 229 px dintr-un ecran de 844.
	//
	// Regula de asezare ramane: identitate si navigare intai, controalele si
	// actiunile paginii pe randul urmator.
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { useI18n } from '$lib/i18n/context';

	type Props = {
		titlu: string;
		/** Inaintea titlului: navigarea intre perioade. */
		inainte?: Snippet;
		/** Actiunile paginii, aliniate la dreapta pe randul titlului. */
		actiuni?: Snippet;
		/** Randul de dedesubt: vizualizari, filtre. */
		subtitlu?: Snippet;
	};
	let { titlu, inainte, actiuni, subtitlu }: Props = $props();
	const { t } = useI18n();

	let sectiuni = $derived([
		{ href: '/', text: t('nav.home') },
		{ href: '/raport', text: t('nav.report') },
		{ href: '/clienti', text: t('nav.clients') },
		{ href: '/sabloane', text: t('nav.templates') },
		{ href: '/setari', text: t('nav.settings') }
	]);

	let cale = $derived(page.url.pathname);
	const activ = (href: string) => (href === '/' ? cale === '/' : cale.startsWith(href));

	type Theme = 'system' | 'light' | 'dark';
	let theme = $state<Theme>('system');
	let deschis = $state(false);
	let meniu: HTMLDivElement | undefined = $state();

	$effect(() => {
		const v = document.cookie.match(/(?:^|; )pontaj_theme=([^;]*)/)?.[1];
		theme = v === 'light' || v === 'dark' ? v : 'system';
	});

	const NEXT: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };
	const TEMA = { system: 'theme.system', light: 'theme.light', dark: 'theme.dark' } as const;
	let tema = $derived(t(TEMA[theme]));

	function schimbaTema() {
		theme = NEXT[theme];
		document.cookie = `pontaj_theme=${theme === 'system' ? '' : theme}; path=/; max-age=${
			theme === 'system' ? 0 : 31536000
		}; samesite=lax`;
		const root = document.documentElement;
		if (theme === 'system') root.removeAttribute('data-theme');
		else root.setAttribute('data-theme', theme);
	}

	function inafara(e: MouseEvent) {
		if (deschis && meniu && !meniu.contains(e.target as Node)) deschis = false;
	}
</script>

<svelte:window onclick={inafara} onkeydown={(e) => e.key === 'Escape' && (deschis = false)} />

<header class="bar no-print">
	<div class="fundal-nav">
	<div class="container rand-nav">
		<a class="brand" href="/">{t('nav.brand')}</a>
		<nav>
			{#each sectiuni.slice(1) as s}
				<a href={s.href} class:activ={activ(s.href)}>{s.text}</a>
			{/each}
		</nav>
		<div class="util">
			<button class="btn btn-ghost ic" onclick={schimbaTema} title={t('theme.title', { name: tema })}
				aria-label={t('theme.title', { name: tema })}>
				{#if theme === 'light'}
					<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" />
						<path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" /></svg>
				{:else if theme === 'dark'}
					<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" /></svg>
				{:else}
					<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" />
						<path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none" /></svg>
				{/if}
			</button>
			<form method="POST" action="/logout">
				<button class="btn btn-ghost ic" title={t('nav.logout')} aria-label={t('nav.logout')}>
					<svg viewBox="0 0 24 24" aria-hidden="true">
						<path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15" />
						<path d="M10 8l-4 4 4 4M6 12h9" /></svg>
				</button>
			</form>
		</div>
	</div>
	</div>

	<div class="container rand-pagina">
		{#if inainte}<div class="inainte">{@render inainte()}</div>{/if}
		<h1>{titlu}</h1>
		{#if actiuni}<div class="actiuni">{@render actiuni()}</div>{/if}

		<div class="meniu" bind:this={meniu}>
			<button class="btn ic" onclick={() => (deschis = !deschis)} aria-expanded={deschis}
				aria-haspopup="true" aria-label={t('nav.menu')} title={t('nav.menu')}>
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
			</button>

			{#if deschis}
				<ul>
					{#each sectiuni as s}
						<li><a href={s.href} class:activ={activ(s.href)}>{s.text}</a></li>
					{/each}
					<li class="sep">
						<button type="button" onclick={schimbaTema}>{t('theme.label')} <span class="val">{tema}</span></button>
					</li>
					<li><form method="POST" action="/logout"><button type="submit">{t('nav.logout')}</button></form></li>
				</ul>
			{/if}
		</div>

		<!-- Rupere de rand explicita pentru telefon. Fara ea, asezarea depindea de
		     cat de lat e titlul: pe pagina de raport butonul de meniu ajungea la
		     mijlocul randului, iar lista lui iesea din ecran spre stanga. -->
		<div class="rupere" aria-hidden="true"></div>
		{#if subtitlu}<div class="subtitlu">{@render subtitlu()}</div>{/if}
	</div>
</header>

<style>
	/* Linia de sub navigare merge de la margine la margine; continutul ei sta in
	   acelasi container ca restul paginii, deci marginile se aliniaza pe verticala. */
	.fundal-nav { border-bottom: 1px solid var(--border); }
	.rand-nav {
		display: flex;
		align-items: center;
		gap: var(--s5);
		height: 52px;
	}
	.brand { font-weight: 600; letter-spacing: -0.02em; text-decoration: none; color: inherit; }
	nav { display: flex; gap: var(--s1); flex: 1; }
	nav a {
		display: inline-flex;
		align-items: center;
		height: var(--control-h-sm);
		padding: 0 10px;
		border-radius: 6px;
		text-decoration: none;
		color: var(--text-dim);
		font-size: var(--text-md);
		font-weight: 500;
	}
	nav a:hover { background: var(--surface-2); color: var(--text); }
	/* Sectiunea curenta e marcata cu fundal, nu cu o linie sub text: linia s-ar
	   confunda cu cea care desparte randul de navigare de restul barii. */
	nav a.activ { background: var(--accent-soft); color: var(--text); }
	.util { display: flex; gap: var(--s1); }
	.util form { margin: 0; }

	.rand-pagina {
		display: flex;
		align-items: center;
		gap: var(--s2);
		flex-wrap: wrap;
		padding-block: var(--s2);
		min-height: 52px;
	}
	/* Actiunile paginii stau la dreapta, ca si uneltele din randul de navigare. */
	.actiuni { margin-left: auto; display: flex; gap: var(--s2); align-items: center; }
	.rupere { display: none; }
	.inainte { display: flex; gap: 2px; align-items: center; }
	h1 {
		font-size: var(--text-lg);
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		min-width: 0;
		flex: 1;
	}
	.subtitlu {
		width: 100%;
		display: flex;
		gap: var(--s2);
		align-items: center;
		flex-wrap: wrap;
		padding-bottom: var(--s2);
	}

	.meniu { position: relative; display: none; }
	.meniu ul {
		position: absolute;
		right: 0;
		top: calc(100% + 6px);
		z-index: 40;
		min-width: 200px;
		margin: 0;
		padding: 4px;
		list-style: none;
		background: var(--surface);
		border: 1px solid var(--border-strong);
		border-radius: 8px;
		box-shadow: var(--shadow);
	}
	.meniu li.sep { border-top: 1px solid var(--border); margin-top: 4px; padding-top: 4px; }
	.meniu a, .meniu button {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		width: 100%;
		padding: 8px 10px;
		border: 0;
		background: transparent;
		border-radius: 5px;
		text-align: left;
		text-decoration: none;
		color: inherit;
		font-size: var(--text-md);
		cursor: pointer;
	}
	.meniu a:hover, .meniu button:hover { background: var(--surface-2); }
	.meniu a.activ { color: var(--accent); }
	.meniu .val { color: var(--text-dim); font-size: var(--text-sm); }
	.meniu form { margin: 0; }

	/* Sub pragul de container (768 px) se trece pe asezarea de mobil: randul de
	   navigare dispare, sectiunile intra in butonul de meniu de langa titlu, iar
	   actiunile coboara langa controale — altfel titlul ramane fara loc si se
	   taie („01.09.20…"). */
	@media (max-width: 767px) {
		.fundal-nav { display: none; }
		.meniu { display: block; }

		/* Asezare fixa, nu dependenta de latimea titlului:
		     randul 1  [inapoi/inainte] [titlu]            [meniu]
		     randul 2  [controale]                      [actiuni] */
		.inainte { order: 1; }
		h1 { order: 2; }
		.meniu { order: 3; margin-left: auto; }
		.rupere { order: 4; display: block; width: 100%; height: 0; }
		.subtitlu { order: 5; width: auto; flex: 1 1 auto; padding-bottom: 0; }
		.actiuni { order: 6; margin-left: auto; }
		.rand-pagina { padding-block: var(--s2); row-gap: var(--s2); }
	}
</style>

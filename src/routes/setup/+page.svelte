<script lang="ts">
	// Instalarea, la prima pornire: limba si formatele, adresa site-ului, contul
	// de administrator. Dispare definitiv dupa primul cont.
	import { onMount } from 'svelte';
	import { useI18n } from '$lib/i18n/context';
	import { DATE_FORMATS, normalizePrefs, type Locale } from '$lib/prefs';
	import { formatDay, formatTime, formatDecimal } from '$lib/format';
	import { toISODay } from '$lib/time';
	let { data, form } = $props();
	const { t } = useI18n();

	let lang = $state<Locale>(data.prefs.lang);
	let dateFormat = $state(data.prefs.dateFormat);
	let clock = $state(data.prefs.hour12 ? '12' : '24');
	let weekStart = $state(String(data.prefs.weekStart));
	let decimal = $state(data.prefs.decimal);
	let origin = $state(form?.origin ?? data.fixedOrigin);
	let proxy = $state(form?.proxy ?? data.proxyHint);
	let loading = $state(false);

	// Adresa din bara browserului e cea mai buna presupunere: e exact cea pe
	// care a ajuns utilizatorul, cu https:// daca e cazul.
	onMount(() => {
		if (!origin) origin = location.origin;
	});

	// Textele paginii se schimba odata cu limba: pagina se reincarca in limba noua.
	function schimbaLimba() {
		const u = new URL(location.href);
		u.searchParams.set('lang', lang);
		location.href = u.toString();
	}

	let ales = $derived(
		normalizePrefs({ lang, dateFormat, hour12: clock === '12', weekStart: Number(weekStart), decimal }, lang)
	);
	const MOSTRA = '2026-01-31';
	let exemplu = $derived(
		`${formatDay(toISODay(new Date()), ales)} · ${formatTime(14 * 60 + 30, ales)} · ${formatDecimal(105, ales)} h`
	);
	const [inainte, dupa] = t('setup.tokenHelp').split('{cmd}');
	const [dbInainte, dbDupa] = t('setup.dbInfo').split('{path}');
</script>

<svelte:head><title>{t('setup.title')} · Hourbook</title></svelte:head>

<div class="wrap">
	<form method="POST" class="card" onsubmit={() => (loading = true)}>
		<header>
			<img class="semn" src="/favicon.svg" alt="" width="44" height="44" />
			<h1>{t('setup.title')}</h1>
			<p class="muted">{t('setup.intro')}</p>
		</header>

		{#if form?.error}<div class="error">{form.error}</div>{/if}

		{#if data.tokenOk}
			<input type="hidden" name="token" value={data.token} />
		{:else}
			<section>
				<label for="token">{t('setup.token')}</label>
				<input id="token" name="token" type="text" autocomplete="off" spellcheck="false"
					class="tabular" value={data.token} required />
				<p class="help">{inainte}<code>docker compose logs hourbook</code>{dupa}</p>
			</section>
		{/if}

		<section>
			<h2>{t('prefs.title')}</h2>
			<div class="grid">
				<div><label for="lang">{t('prefs.lang')}</label>
					<!-- Numele limbilor raman in limba lor. -->
					<select id="lang" name="lang" bind:value={lang} onchange={schimbaLimba}>
						<option value="en">English</option>
						<option value="ro">Română</option>
					</select></div>
				<div><label for="dateFormat">{t('prefs.dateFormat')}</label>
					<select id="dateFormat" name="dateFormat" bind:value={dateFormat}>
						{#each DATE_FORMATS as f}
							<option value={f}>{formatDay(MOSTRA, { ...ales, dateFormat: f })}</option>
						{/each}
					</select></div>
				<div><label for="clock">{t('prefs.clock')}</label>
					<select id="clock" name="clock" bind:value={clock}>
						<option value="24">{t('prefs.h24')}</option>
						<option value="12">{t('prefs.h12')}</option>
					</select></div>
				<div><label for="weekStart">{t('prefs.weekStart')}</label>
					<select id="weekStart" name="weekStart" bind:value={weekStart}>
						<option value="1">{t('prefs.monday')}</option>
						<option value="0">{t('prefs.sunday')}</option>
					</select></div>
				<div><label for="decimal">{t('prefs.decimal')}</label>
					<select id="decimal" name="decimal" bind:value={decimal}>
						<option value=",">{t('prefs.comma')} (1,75)</option>
						<option value=".">{t('prefs.dot')} (1.75)</option>
					</select></div>
				<p class="exemplu tabular">{t('prefs.example', { example: exemplu })}</p>
			</div>
		</section>

		<section>
			<h2>{t('setup.address')}</h2>
			<label for="origin">{t('setup.origin')}</label>
			<input id="origin" name="origin" type="text" inputmode="url" spellcheck="false"
				bind:value={origin} readonly={!!data.fixedOrigin} required />
			<p class="help">{data.fixedOrigin ? t('setup.fixedOrigin') : t('setup.originHelp')}</p>
			<div class="chk">
				<input id="proxy" name="proxy" type="checkbox" bind:checked={proxy} />
				<label for="proxy">{t('setup.proxy')}</label>
			</div>
			<p class="help">
				{#if data.proxyHint}<strong>{t('setup.proxyDetected')}</strong>{/if}
				{t('setup.proxyHelp')}
			</p>
		</section>

		<section>
			<h2>{t('setup.account')}</h2>
			<label for="username">{t('login.user')}</label>
			<input id="username" name="username" type="text" autocomplete="username" value={form?.username ?? ''} required />
			<div class="grid">
				<div><label for="password">{t('settings.password')}</label>
					<input id="password" name="password" type="password" autocomplete="new-password" minlength="10" required /></div>
				<div><label for="password2">{t('setup.password2')}</label>
					<input id="password2" name="password2" type="password" autocomplete="new-password" minlength="10" required /></div>
			</div>
			<p class="help">{t('setup.pwHelp')}</p>
		</section>

		<section>
			<h2>{t('setup.database')}</h2>
			<p class="help">{dbInainte}<code>{data.dbPath}</code>{dbDupa}</p>
		</section>

		<button class="btn btn-primary full" disabled={loading}>{t('setup.finish')}</button>
	</form>
</div>

<style>
	.wrap {
		min-height: 100vh;
		display: grid;
		place-items: start center;
		padding: var(--s6) 16px;
	}
	form {
		width: 100%;
		max-width: 560px;
		padding: 28px;
		display: flex;
		flex-direction: column;
		gap: var(--s5);
	}
	header p { margin: var(--s1) 0 0; font-size: var(--text-sm); }
	h1 { font-size: 22px; }
	.semn { display: block; margin-bottom: var(--s3); }
	h2 { font-size: var(--text-md); margin-bottom: var(--s2); }
	section { display: flex; flex-direction: column; gap: var(--s2); }
	section + section { border-top: 1px solid var(--border); padding-top: var(--s5); }
	.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-items: end; }
	.exemplu { margin: 0; font-size: var(--text-sm); color: var(--text-dim); padding-bottom: 9px; }
	.help { margin: 0; font-size: var(--text-sm); color: var(--text-dim); }
	.help code { font-size: 0.95em; }
	.chk { display: flex; align-items: center; gap: 8px; margin-top: var(--s2); }
	.chk label { margin: 0; }
	.chk input { width: auto; }
	.full { width: 100%; justify-content: center; }
	@media (max-width: 767px) {
		form { padding: 20px 16px; }
		.grid { grid-template-columns: 1fr; }
		.exemplu { padding-bottom: 0; }
	}
</style>

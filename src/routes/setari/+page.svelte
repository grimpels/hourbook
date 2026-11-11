<script lang="ts">
	import AppBar from '$lib/components/AppBar.svelte';
	import Rich from '$lib/components/Rich.svelte';
	import { useI18n } from '$lib/i18n/context';
	import type { Key } from '$lib/i18n';
	import { DATE_FORMATS, normalizePrefs, type Locale } from '$lib/prefs';
	import { formatDay, formatTime, formatDecimal } from '$lib/format';
	import { toISODay } from '$lib/time';
	let { data, form } = $props();
	const i18n = useI18n();
	const { t } = i18n;

	function când(at: number): string {
		const s = Math.round((Date.now() - at) / 1000);
		if (s < 60) return t('settings.ago', { t: s + 's' });
		if (s < 3600) return t('settings.ago', { t: Math.round(s / 60) + 'm' });
		return t('settings.ago', { t: Math.round(s / 3600) + 'h' });
	}

	function durata(sec: number): string {
		const m = Math.ceil(sec / 60);
		return m < 60 ? m + ' min' : Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
	}

	// `sent_at` e scris de SQLite in UTC („2026-09-10 08:00:00"); se arata in ora locala.
	function trimisLa(sentAt: string): string {
		const d = new Date(sentAt.replace(' ', 'T') + 'Z');
		if (Number.isNaN(d.getTime())) return sentAt;
		return `${i18n.day(toISODay(d))} ${i18n.time(d.getHours() * 60 + d.getMinutes())}`;
	}

	// --- Limba si formatul: alegerea se vede pe loc, inainte de salvare ---------
	let lang = $state<Locale>(data.prefs.lang);
	let dateFormat = $state(data.prefs.dateFormat);
	let clock = $state(data.prefs.hour12 ? '12' : '24');
	let weekStart = $state(String(data.prefs.weekStart));
	let decimal = $state(data.prefs.decimal);

	$effect(() => {
		lang = data.prefs.lang;
		dateFormat = data.prefs.dateFormat;
		clock = data.prefs.hour12 ? '12' : '24';
		weekStart = String(data.prefs.weekStart);
		decimal = data.prefs.decimal;
	});

	let ales = $derived(
		normalizePrefs(
			{ lang, dateFormat, hour12: clock === '12', weekStart: Number(weekStart), decimal },
			lang
		)
	);
	// Ziua 31 face formatele neechivoce: 31/01 nu se poate citi ca luna 31.
	const MOSTRA = '2026-01-31';
	let exemplu = $derived(
		`${formatDay(toISODay(new Date()), ales)} · ${formatTime(14 * 60 + 30, ales)} · ${formatDecimal(105, ales)} h`
	);
</script>

<svelte:head><title>{t('nav.settings')} · Pontaj</title></svelte:head>

<AppBar titlu={t('nav.settings')}>
</AppBar>

<main class="container">
	{#if form?.error}<div class="error">{form.error}</div>{/if}
	{#if form?.passwordChanged}<div class="ok">{t('settings.passwordChanged')}</div>{/if}
	{#if form?.enabled}<div class="ok">{t('settings.2faOn')}</div>{/if}
	{#if form?.disabled}<div class="ok">{t('settings.2faOff')}</div>{/if}
	{#if form?.providerSaved}<div class="ok">{t('settings.providerSaved')}</div>{/if}
	{#if form?.smtpSaved}<div class="ok">{t('settings.smtpSaved')}</div>{/if}
	{#if form?.testSent}<div class="ok">{t('settings.testSent', { to: form.testSent })}</div>{/if}
	{#if form?.scheduleSaved}<div class="ok">{t('settings.scheduleSaved')}</div>{/if}
	{#if form?.prefsSaved}<div class="ok">{t('settings.prefsSaved')}</div>{/if}
	{#if form?.unlocked !== undefined}
		<div class="ok">
			{form.unlocked ? t('settings.unlocked', { n: form.unlocked }) : t('settings.nothingLocked')}
		</div>
	{/if}

	<section class="card">
		<h2>{t('settings.account')}</h2>
		<p class="muted">
			<Rich text={t('settings.userLine', { n: data.sessions })}
				marks={{ user: ['strong', data.user?.username ?? ''] }} />
		</p>
		<form method="POST" action="?/revoke">
			<button class="btn">{t('settings.revoke')}</button>
		</form>
	</section>

	<section class="card">
		<h2>{t('prefs.title')}</h2>
		<form method="POST" action="?/prefs" class="grid">
			<div class="f2"><label for="lang">{t('prefs.lang')}</label>
				<!-- Numele limbilor raman in limba lor: asa le gaseste si cine nu intelege limba curenta. -->
				<select id="lang" name="lang" bind:value={lang}>
					<option value="ro">Română</option>
					<option value="en">English</option>
				</select></div>
			<div class="f2"><label for="dateFormat">{t('prefs.dateFormat')}</label>
				<select id="dateFormat" name="dateFormat" bind:value={dateFormat}>
					{#each DATE_FORMATS as f}
						<option value={f}>{formatDay(MOSTRA, { ...ales, dateFormat: f })}</option>
					{/each}
				</select></div>
			<div class="f2"><label for="clock">{t('prefs.clock')}</label>
				<select id="clock" name="clock" bind:value={clock}>
					<option value="24">{t('prefs.h24')}</option>
					<option value="12">{t('prefs.h12')}</option>
				</select></div>
			<div class="f2"><label for="weekStart">{t('prefs.weekStart')}</label>
				<select id="weekStart" name="weekStart" bind:value={weekStart}>
					<option value="1">{t('prefs.monday')}</option>
					<option value="0">{t('prefs.sunday')}</option>
				</select></div>
			<div class="f2"><label for="decimal">{t('prefs.decimal')}</label>
				<select id="decimal" name="decimal" bind:value={decimal}>
					<option value=",">{t('prefs.comma')} (1,75)</option>
					<option value=".">{t('prefs.dot')} (1.75)</option>
				</select></div>
			<p class="f2 exemplu tabular">{t('prefs.example', { example: exemplu })}</p>
			<p class="f4 muted note">
				<Rich text={t('prefs.note')}
					marks={{ a: ['code', i18n.ph('data')], b: ['code', i18n.ph('perioada')] }} />
			</p>
			<div class="f4"><button class="btn btn-primary">{t('common.save')}</button></div>
		</form>
	</section>

	<section class="card">
		<h2>{t('settings.password')}</h2>
		<form method="POST" action="?/password" class="stack">
			<div><label for="cur">{t('settings.currentPw')}</label>
				<input id="cur" name="current" type="password" autocomplete="current-password" required /></div>
			<div><label for="new">{t('settings.newPw')}</label>
				<input id="new" name="next" type="password" autocomplete="new-password" minlength="10" required /></div>
			<button class="btn btn-primary">{t('settings.changePw')}</button>
		</form>
	</section>

	<section class="card">
		<h2>{t('settings.provider')}</h2>
		<p class="muted note">
			<Rich text={t('settings.providerNote')} marks={{
				a: ['code', i18n.ph('firma')],
				b: ['code', i18n.ph('reprezentant')],
				c: ['code', i18n.ph('cui')],
				d: ['code', i18n.ph('adresa')]
			}} />
		</p>
		<form method="POST" action="?/provider" class="grid">
			<div class="f2"><label for="firma">{t('settings.firma')}</label>
				<input id="firma" name="firma" value={data.provider.firma} placeholder={t('settings.firmaPh')} /></div>
			<div class="f2"><label for="repr">{t('settings.repr')}</label>
				<input id="repr" name="reprezentant" value={data.provider.reprezentant}
					placeholder={t('settings.reprPh')} /></div>
			<div class="f2"><label for="cui">{t('settings.cui')}</label>
				<input id="cui" name="cui" value={data.provider.cui} placeholder="RO12345678" /></div>
			<div class="f2"><label for="adr">{t('settings.address')}</label>
				<input id="adr" name="adresa" value={data.provider.adresa} /></div>
			<div class="f4"><button class="btn btn-primary">{t('common.save')}</button></div>
		</form>
	</section>

	<section class="card">
		<h2>{t('settings.mail')}</h2>
		<p class="muted note">{t('settings.smtpNote')}</p>
		<form method="POST" action="?/smtp" class="grid">
			<div class="f2"><label for="host">{t('settings.host')}</label>
				<input id="host" name="host" value={data.smtp.host} placeholder="smtp.example.com" /></div>
			<div><label for="port">{t('settings.port')}</label>
				<input id="port" name="port" type="number" value={data.smtp.port} /></div>
			<div class="chk">
				<label for="secure">{t('settings.tls')}</label>
				<input id="secure" name="secure" type="checkbox" checked={data.smtp.secure} />
			</div>
			<div class="f2"><label for="user">{t('settings.smtpUser')}</label>
				<input id="user" name="user" value={data.smtp.user} autocomplete="off" /></div>
			<div class="f2"><label for="pass">{t('settings.password')} {data.smtpSet ? t('settings.keepPass') : ''}</label>
				<input id="pass" name="pass" type="password" autocomplete="new-password" /></div>
			<div class="f4"><label for="from">{t('settings.from')}</label>
				<input id="from" name="from" value={data.smtp.from} placeholder="Pontaj &lt;pontaj@example.com&gt;" /></div>
			<div class="f4"><button class="btn btn-primary">{t('settings.saveSmtp')}</button></div>
		</form>

		{#if data.smtpSet}
			<form method="POST" action="?/testMail" class="inline">
				<input name="to" type="email" placeholder={t('settings.testPh')} required />
				<button class="btn small">{t('settings.sendTest')}</button>
			</form>
		{/if}
	</section>

	<section class="card">
		<h2>{t('settings.auto')}</h2>
		{#if !data.smtpSet}
			<p class="muted">{t('settings.smtpFirst')}</p>
		{:else}
			<form method="POST" action="?/schedule" class="grid">
				<div class="f4 chk">
					<label for="enabled">{t('settings.autoEnable')}</label>
					<input id="enabled" name="enabled" type="checkbox" checked={data.schedule.enabled} />
				</div>
				<div class="f2"><label for="frequency">{t('settings.frequency')}</label>
					<select id="frequency" name="frequency" value={data.schedule.frequency}>
						<option value="lunar">{t('settings.monthly')}</option>
						<option value="saptamanal">{t('settings.weekly')}</option>
					</select></div>
				<div><label for="day">{t('settings.day')}</label>
					<input id="day" name="day" type="number" min="1" max="28" value={data.schedule.day} /></div>
				<div><label for="hour">{t('settings.hour')}</label>
					<input id="hour" name="hour" type="number" min="0" max="23" value={data.schedule.hour} /></div>
				<div class="f4"><button class="btn btn-primary">{t('settings.saveSchedule')}</button></div>
			</form>
			<p class="muted note">
				{t('settings.dayNote')}
				{#if data.recipients.length}
					{t('settings.recipients', { names: data.recipients.map((r) => r.name).join(', ') })}
				{:else}
					<Rich text={t('settings.noRecipients')}
						marks={{ a: ['strong', t('settings.noRecipientsStrong')] }} />
				{/if}
			</p>
		{/if}

		{#if data.sends.length}
			<details>
				<summary>{t('settings.recentSends', { n: data.sends.length })}</summary>
				<ul class="recent">
					{#each data.sends as s}
						<li class:locked={!s.ok}>
							<span class="tabular t">{trimisLa(s.sent_at)}</span>
							<span>{s.client_name || t('report.allClientsLower')} → {s.recipient}</span>
							<span class="scope">{t(`settings.kind.${s.kind}` as Key)}</span>
							{#if !s.ok}<span class="tag">{s.detail}</span>{/if}
						</li>
					{/each}
				</ul>
			</details>
		{/if}
	</section>

	<section class="card">
		<h2>{t('settings.locks')}</h2>
		<p class="muted note">{t('settings.locksNote')}</p>

		{#if data.locks.length === 0}
			<p class="muted">{t('settings.noLocks')}</p>
		{:else}
			<ul class="locks">
				{#each data.locks as l (l.key)}
					<li>
						<div class="who">
							<code>{l.network}</code>
							{#if l.username}<span class="usr">→ {l.username}</span>{/if}
							<span class="scope">{t(`settings.scope.${l.scope}` as Key)}</span>
						</div>
						<span class="left tabular">{t('settings.left', { time: durata(l.remainingSec) })}</span>
						<form method="POST" action="?/deblocheaza">
							<input type="hidden" name="key" value={l.key} />
							<button class="btn small">{t('settings.unlock')}</button>
						</form>
					</li>
				{/each}
			</ul>
			<form method="POST" action="?/deblocheazaTot">
				<button class="btn small">{t('settings.unlockAll')}</button>
			</form>
		{/if}

		{#if data.recent.length}
			<details>
				<summary>{t('settings.recentFails', { n: data.recent.length })}</summary>
				<ul class="recent">
					{#each data.recent as r}
						<li class:locked={r.locked}>
							<span class="tabular t">{când(r.at)}</span>
							<code>{r.ip}</code>
							<span class="usr">{r.username || '—'}</span>
							{#if r.locked}<span class="tag">{t('settings.triggered')}</span>{/if}
						</li>
					{/each}
				</ul>
			</details>
		{/if}
	</section>

	<section class="card">
		<h2>{t('settings.2fa')}</h2>
		{#if data.totpEnabled}
			<p class="muted">{t('settings.2faActive')}</p>
			<form method="POST" action="?/disable2fa" class="stack">
				<div><label for="pw">{t('settings.password')}</label><input id="pw" name="password" type="password" required /></div>
				<button class="btn btn-danger">{t('settings.disable')}</button>
			</form>
		{:else if form?.qr}
			<p class="muted">{t('settings.scan')}</p>
			<img src={form.qr} alt={t('settings.qrAlt')} />
			<p class="secret"><Rich text={t('settings.manualKey')} marks={{ key: ['code', form.secret] }} /></p>
			<form method="POST" action="?/confirm2fa" class="stack">
				<div><label for="code">{t('settings.appCode')}</label>
					<input id="code" name="code" inputmode="numeric" maxlength="6" pattern="[0-9]{6}"
						class="tabular" required /></div>
				<button class="btn btn-primary">{t('settings.confirm2fa')}</button>
			</form>
		{:else}
			<p class="muted">{t('settings.2faInactive')}</p>
			<form method="POST" action="?/start2fa">
				<button class="btn btn-primary">{t('settings.enable')}</button>
			</form>
		{/if}
	</section>
</main>

<style>
	main { max-width: 660px; padding-block: var(--s5) var(--s6); display: flex; flex-direction: column; gap: var(--s4); }
	section { padding: var(--card-pad); display: flex; flex-direction: column; gap: 12px; }

	.stack { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
	.stack div { width: 100%; }
	img { border-radius: 6px; background: #fff; padding: 8px; width: 220px; }
	.secret { font-size: 13px; }
	.secret :global(code) { background: var(--surface); border: 1px solid var(--border);
		padding: 1px 5px; border-radius: 4px; font-size: 12.5px; word-break: break-all; }
	.exemplu { margin: 0; align-self: end; padding-bottom: 8px; font-size: 13px; color: var(--text-dim); }
	code { background: var(--surface-2); padding: 2px 6px; border-radius: 4px; word-break: break-all; }
	a.btn { text-decoration: none; color: inherit; }

	.note { font-size: 13px; margin: -4px 0 0; }
	.note :global(code) { border: 1px solid var(--border); word-break: break-all; background: var(--surface-2); padding: 1px 5px; border-radius: 4px; font-size: 12px; }
	.grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; align-items: end; }
	.grid .f2 { grid-column: span 2; }
	.grid .f4 { grid-column: span 4; }
	.chk { display: flex; align-items: center; gap: 8px; }
	.chk label { margin: 0; }
	.chk input { width: auto; }
	.inline { display: flex; gap: 8px; align-items: center; margin-top: 12px; }
	.inline input { flex: 1; }
	@media (max-width: 767px) {
		.grid { grid-template-columns: repeat(2, 1fr); }
		.grid .f2, .grid .f4 { grid-column: span 2; }
	}
	.locks { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
	.locks li {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
		padding: 8px 10px;
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: 6px;
	}
	.who { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; flex: 1; min-width: 0; }
	.usr { font-size: 13px; }
	.scope { font-size: var(--text-xs); color: var(--text-faint); }
	.left { font-size: 13px; color: var(--text-dim); }
	code { background: var(--surface); border: 1px solid var(--border); padding: 1px 5px;
		border-radius: 4px; font-size: 12.5px; word-break: break-all; }
	details { margin-top: 4px; }
	summary { cursor: pointer; font-size: 13px; color: var(--text-dim); }
	.recent { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
	.recent li { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; font-size: 12.5px; }
	.recent .t { color: var(--text-faint); min-width: 62px; }
	.recent li.locked .tag {
		font-size: 11px;
		background: color-mix(in srgb, var(--danger) 12%, transparent);
		color: var(--danger);
		padding: 1px 6px;
		border-radius: 4px;
	}
	@media (max-width: 767px) {
		main { padding-block: var(--s3) var(--s5); }
		.locks li { gap: 6px; }
	}
</style>

<script lang="ts">
	import { enhance } from '$app/forms';
	import { useI18n } from '$lib/i18n/context';
	let { form } = $props();
	const { t } = useI18n();
	let loading = $state(false);
</script>

<svelte:head><title>{t('login.title')} · Pontaj</title></svelte:head>

<div class="wrap">
	<form
		method="POST"
		class="card"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				await update();
				loading = false;
			};
		}}
	>
		<h1>{t('app.name')}</h1>
		<p class="muted sub">{t('login.title')}</p>

		{#if form?.error}<div class="error">{form.error}</div>{/if}

		<div class="field">
			<label for="username">{t('login.user')}</label>
			<input id="username" name="username" autocomplete="username" value={form?.username ?? ''} required />
		</div>

		<div class="field">
			<label for="password">{t('settings.password')}</label>
			<input id="password" name="password" type="password" autocomplete="current-password" required />
		</div>

		{#if form?.needCode}
			<div class="field">
				<label for="code">{t('login.code')}</label>
				<input id="code" name="code" inputmode="numeric" autocomplete="one-time-code"
					pattern="[0-9]{6}" maxlength="6" class="tabular" required />
			</div>
		{/if}

		<button class="btn btn-primary full" disabled={loading}>
			{loading ? t('login.checking') : t('login.submit')}
		</button>
	</form>
</div>

<style>
	.wrap {
		min-height: 100vh;
		display: grid;
		place-items: center;
		padding: 24px;
	}
	form {
		width: 100%;
		max-width: 360px;
		padding: 28px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	h1 { font-size: 22px; }
	.sub { margin: -10px 0 4px; font-size: 14px; }
	.field { margin: 0; }
	.full { width: 100%; justify-content: center; margin-top: 6px; }
</style>

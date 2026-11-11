<script lang="ts">
	import '../app.css';
	import { provideI18n } from '$lib/i18n/context';
	let { data, children } = $props();

	// Getter, nu valoare: dupa salvarea preferintelor `data` se reincarca, iar
	// textele se schimba fara reincarcarea paginii.
	provideI18n(() => data.prefs);
</script>

<svelte:head>
	<title>Pontaj</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

{@render children()}

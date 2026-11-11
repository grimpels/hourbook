<script lang="ts">
	// Un text tradus in care unii parametri devin elemente: `{token}` -> <code>.
	// Propozitia ramane intreaga in catalog, cu ordinea cuvintelor din limba ei.
	// Elementele sunt ale acestei componente, deci stilul lor din pagina parinte
	// se scrie cu `:global(code)` sub o clasa a parintelui.
	import { segments, type Marks } from '$lib/i18n';

	let { text, marks = {} }: { text: string; marks?: Marks } = $props();
	let parts = $derived(segments(text, marks));
</script>

{#each parts as s}{#if s.k === 'code'}<code>{s.v}</code>{:else if s.k === 'strong'}<strong>{s.v}</strong>{:else if s.k === 'em'}<em>{s.v}</em>{:else}{s.v}{/if}{/each}

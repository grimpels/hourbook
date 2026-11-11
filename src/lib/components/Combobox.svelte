<script lang="ts">
	// Camp cu cautare activa care accepta si valori noi. Scopul principal e sa
	// nu se creeze duplicate din greseli de tastare: potrivirile existente sunt
	// mereu primele, iar crearea unei valori noi e o actiune explicita, marcata
	// distinct in lista.
	import { useI18n } from '$lib/i18n/context';

	type Props = {
		id?: string;
		value: string;
		options: string[];
		placeholder?: string;
		/** Eticheta pentru cititoarele de ecran, cand campul n-are <label> vizibil. */
		label?: string;
		onselect?: (v: string) => void;
		/**
		 * `false` pentru text liber (activitatea): lista doar propune, fara
		 * „Adauga", si nimic nu e preselectat — Enter pastreaza ce ai scris.
		 */
		creare?: boolean;
	};
	let {
		id, value = $bindable(), options, placeholder = '', label, onselect, creare = true
	}: Props = $props();
	const { t } = useI18n();

	let open = $state(false);
	let highlight = $state(0);
	let el: HTMLInputElement | undefined = $state();

	const norm = (s: string) => s.trim().toLowerCase();
	// Doar pentru cautare: „incarcare" gaseste „Încărcare". Potrivirea exacta de
	// mai jos ramane cu diacritice — serverul le deosebeste, deci altfel s-ar crea
	// un client nou crezand ca e cel existent.
	const fold = (s: string) => norm(s).normalize('NFD').replace(/\p{M}/gu, '');

	// Potrivire: intai cele care incep cu textul tastat, apoi cele care il contin.
	let matches = $derived.by(() => {
		const q = fold(value);
		if (!q) return options.slice(0, 8);
		const starts = options.filter((o) => fold(o).startsWith(q));
		const contains = options.filter((o) => !fold(o).startsWith(q) && fold(o).includes(q));
		return [...starts, ...contains].slice(0, 8);
	});

	let exact = $derived(options.some((o) => norm(o) === norm(value)));
	let canCreate = $derived(creare && value.trim().length > 0 && !exact);
	let items = $derived(canCreate ? [...matches, '\u0000new'] : matches);

	function choose(v: string) {
		value = v === '\u0000new' ? value.trim() : v;
		open = false;
		onselect?.(value);
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			open = true;
			const d = e.key === 'ArrowDown' ? 1 : -1;
			highlight = highlight < 0 && d < 0 ? items.length - 1 : (highlight + d + items.length) % items.length;
		} else if (e.key === 'Enter' && open && items[highlight] !== undefined) {
			e.preventDefault();
			choose(items[highlight]);
		} else if (e.key === 'Escape') {
			open = false;
		}
	}
</script>

<div class="cb">
	<input
		{id}
		type="text"
		bind:this={el}
		bind:value
		{placeholder}
		aria-label={label}
		autocomplete="off"
		spellcheck="false"
		oninput={() => { open = true; highlight = creare ? 0 : -1; }}
		onfocus={() => { open = true; highlight = creare ? 0 : -1; }}
		onblur={() => setTimeout(() => (open = false), 120)}
		{onkeydown}
	/>
	{#if open && items.length}
		<ul>
			{#each items as item, i}
				<li>
					<button
						type="button"
						class:active={i === highlight}
						onmousedown={(e) => { e.preventDefault(); choose(item); }}
						onmouseenter={() => (highlight = i)}
					>
						{#if item === '\u0000new'}
							<span class="new">{t('combo.add')}</span> <strong>{value.trim()}</strong>
						{:else}
							{item}
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.cb { position: relative; }
	ul {
		position: absolute;
		z-index: 30;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		margin: 0;
		padding: 4px;
		list-style: none;
		background: var(--surface);
		border: 1px solid var(--border-strong);
		border-radius: 6px;
		box-shadow: var(--shadow);
		max-height: 240px;
		overflow-y: auto;
	}
	li button {
		display: block;
		width: 100%;
		text-align: left;
		padding: 7px 9px;
		border: 0;
		background: transparent;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
	}
	li button.active { background: var(--accent-soft); }
	.new { color: var(--text-dim); font-size: var(--text-sm); }
</style>

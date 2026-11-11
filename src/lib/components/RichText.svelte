<script lang="ts">
	// Editor mic, in stilul celui clasic din WordPress: o bara de unelte peste un
	// `contenteditable`. Fara biblioteci — pentru bold/liste/aliniere si un camp
	// de antet, o dependinta externa ar fi mai mult cod decat toata aplicatia asta.
	//
	// Se foloseste `document.execCommand`. E marcat "deprecated", dar nu exista
	// inlocuitor standardizat, e implementat in toate browserele si e exact ce
	// facea si editorul clasic. Alternativa ar fi manipularea manuala a
	// selectiei — mult cod pentru acelasi rezultat.
	import { useI18n } from '$lib/i18n/context';
	import type { Key } from '$lib/i18n';

	type Props = { value: string; placeholders?: { key: string; label: string }[]; id?: string };
	let { value = $bindable(), placeholders = [], id }: Props = $props();
	const i18n = useI18n();
	const { t } = i18n;

	let el: HTMLDivElement | undefined = $state();
	let showPlaceholders = $state(false);

	// Continutul se scrie in element o singura data, la montare. Daca s-ar lega
	// reactiv, fiecare tastare ar rescrie DOM-ul si ar muta cursorul la inceput.
	$effect(() => {
		if (el && el.innerHTML !== value && document.activeElement !== el) el.innerHTML = value;
	});

	function cmd(name: string, arg?: string) {
		el?.focus();
		document.execCommand(name, false, arg);
		sync();
	}

	function sync() {
		if (el) value = el.innerHTML;
	}

	function link() {
		const url = prompt(t('rt.linkPrompt'));
		if (url) cmd('createLink', url);
	}

	function insert(text: string) {
		el?.focus();
		document.execCommand('insertText', false, text);
		showPlaceholders = false;
		sync();
	}

	// Blocuri gata facute pentru documente tiparite. `insertHTML` pastreaza
	// structura; clasele sunt pe lista alba a curatarii de pe server si sunt
	// singurele care primesc stiluri speciale la tiparire. Textele si variabilele
	// sunt in limba utilizatorului.
	function blockHtml(kind: string): string {
		if (kind === 'spatiu') return '<div class="spatiu"></div><p><br></p>';
		if (kind === 'pagina-noua') return '<div class="pagina-noua"></div><p><br></p>';
		return `<div class="semnaturi">
<p><strong>${t('rt.sigProvider')}</strong></p>
<p>${i18n.ph('reprezentant')}</p>
<p>${i18n.ph('firma')}</p>
<div class="spatiu"></div>
<p><strong>${t('rt.sigClient')}</strong></p>
<p>${i18n.ph('client')}</p>
<div class="spatiu"></div>
<p><strong>${t('rt.sigCommittee')}</strong></p>
<p>&nbsp;</p>
<p>&nbsp;</p>
</div><p><br></p>`;
	}

	function insertBlock(kind: string) {
		el?.focus();
		document.execCommand('insertHTML', false, blockHtml(kind));
		showBlocks = false;
		sync();
	}

	let showBlocks = $state(false);

	// Lipirea se face ca text simplu: altfel un `paste` din Word aduce zeci de
	// atribute si stiluri pe care oricum le sterge curatarea de pe server.
	function onpaste(e: ClipboardEvent) {
		e.preventDefault();
		const text = e.clipboardData?.getData('text/plain') ?? '';
		document.execCommand('insertText', false, text);
		sync();
	}

	// Doar B/I/U raman litere: exista in orice font. Restul sunt desenate, dupa
	// ce trei simboluri Unicode (⯇ ⯈ si pictogramele barii principale) au aparut
	// ca patrate goale pe telefon.
	const TEXT_TOOLS: [string, string, Key][] = [
		['bold', 'B', 'rt.bold'],
		['italic', 'I', 'rt.italic'],
		['underline', 'U', 'rt.underline']
	];

	// Fiecare pictograma e o lista de linii orizontale: x1,x2 pe o grila de 16.
	const LINE_TOOLS: [string, Key, [number, number][]][] = [
		['insertUnorderedList', 'rt.ul', [[5, 14], [5, 14], [5, 14]]],
		['insertOrderedList', 'rt.ol', [[5, 14], [5, 14], [5, 14]]],
		['justifyLeft', 'rt.left', [[2, 14], [2, 10], [2, 13]]],
		['justifyCenter', 'rt.center', [[3, 13], [5, 11], [3, 13]]],
		['justifyRight', 'rt.right', [[2, 14], [6, 14], [3, 14]]]
	];
</script>

<div class="rt">
	<div class="tools">
		{#each TEXT_TOOLS as [command, label, key]}
			<button type="button" class="t" onclick={() => cmd(command)} title={t(key)} aria-label={t(key)}>
				<span class:b={command === 'bold'} class:i={command === 'italic'}
					class:u={command === 'underline'}>{label}</span>
			</button>
		{/each}

		{#each LINE_TOOLS as [command, key, lines]}
			<button type="button" class="t" onclick={() => cmd(command)} title={t(key)} aria-label={t(key)}>
				<svg viewBox="0 0 16 16" aria-hidden="true">
					{#each lines as [x1, x2], k}
						<line x1={x1} x2={x2} y1={4 + k * 4} y2={4 + k * 4} />
						{#if command === 'insertUnorderedList'}
							<circle cx="2.5" cy={4 + k * 4} r="1.1" fill="currentColor" stroke="none" />
						{:else if command === 'insertOrderedList'}
							<text x="0.5" y={6 + k * 4} font-size="5" fill="currentColor" stroke="none">{k + 1}</text>
						{/if}
					{/each}
				</svg>
			</button>
		{/each}

		<button type="button" class="t" onclick={() => cmd('formatBlock', '<h3>')} title={t('rt.heading')}
			aria-label={t('rt.heading')}><span class="hh">H</span></button>
		<button type="button" class="t" onclick={link} title={t('rt.link')} aria-label={t('rt.link')}>
			<svg viewBox="0 0 16 16" aria-hidden="true">
				<path d="M6.5 9.5a2.5 2.5 0 0 0 3.5 0l2-2a2.5 2.5 0 0 0-3.5-3.5l-.8.8" />
				<path d="M9.5 6.5a2.5 2.5 0 0 0-3.5 0l-2 2a2.5 2.5 0 0 0 3.5 3.5l.8-.8" />
			</svg>
		</button>
		<button type="button" class="t" onclick={() => cmd('removeFormat')} title={t('rt.clear')}
			aria-label={t('rt.clear')}>
			<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
		</button>

		<div class="ph">
			<button type="button" class="t wide" onclick={() => (showBlocks = !showBlocks)}>
				{t('rt.insertBlock')}
			</button>
			{#if showBlocks}
				<ul>
					<li><button type="button" onmousedown={(e) => { e.preventDefault(); insertBlock('semnaturi'); }}>
						<span>{t('rt.blockSign')}</span></button></li>
					<li><button type="button" onmousedown={(e) => { e.preventDefault(); insertBlock('spatiu'); }}>
						<span>{t('rt.blockSpace')}</span></button></li>
					<li><button type="button" onmousedown={(e) => { e.preventDefault(); insertBlock('pagina-noua'); }}>
						<span>{t('rt.blockPage')}</span></button></li>
				</ul>
			{/if}
		</div>

		{#if placeholders.length}
			<div class="ph">
				<button type="button" class="t wide" onclick={() => (showPlaceholders = !showPlaceholders)}>
					{t('rt.insertField')}
				</button>
				{#if showPlaceholders}
					<ul>
						{#each placeholders as p}
							<li>
								<button type="button" onmousedown={(e) => { e.preventDefault(); insert('{' + p.key + '}'); }}>
									<code>{'{' + p.key + '}'}</code> <span>{p.label}</span>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}
	</div>

	<div
		{id}
		bind:this={el}
		class="area"
		contenteditable="true"
		role="textbox"
		tabindex="0"
		aria-multiline="true"
		oninput={sync}
		onblur={sync}
		{onpaste}
	></div>
</div>

<style>
	.rt { border: 1px solid var(--border-strong); border-radius: 6px; background: var(--surface); overflow: visible; }
	.tools {
		display: flex;
		flex-wrap: wrap;
		gap: 2px;
		padding: 5px;
		border-bottom: 1px solid var(--border);
		background: var(--surface-2);
		border-radius: 6px 6px 0 0;
	}
	.t {
		min-width: 30px;
		height: 30px;
		padding: 0 7px;
		border: 1px solid transparent;
		background: transparent;
		border-radius: 5px;
		cursor: pointer;
		font-size: 13px;
		color: var(--text-dim);
	}
	.t:hover { background: var(--surface); border-color: var(--border); color: var(--text); }
	.t.wide { width: auto; font-size: 12.5px; }
	.t svg {
		width: 16px;
		height: 16px;
		display: block;
		margin: 0 auto;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.6;
		stroke-linecap: round;
	}
	.b { font-weight: 700; }
	.hh { font-weight: 700; font-size: 14px; }
	.i { font-style: italic; }
	.u { text-decoration: underline; }
	.ph { position: relative; }
	.ph:first-of-type { margin-left: auto; }
	.ph ul {
		position: absolute;
		right: 0;
		top: calc(100% + 4px);
		z-index: 20;
		list-style: none;
		margin: 0;
		padding: 4px;
		min-width: 230px;
		background: var(--surface);
		border: 1px solid var(--border-strong);
		border-radius: 6px;
		box-shadow: var(--shadow);
	}
	.ph li button {
		display: flex;
		gap: 8px;
		align-items: baseline;
		width: 100%;
		text-align: left;
		border: 0;
		background: transparent;
		padding: 6px 8px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 13px;
	}
	.ph li button:hover { background: var(--accent-soft); }
	.ph code { font-size: 12px; color: var(--accent); }
	.ph span { color: var(--text-dim); font-size: 12px; }
	.area {
		min-height: 90px;
		padding: 10px 12px;
		outline: none;
		font-size: 14px;
		line-height: 1.55;
	}
	.area:focus { box-shadow: inset 0 0 0 2px var(--accent-soft); }
	.area :global(p) { margin: 0 0 8px; }
	.area :global(h3) { font-size: 15px; margin: 0 0 8px; }
	.area :global(ul), .area :global(ol) { margin: 0 0 8px; padding-left: 22px; }
	.area :global(.spatiu) {
		height: 26px;
		border-bottom: 1px dashed var(--border-strong);
		margin: 4px 0 10px;
	}
	.area :global(.pagina-noua) {
		border-top: 2px dashed var(--border-strong);
		margin: 12px 0;
		text-align: center;
		font-size: 10px;
		color: var(--text-faint);
	}
	.area :global(.pagina-noua)::after { content: 'pagină nouă'; }
	.area :global(.semnaturi) { margin: 10px 0; }
</style>

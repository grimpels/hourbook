<script lang="ts">
	// Camp de data in formatul ales in setari. `type="date"` s-ar afisa dupa
	// limba browserului (01/31/2026 intr-un Chrome englezesc), oricare ar fi
	// preferinta. Calendarul nativ ramane la indemana prin buton.
	import { useI18n } from '$lib/i18n/context';
	import { formatDay, parseDay, dayPattern } from '$lib/format';

	type Props = {
		id: string;
		value: string;
		required?: boolean;
		/** Data s-a schimbat si e valida — la iesirea din camp, la Enter sau din calendar, nu la fiecare tasta. */
		onchange?: () => void;
	};
	let { id, value = $bindable(), required = false, onchange }: Props = $props();
	const { prefs, t } = useI18n();

	// Ultima data valida: ancora pentru anul lipsa si pentru calendar.
	let ref = value;
	// Ultima valoare anuntata prin `onchange`: „1.1" e deja o data valida, dar
	// nu trebuie sa declanseze nimic cat timp utilizatorul inca scrie.
	let anuntat = value;
	function commit() {
		if (value && value !== anuntat) {
			anuntat = value;
			onchange?.();
		}
	}
	let text = $state(value ? formatDay(value, prefs) : '');
	let picker: HTMLInputElement;

	// Valoarea pusa de camp insusi. Orice alta schimbare vine din afara (de
	// exemplu navigarea intre perioade in raport) si trebuie sa se vada in text.
	let intern = value;
	$effect(() => {
		if (value === intern) return;
		intern = anuntat = value;
		if (value) { ref = value; text = formatDay(value, prefs); }
	});

	function oninput() {
		const iso = parseDay(text, prefs, ref);
		value = intern = iso ?? '';
		if (iso) ref = iso;
	}
	// Primul click selecteaza tot textul, ca o valoare noua sa-l inlocuiasca
	// direct; al doilea pune cursorul, pentru o corectura de o cifra. Fara
	// `mouseup` anulat, browserul ar deselecta imediat dupa focus.
	let abiaFocus = false;
	function onfocus(e: FocusEvent) {
		(e.currentTarget as HTMLInputElement).select();
		abiaFocus = true;
	}
	function onmouseup(e: MouseEvent) {
		if (abiaFocus) e.preventDefault();
		abiaFocus = false;
	}
	function onblur() {
		abiaFocus = false;
		if (value) text = formatDay(value, prefs);
		commit();
	}
	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') commit();
	}
	function pick() {
		value = intern = picker.value;
		if (value) { ref = value; text = formatDay(value, prefs); }
		commit();
	}
	function open() {
		picker.value = value || ref;
		try { picker.showPicker(); } catch { picker.focus(); }
	}
</script>

<div class="field">
	<input {id} type="text" inputmode="numeric" autocomplete="off" class="tabular"
		class:invalid={text && !value} placeholder={dayPattern(prefs)}
		bind:value={text} {oninput} {onfocus} {onmouseup} {onblur} {onkeydown} {required} />
	<button type="button" class="cal" onclick={open} aria-label={t('entry.pickDate')} title={t('entry.pickDate')}>
		<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2" />
			<path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
	</button>
	<input bind:this={picker} type="date" class="picker" tabindex="-1" aria-hidden="true" onchange={pick} />
</div>

<style>
	.field { position: relative; }
	.field input[type='text'] { padding-right: 36px; }
	.invalid { border-color: var(--danger); }
	.cal {
		position: absolute;
		top: 0; right: 0;
		width: 36px; height: var(--control-h);
		display: grid; place-items: center;
		background: none; border: 0; cursor: pointer;
		color: var(--text-faint);
	}
	.cal:hover { color: var(--text); }
	.cal svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.6; }
	/* Invizibil, dar ancorat sub buton: calendarul nativ se deschide acolo. */
	.picker {
		position: absolute; right: 0; bottom: 0;
		width: 36px; height: 0; padding: 0; border: 0;
		opacity: 0; pointer-events: none;
	}
</style>

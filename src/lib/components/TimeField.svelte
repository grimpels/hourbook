<script lang="ts">
	// Camp de ora pe ceasul ales in setari (24h sau AM/PM). `type="time"` s-ar
	// afisa dupa limba browserului. Valoarea legata ramane HH:MM pe 24 de ore,
	// goala cat timp textul nu e o ora valida.
	import { useI18n } from '$lib/i18n/context';
	import { formatTime, parseTime } from '$lib/format';
	import { minToHHMM, hhmmToMin } from '$lib/time';

	type Props = { id: string; value: string; required?: boolean };
	let { id, value = $bindable(), required = false }: Props = $props();
	const { prefs } = useI18n();

	const show = (v: string) => {
		const m = hhmmToMin(v);
		return m === null ? '' : formatTime(m, prefs);
	};
	let text = $state(show(value));

	// Valoarea pusa de camp insusi; orice alta schimbare vine din afara.
	let intern = value;
	$effect(() => {
		if (value === intern) return;
		intern = value;
		text = show(value);
	});

	function oninput() {
		const m = parseTime(text);
		value = intern = m === null ? '' : minToHHMM(m);
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
		if (value) text = show(value);
	}
</script>

<input {id} type="text" inputmode="numeric" autocomplete="off" class="tabular"
	class:invalid={text && !value} placeholder={prefs.hour12 ? 'h:mm AM' : 'HH:MM'}
	bind:value={text} {oninput} {onfocus} {onmouseup} {onblur} {required} />

<style>
	.invalid { border-color: var(--danger); }
</style>

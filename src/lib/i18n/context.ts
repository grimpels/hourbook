// Limba si formatele, la indemana oricarei componente. Preferintele vin din
// datele paginii (`+layout.server.ts`), deci pe server fiecare cerere are ale ei
// — un obiect global de modul ar amesteca utilizatorii intre ei.
import { getContext, setContext } from 'svelte';
import type { Prefs } from '$lib/prefs';
import { translate, plural, type Key, type PluralKey, type Params } from './index';
import {
	formatDay, formatRange, formatPeriod, formatTime, formatSpan,
	formatHour, formatDecimal, dayNames, monthTitle
} from '$lib/format';
import { durationLabel } from '$lib/time';
import { PLACEHOLDERS, placeholderToken, type PlaceholderKey } from '$lib/placeholders';
import { columnToken, type ColumnKey } from '$lib/docbody';

const KEY = Symbol('i18n');

function make(get: () => Prefs) {
	// Fiecare functie citeste preferintele la apel, nu la creare: asa o schimbare
	// de limba se propaga fara reincarcarea paginii.
	const p = () => get();
	return {
		get prefs() {
			return p();
		},
		t: (key: Key, params?: Params) => translate(p().lang, key, params),
		tn: (key: PluralKey, n: number) => plural(p().lang, key, n),
		day: (iso: string) => formatDay(iso, p()),
		range: (from: string, to: string) => formatRange(from, to, p()),
		period: (from: string, to: string) => formatPeriod(from, to, p()),
		time: (min: number) => formatTime(min, p()),
		span: (start: number, end: number) => formatSpan(start, end, p()),
		hour: (h: number) => formatHour(h, p()),
		dec: (min: number) => formatDecimal(min, p()),
		dur: durationLabel,
		days: () => dayNames(p()),
		month: (year: number, month: number) => monthTitle(year, month, p()),
		/** `{proiect}` / `{project}`, cu acolade. */
		ph: (key: PlaceholderKey) => `{${placeholderToken(key, p().lang)}}`,
		col: (key: ColumnKey) => columnToken(key, p().lang),
		/** Lista pentru meniul „Inserează câmp" si pentru legenda. */
		placeholders: () =>
			PLACEHOLDERS.map((x) => ({
				key: placeholderToken(x.key, p().lang),
				canonical: x.key as PlaceholderKey,
				label: translate(p().lang, `ph.${x.key}` as Key, { example: formatDecimal(105, p()) })
			}))
	};
}

export type I18n = ReturnType<typeof make>;

export function provideI18n(get: () => Prefs): I18n {
	const i = make(get);
	setContext(KEY, i);
	return i;
}

export function useI18n(): I18n {
	return getContext<I18n>(KEY);
}

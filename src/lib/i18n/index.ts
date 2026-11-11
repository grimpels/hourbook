// Traducerea, aceeasi pe server si in browser. Fara biblioteca: un dictionar pe
// limba, parametri `{nume}` si o regula de plural — atat cere aplicatia.
import { ro } from './ro.ts';
import { en } from './en.ts';
import type { Locale } from '../prefs.ts';

export type Key = keyof typeof ro;
type PluralBase<K> = K extends `${infer B}.one` ? B : never;
export type PluralKey = PluralBase<Key>;
export type Params = Record<string, string | number>;

const CATALOGS: Record<Locale, Record<Key, string>> = { ro, en };

/** Parametrii necunoscuti raman scrisi `{asa}`: in sabloane acoladele sunt continut. */
export function translate(lang: Locale, key: Key, params?: Params): string {
	const s = CATALOGS[lang]?.[key] ?? ro[key] ?? key;
	if (!params) return s;
	return s.replace(/\{(\w+)\}/g, (full, k) => (k in params ? String(params[k]) : full));
}

/**
 * Romana are trei forme: 1 interval, 2–19 intervale, 20+ DE intervale — iar
 * „de" dispare din nou cand ultimele doua cifre sunt 01–19 (101 intervale).
 * Engleza are doua; catalogul ei repeta forma de plural in `few` si `many`.
 */
export function pluralForm(lang: Locale, n: number): 'one' | 'few' | 'many' {
	if (n === 1) return 'one';
	if (lang !== 'ro') return 'many';
	const r = n % 100;
	return n === 0 || (r >= 1 && r <= 19) ? 'few' : 'many';
}

export function plural(lang: Locale, key: PluralKey, n: number): string {
	return translate(lang, `${key}.${pluralForm(lang, n)}` as Key, { n });
}

export type Segment = { k: 'text' | 'code' | 'strong' | 'em'; v: string };
export type Marks = Record<string, [Exclude<Segment['k'], 'text'>, string]>;

/**
 * Taie un text tradus in bucati, unde parametrii din `marks` devin elemente.
 * Asa propozitia ramane intreaga in catalog, cu ordinea cuvintelor a limbii ei,
 * in loc sa fie lipita din fragmente in cod.
 */
export function segments(text: string, marks: Marks): Segment[] {
	const out: Segment[] = [];
	let last = 0;
	for (const m of text.matchAll(/\{(\w+)\}/g)) {
		const mark = marks[m[1]];
		if (!mark) continue;
		if (m.index > last) out.push({ k: 'text', v: text.slice(last, m.index) });
		out.push({ k: mark[0], v: mark[1] });
		last = m.index + m[0].length;
	}
	if (last < text.length) out.push({ k: 'text', v: text.slice(last) });
	return out;
}

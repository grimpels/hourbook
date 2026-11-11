// Paleta de etichete. Cheile se stocheaza in baza de date; nuantele efective
// sunt definite in `app.css`, separat pentru tema luminoasa si cea intunecata.
export const PALETTE = [
	{ key: 'albastru', label: 'Albastru' },
	{ key: 'verde', label: 'Verde' },
	{ key: 'turcoaz', label: 'Turcoaz' },
	{ key: 'mov', label: 'Mov' },
	{ key: 'roz', label: 'Roz' },
	{ key: 'rosu', label: 'Roșu' },
	{ key: 'portocaliu', label: 'Portocaliu' },
	{ key: 'galben', label: 'Galben' },
	{ key: 'maro', label: 'Maro' },
	{ key: 'gri', label: 'Gri' }
] as const;

export type ColorKey = (typeof PALETTE)[number]['key'];

export const COLOR_KEYS: string[] = PALETTE.map((c) => c.key);

export function isColorKey(v: unknown): v is ColorKey {
	return typeof v === 'string' && COLOR_KEYS.includes(v);
}

// Proiectul bate clientul: e mai specific. Fara niciunul, se foloseste accentul.
export function entryColor(projectColor?: string | null, clientColor?: string | null): string {
	return projectColor || clientColor || 'implicit';
}

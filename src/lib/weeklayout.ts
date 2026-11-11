/**
 * Asezarea intrarilor suprapuse in grila saptamanii: cine sta pe ce coloana si
 * in cate coloane se imparte latimea zilei.
 *
 * Suprapunerea se judeca dupa cat OCUPA intrarea pe ecran, nu dupa durata ei
 * reala. O intrare are o inaltime minima ca sa-i incapa cele trei randuri de
 * text; doua intrari de cate 5 minute la 10 minute distanta nu se suprapun in
 * timp, dar desenate s-ar acoperi una pe alta. Judecata pe extinderea vizuala
 * le aseaza alaturi, cum trebuie.
 */
export type Interval = { id: number; start_min: number; end_min: number };

export type Pozitie = { col: number; of: number };

export function layoutZi(
	intrari: Interval[],
	minuteMinime: number
): Map<number, Pozitie> {
	const sortate = [...intrari].sort((a, b) => a.start_min - b.start_min);
	const sfarsit = (e: Interval) => Math.max(e.end_min, e.start_min + minuteMinime);

	const coloane: Interval[][] = [];
	const pozitii = new Map<number, Pozitie>();

	for (const e of sortate) {
		let ci = coloane.findIndex((col) =>
			col.every((o) => sfarsit(o) <= e.start_min || o.start_min >= sfarsit(e))
		);
		if (ci === -1) {
			coloane.push([e]);
			ci = coloane.length - 1;
		} else coloane[ci].push(e);
		pozitii.set(e.id, { col: ci, of: 1 });
	}

	for (const e of sortate) {
		const vecini = sortate.filter((o) => o.start_min < sfarsit(e) && sfarsit(o) > e.start_min);
		pozitii.get(e.id)!.of = Math.max(...vecini.map((o) => pozitii.get(o.id)!.col)) + 1;
	}

	return pozitii;
}

import { toISODay, addDays, startOfWeek } from './time.ts';

/**
 * Perioada acoperita de un raport programat: saptamana sau luna INCHEIATA,
 * nu cea curenta. Pur, fara acces la baza de date, ca sa poata fi verificat
 * separat — aici se ascund erorile de calendar (an bisect, trecerea anului).
 */
export function previousPeriod(
	freq: 'saptamanal' | 'lunar',
	today: Date,
	weekStart: 0 | 1 = 1
): { from: string; to: string } {
	if (freq === 'saptamanal') {
		const from = addDays(startOfWeek(toISODay(today), weekStart), -7);
		return { from, to: addDays(from, 6) };
	}
	const y = today.getFullYear();
	const m = today.getMonth();
	return {
		from: toISODay(new Date(y, m - 1, 1)),
		// Ziua 0 a lunii curente = ultima zi a lunii precedente. Asa nu trebuie
		// stiut cate zile are luna si nici cazul anului bisect.
		to: toISODay(new Date(y, m, 0))
	};
}

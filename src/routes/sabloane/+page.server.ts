import type { PageServerLoad } from './$types';
import { listTemplates, saveTemplate, STARTER_TEMPLATES } from '$lib/server/templates';
import { listClients } from '$lib/server/entries';
import { startOfMonth, toISODay } from '$lib/time';
import type { Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Previzualizarea are nevoie de un client si de o luna: se ia primul client
	// si luna curenta, ca linkul sa arate ceva real dintr-un singur clic.
	const clients = listClients(locals.user!.id);
	const today = toISODay(new Date());
	const from = startOfMonth(today);
	const [y, m] = from.split('-').map(Number);
	return {
		templates: listTemplates(locals.user!.id),
		starters: STARTER_TEMPLATES[locals.prefs.lang].map((t) => t.name),
		preview: {
			client: clients[0]?.name ?? '',
			from,
			to: toISODay(new Date(y, m, 0))
		},
		user: locals.user
	};
};

export const actions: Actions = {
	// Sabloanele de pornire se COPIAZA in contul utilizatorului, ca sa poata fi
	// modificate liber. Cele care exista deja nu se ating. Se ofera cele din
	// limba utilizatorului.
	starters: async ({ locals }) => {
		const existing = new Set(listTemplates(locals.user!.id).map((t) => t.name.toLowerCase()));
		let added = 0;
		for (const t of STARTER_TEMPLATES[locals.prefs.lang]) {
			if (existing.has(t.name.toLowerCase())) continue;
			saveTemplate(locals.user!.id, t.name, t.body);
			added++;
		}
		return { added };
	}
};

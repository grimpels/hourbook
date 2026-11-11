import type { LayoutServerLoad } from './$types';

// Preferintele ajung la fiecare pagina, inclusiv la cea de autentificare.
export const load: LayoutServerLoad = async ({ locals }) => ({ prefs: locals.prefs });

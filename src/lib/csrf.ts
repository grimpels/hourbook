// Protectia CSRF: aceeasi regula ca in SvelteKit — un formular trimis de pe alt
// site e refuzat — dar comparata cu antetul `Host` al cererii, nu cu ORIGIN-ul
// fixat la pornire. Asa aplicatia merge imediat pe orice adresa (IP, domeniu,
// in spatele unui proxy), fara configurare, iar instalarea se poate face din
// browser. Doar gazda conteaza: un atacator nu poate trimite din pagina lui
// un `Origin` cu gazda noastra.

const FORM_TYPES = ['application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain'];
const UNSAFE = ['POST', 'PUT', 'PATCH', 'DELETE'];

export function crossSiteForm(
	method: string,
	contentType: string | null,
	origin: string | null,
	host: string
): boolean {
	if (!UNSAFE.includes(method.toUpperCase())) return false;
	const type = (contentType ?? '').split(';')[0].trim().toLowerCase();
	if (!FORM_TYPES.includes(type)) return false;
	if (!origin) return true;
	try {
		return new URL(origin).host.toLowerCase() !== host.toLowerCase();
	} catch {
		return true;
	}
}

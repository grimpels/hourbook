// Curatare HTML pentru antetul/subsolul documentelor.
//
// Continutul vine din editorul propriu, deci de la utilizatorul autentificat —
// dar tot se curata, din doua motive: un `paste` din Word aduce zeci de atribute
// si stiluri care strica tiparirea, iar textul salvat azi e afisat maine intr-o
// pagina care poate ajunge si intr-un email. Lista alba e mai scurta decat orice
// lista neagra si nu are gauri de completat mai tarziu.

const ALLOWED_TAGS = new Set([
	'p', 'br', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 's',
	'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'blockquote', 'hr',
	'table', 'thead', 'tbody', 'tr', 'th', 'td'
]);

// Din `style` se pastreaza doua declaratii: alinierea (editorul o foloseste) si
// latimea in procente (tabelele de asezare in coloane au nevoie de ea, si merge
// si in programele de email). Restul stilurilor lipite din alte programe ar
// strica asezarea in pagina.
const STYLE_OK = [
	/^text-align:\s*(left|right|center|justify)$/i,
	/^width:\s*\d{1,3}%$/i,
	/^vertical-align:\s*(top|middle|bottom)$/i
];

function cleanStyle(value: string): string {
	const keep = value
		.split(';')
		.map((d) => d.trim())
		.filter((d) => d && STYLE_OK.some((re) => re.test(d)));
	return keep.join('; ');
}

// `class` e permis doar cu aceste valori, folosite de blocurile pe care le
// insereaza editorul. Sunt legate de stilurile de tiparire, deci o clasa
// arbitrara lipita din alta parte nu are ce cauta aici.
// Fiecare clasa e un ROL tipografic, nu un truc de asezare: asezarea in doua
// coloane se face cu tabele, care merg si in programele de email.
const ALLOWED_CLASSES = new Set([
	'semnaturi', 'coloana', 'spatiu', 'pagina-noua', 'titlu',
	'doc-antet',      // banda de sus, cu firma si tipul documentului
	'doc-firma',      // numele firmei, singurul text mai mare din antet
	'doc-mic',        // text secundar: CUI, adresa, note sub un camp
	'doc-eticheta',   // eticheta unui camp (Prestator, Beneficiar, Perioada)
	'doc-titlu',      // titlul documentului
	'doc-total',      // cifra totalului — singurul accent vizual
	'doc-nota',       // paragraf de incheiere
	'linie-semnatura' // linia pe care se semneaza
]);

function cleanAttrs(tag: string, attrs: string): string {
	const out: string[] = [];
	const re = /([a-zA-Z-]+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(attrs))) {
		const name = m[1].toLowerCase();
		const value = m[2].replace(/^["']|["']$/g, '');
		if (name === 'style') {
			const style = cleanStyle(value);
			if (style) out.push(`style="${style}"`);
		}
		else if (name === 'class') {
			const keep = value
				.split(/\s+/)
				.filter((c) => ALLOWED_CLASSES.has(c.toLowerCase()));
			if (keep.length) out.push(`class="${keep.join(' ')}"`);
		}
		else if (name === 'href' && tag === 'a') {
			// Doar scheme inofensive: `javascript:` si `data:` sunt exact ce se cauta.
			if (/^(https?:\/\/|mailto:|tel:)/i.test(value)) out.push(`href="${escapeAttr(value)}" rel="noopener"`);
		}
	}
	return out.length ? ' ' + out.join(' ') : '';
}

function escapeAttr(v: string): string {
	return v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function sanitizeHtml(input: string): string {
	if (!input) return '';

	// Intai dispar elementele al caror CONTINUT nu trebuie pastrat. Daca s-ar
	// scoate doar eticheta, corpul scriptului ar ramane ca text vizibil.
	let html = input
		.replace(/<script[\s\S]*?<\/script>/gi, '')
		.replace(/<style[\s\S]*?<\/style>/gi, '')
		.replace(/<!--[\s\S]*?-->/g, '');

	html = html.replace(/<\/?([a-zA-Z0-9]+)((?:\s[^>]*)?)\/?>/g, (full, rawTag, attrs) => {
		const tag = String(rawTag).toLowerCase();
		if (!ALLOWED_TAGS.has(tag)) return '';
		if (full.startsWith('</')) return `</${tag}>`;
		if (tag === 'br' || tag === 'hr') return `<${tag}>`;
		return `<${tag}${cleanAttrs(tag, String(attrs))}>`;
	});

	return html.trim();
}

// --- Substitutii --------------------------------------------------------

// Lista variabilelor sta in `$lib/placeholders`, impreuna cu numele englezesti.
export type Placeholders = Record<string, string>;

/** Inlocuieste {cheie} cu valoarea. Cheile necunoscute raman neatinse, ca sa se vada greseala. */
export function fillPlaceholders(html: string, values: Placeholders): string {
	return html.replace(/\{([a-z_]+)\}/gi, (full, key) => {
		const v = values[String(key).toLowerCase()];
		return v === undefined ? full : escapeText(v);
	});
}

function escapeText(v: string): string {
	return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

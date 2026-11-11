// Stilurile documentului, exprimate ca declaratii inline.
//
// Pagina foloseste clase; emailul nu poate: programele de email ignora in mare
// parte CSS-ul din <style> si nu suporta `flex`. Ca sa arate la fel in ambele
// locuri, aceleasi roluri sunt definite si aici, iar la trimitere se scriu
// direct pe elemente. Asezarea in coloane se face cu tabele, tocmai ca sa nu
// depinda de CSS.

export const DOC_STYLES: Record<string, string> = {
	'doc-antet':
		'width:100%;border-collapse:collapse;border-bottom:1.5px solid #111;padding-bottom:10px;margin-bottom:22px',
	'doc-firma': 'font-size:17px;font-weight:600;letter-spacing:-0.01em',
	'doc-mic': 'font-size:12px;color:#5a5a5a;line-height:1.45',
	'doc-eticheta': 'display:block;font-size:11.5px;color:#5a5a5a;margin-bottom:1px',
	'doc-titlu': 'font-size:20px;font-weight:600;letter-spacing:-0.015em;margin:0 0 4px',
	'doc-total': 'font-size:26px;font-weight:600;letter-spacing:-0.02em;white-space:nowrap',
	'doc-nota': 'font-size:12.5px;color:#5a5a5a;margin-top:14px',
	'linie-semnatura': 'border-bottom:1px solid #111;height:60px;margin-bottom:5px',
	spatiu: 'height:84px',
	semnaturi: 'margin-top:20px',
	titlu: 'text-align:center',
	'pagina-noua': 'height:0'
};

/**
 * Scrie stilurile pe elementele care au clasele de mai sus. Daca elementul are
 * deja `style` (latime, aliniere), stilul clasei se pune INAINTE, ca aliniarea
 * scrisa de utilizator sa ramana ultima si sa castige.
 */
export function inlineDocStyles(html: string): string {
	return html.replace(
		/<([a-z0-9]+)([^>]*?)class="([^"]*)"([^>]*?)>/gi,
		(full, tag, before, classes, after) => {
			const css = classes
				.split(/\s+/)
				.map((c: string) => DOC_STYLES[c])
				.filter(Boolean)
				.join(';');
			if (!css) return full;

			const rest = before + after;
			const existing = /style="([^"]*)"/i.exec(rest);
			if (existing) {
				return `<${tag}${rest.replace(existing[0], `style="${css};${existing[1]}"`)} class="${classes}">`;
			}
			return `<${tag}${rest} class="${classes}" style="${css}">`;
		}
	);
}

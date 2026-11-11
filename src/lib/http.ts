/**
 * Mesajul unei erori de la server, pentru afisare. `error()` din SvelteKit
 * raspunde cu JSON (`{"message": "..."}`) cand cererea vine din `fetch`, deci
 * `res.text()` ar pune acoladele si ghilimelele direct in interfata.
 */
export async function errorText(res: Response): Promise<string> {
	const raw = await res.text();
	try {
		const j = JSON.parse(raw) as { message?: unknown };
		if (typeof j?.message === 'string') return j.message;
	} catch {
		// Nu e JSON: textul e deja mesajul.
	}
	return raw || res.statusText;
}

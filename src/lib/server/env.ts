// Variabilele de mediu ale aplicatiei: `HOURBOOK_*`, cu numele vechi `PONTAJ_*`
// acceptat in continuare — instalarile facute inainte de redenumire merg
// neschimbate.
export function env(name: string): string | undefined {
	return process.env[`HOURBOOK_${name}`] ?? process.env[`PONTAJ_${name}`];
}

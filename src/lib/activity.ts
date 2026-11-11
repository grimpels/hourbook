// Refolosirea unei activitati din istoric: aduce si clientul si proiectul ei,
// dar nu suprascrie ce ai ales deja. Proiectul vine doar daca se potriveste cu
// clientul din formular — altfel s-ar lega un proiect de alt client.
import type { Activity } from './types.ts';

export function completeaza(
	a: Activity | undefined,
	client: string,
	project: string
): { client: string; project: string } {
	if (!a) return { client, project };
	const c = client.trim();
	if (!c) return { client: a.client_name ?? '', project: project.trim() ? project : (a.project_name ?? '') };
	const acelasi = c.toLowerCase() === (a.client_name ?? '').toLowerCase();
	return { client, project: !project.trim() && acelasi ? (a.project_name ?? '') : project };
}

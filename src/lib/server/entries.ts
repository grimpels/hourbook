import { db } from './db';
import type { Activity } from '$lib/types';

export type Entry = {
	id: number;
	day: string;
	start_min: number;
	end_min: number;
	description: string;
	client_id: number | null;
	project_id: number | null;
	client_name: string | null;
	project_name: string | null;
	client_color: string | null;
	project_color: string | null;
};

const SELECT = `
	SELECT e.id, e.day, e.start_min, e.end_min, e.description,
	       e.client_id, e.project_id,
	       c.name AS client_name, p.name AS project_name,
	       c.color AS client_color, p.color AS project_color
	FROM entries e
	LEFT JOIN clients  c ON c.id = e.client_id
	LEFT JOIN projects p ON p.id = e.project_id
	WHERE e.user_id = ?`;

export function listEntries(userId: number, from: string, to: string): Entry[] {
	return db
		.prepare(SELECT + ' AND e.day BETWEEN ? AND ? ORDER BY e.day, e.start_min')
		.all(userId, from, to) as Entry[];
}

export function getEntry(userId: number, id: number): Entry | undefined {
	return db.prepare(SELECT + ' AND e.id = ?').get(userId, id) as Entry | undefined;
}

export type EntryInput = {
	day: string;
	start_min: number;
	end_min: number;
	description: string;
	client_id: number | null;
	project_id: number | null;
};

export function createEntry(userId: number, e: EntryInput): number {
	const r = db
		.prepare(
			`INSERT INTO entries (user_id, day, start_min, end_min, description, client_id, project_id)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`
		)
		.run(userId, e.day, e.start_min, e.end_min, e.description, e.client_id, e.project_id);
	return Number(r.lastInsertRowid);
}

export function updateEntry(userId: number, id: number, e: EntryInput) {
	db.prepare(
		`UPDATE entries
		 SET day = ?, start_min = ?, end_min = ?, description = ?, client_id = ?, project_id = ?,
		     updated_at = datetime('now')
		 WHERE id = ? AND user_id = ?`
	).run(e.day, e.start_min, e.end_min, e.description, e.client_id, e.project_id, id, userId);
}

export function deleteEntry(userId: number, id: number) {
	db.prepare('DELETE FROM entries WHERE id = ? AND user_id = ?').run(id, userId);
}

// --- Clienti si proiecte ------------------------------------------------

export type Client = {
	id: number;
	name: string;
	color: string | null;
	doc_body: string | null;
	doc_header: string | null;
	doc_footer: string | null;
	doc_email: string | null;
};
export type Project = {
	id: number;
	name: string;
	client_id: number | null;
	client_name: string | null;
	color: string | null;
	doc_body: string | null;
	doc_header: string | null;
	doc_footer: string | null;
	doc_email: string | null;
};

export function listClients(userId: number): Client[] {
	return db
		.prepare(
			`SELECT id, name, color, doc_body, doc_header, doc_footer, doc_email
			 FROM clients WHERE user_id = ? ORDER BY name COLLATE NOCASE`
		)
		.all(userId) as Client[];
}

// Istoricul activitatilor, pentru refolosire: fiecare text o singura data, cel
// mai recent folosit primul, cu clientul si proiectul de la ultima folosire.
export function listActivities(userId: number, limit = 300): Activity[] {
	return db
		.prepare(
			`SELECT description, client_name, project_name FROM (
			   SELECT trim(e.description) AS description, c.name AS client_name, p.name AS project_name,
			          e.day, e.start_min,
			          ROW_NUMBER() OVER (PARTITION BY trim(e.description) ORDER BY e.day DESC, e.start_min DESC) AS n
			   FROM entries e
			   LEFT JOIN clients  c ON c.id = e.client_id
			   LEFT JOIN projects p ON p.id = e.project_id
			   WHERE e.user_id = ? AND trim(e.description) <> ''
			 ) WHERE n = 1 ORDER BY day DESC, start_min DESC LIMIT ?`
		)
		.all(userId, limit) as Activity[];
}

export function listProjects(userId: number): Project[] {
	return db
		.prepare(
			`SELECT p.id, p.name, p.client_id, p.color, p.doc_body, p.doc_header, p.doc_footer, p.doc_email,
			        c.name AS client_name
			 FROM projects p LEFT JOIN clients c ON c.id = p.client_id
			 WHERE p.user_id = ? ORDER BY p.name COLLATE NOCASE`
		)
		.all(userId) as Project[];
}

// Creare "la cerere" din formularul de intrare. Cauta intai fara diferenta de
// litere mari/mici si fara spatii in plus: doua greseli de tastare identice nu
// trebuie sa produca doi clienti.
export function findOrCreateClient(userId: number, name: string): number | null {
	const n = name.trim();
	if (!n) return null;
	const found = db
		.prepare('SELECT id FROM clients WHERE user_id = ? AND name = ? COLLATE NOCASE')
		.get(userId, n) as { id: number } | undefined;
	if (found) return found.id;
	const r = db.prepare('INSERT INTO clients (user_id, name) VALUES (?, ?)').run(userId, n);
	return Number(r.lastInsertRowid);
}

export function findOrCreateProject(
	userId: number,
	name: string,
	clientId: number | null
): number | null {
	const n = name.trim();
	if (!n) return null;
	const found = db
		.prepare(
			`SELECT id FROM projects
			 WHERE user_id = ? AND name = ? COLLATE NOCASE AND client_id IS ?`
		)
		.get(userId, n, clientId) as { id: number } | undefined;
	if (found) return found.id;
	const r = db
		.prepare('INSERT INTO projects (user_id, client_id, name) VALUES (?, ?, ?)')
		.run(userId, clientId, n);
	return Number(r.lastInsertRowid);
}

// Sterge clientii si proiectele ramase fara nicio intrare care sa le foloseasca.
// Altfel, o greseala de tastare corectata imediat ar ramane pentru totdeauna in
// lista de sugestii.
export function pruneOrphans(userId: number) {
	db.prepare(
		`DELETE FROM projects WHERE user_id = ?
		 AND id NOT IN (SELECT project_id FROM entries WHERE project_id IS NOT NULL AND user_id = ?)`
	).run(userId, userId);
	db.prepare(
		`DELETE FROM clients WHERE user_id = ?
		 AND id NOT IN (SELECT client_id FROM entries WHERE client_id IS NOT NULL AND user_id = ?)
		 AND id NOT IN (SELECT client_id FROM projects WHERE client_id IS NOT NULL AND user_id = ?)`
	).run(userId, userId, userId);
}

// Culorile se schimba doar prin id, niciodata prin nume: e o actualizare, nu o
// creare, si nu trebuie sa poata atinge randurile altui utilizator.
export function setClientColor(userId: number, id: number, color: string | null) {
	db.prepare('UPDATE clients SET color = ? WHERE id = ? AND user_id = ?').run(color, id, userId);
}

export function setProjectColor(userId: number, id: number, color: string | null) {
	db.prepare('UPDATE projects SET color = ? WHERE id = ? AND user_id = ?').run(color, id, userId);
}

export function getClient(userId: number, id: number): Client | undefined {
	return db
		.prepare(
			`SELECT id, name, color, doc_body, doc_header, doc_footer, doc_email
			 FROM clients WHERE id = ? AND user_id = ?`
		)
		.get(id, userId) as Client | undefined;
}

export function getClientByName(userId: number, name: string): Client | undefined {
	return db
		.prepare(
			`SELECT id, name, color, doc_body, doc_header, doc_footer, doc_email
			 FROM clients WHERE name = ? COLLATE NOCASE AND user_id = ?`
		)
		.get(name, userId) as Client | undefined;
}

export function getProjectByName(
	userId: number,
	name: string,
	clientName?: string | null
): Project | undefined {
	// Doua proiecte pot avea acelasi nume la clienti diferiti, deci cand se
	// stie clientul, cautarea se restrange la el.
	if (clientName) {
		const withClient = db
			.prepare(
				`SELECT p.id, p.name, p.client_id, p.color, p.doc_body, p.doc_header, p.doc_footer, p.doc_email,
				        c.name AS client_name
				 FROM projects p LEFT JOIN clients c ON c.id = p.client_id
				 WHERE p.user_id = ? AND p.name = ? COLLATE NOCASE AND c.name = ? COLLATE NOCASE`
			)
			.get(userId, name, clientName) as Project | undefined;
		if (withClient) return withClient;
	}
	return db
		.prepare(
			`SELECT p.id, p.name, p.client_id, p.color, p.doc_body, p.doc_header, p.doc_footer, p.doc_email,
			        c.name AS client_name
			 FROM projects p LEFT JOIN clients c ON c.id = p.client_id
			 WHERE p.user_id = ? AND p.name = ? COLLATE NOCASE`
		)
		.get(userId, name) as Project | undefined;
}

/** Antetul si subsolul vin deja curatate de apelant (vezi sanitize.ts). */
export type DocInput = { body: string; header: string; footer: string; email: string };

export function setClientDoc(userId: number, id: number, doc: DocInput) {
	db.prepare(
		`UPDATE clients SET doc_body = ?, doc_header = ?, doc_footer = ?, doc_email = ?
		 WHERE id = ? AND user_id = ?`
	).run(doc.body || null, doc.header || null, doc.footer || null, doc.email || null, id, userId);
}

export function setProjectDoc(userId: number, id: number, doc: DocInput) {
	db.prepare(
		`UPDATE projects SET doc_body = ?, doc_header = ?, doc_footer = ?, doc_email = ?
		 WHERE id = ? AND user_id = ?`
	).run(doc.body || null, doc.header || null, doc.footer || null, doc.email || null, id, userId);
}

/** Clientii carora li se poate trimite automat un raport. */
export function clientsWithEmail(userId: number): Client[] {
	return db
		.prepare(
			`SELECT id, name, color, doc_body, doc_header, doc_footer, doc_email
			 FROM clients WHERE user_id = ? AND doc_email IS NOT NULL AND doc_email <> ''
			 ORDER BY name COLLATE NOCASE`
		)
		.all(userId) as Client[];
}

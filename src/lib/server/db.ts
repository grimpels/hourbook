// Baza de date: SQLite prin modulul `node:sqlite` din Node 24 — built-in, deci
// zero dependinte native de compilat si nimic de actualizat separat.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { env } from './env';

const file = env('DB') ?? 'data/hourbook.db';
mkdirSync(dirname(file), { recursive: true });

export const db = new DatabaseSync(file);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA busy_timeout = 5000');

// O baza noua primeste schema completa; mesajele de migrare au sens doar
// pentru o baza care exista deja.
const fresh = !db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'users'").get();

// Schema. Rulata la fiecare pornire: `IF NOT EXISTS` o face idempotenta, iar
// pentru scara asta e mai simplu decat un sistem de migrari.
db.exec(`
CREATE TABLE IF NOT EXISTS users (
	id            INTEGER PRIMARY KEY,
	username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
	password_hash TEXT NOT NULL,
	totp_secret   TEXT,
	totp_enabled  INTEGER NOT NULL DEFAULT 0,
	created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
	id         TEXT PRIMARY KEY,
	user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	expires_at INTEGER NOT NULL,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clients (
	id      INTEGER PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	name    TEXT NOT NULL,
	UNIQUE (user_id, name COLLATE NOCASE)
);

CREATE TABLE IF NOT EXISTS projects (
	id        INTEGER PRIMARY KEY,
	user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
	name      TEXT NOT NULL,
	UNIQUE (user_id, client_id, name COLLATE NOCASE)
);

-- Ziua e text YYYY-MM-DD, iar orele sunt minute de la miezul noptii: fara
-- fusuri orare in DB, iar o intrare care trece de miezul noptii are end_min > 1440.
CREATE TABLE IF NOT EXISTS entries (
	id          INTEGER PRIMARY KEY,
	user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	day         TEXT NOT NULL,
	start_min   INTEGER NOT NULL,
	end_min     INTEGER NOT NULL,
	description TEXT NOT NULL DEFAULT '',
	client_id   INTEGER REFERENCES clients(id) ON DELETE SET NULL,
	project_id  INTEGER REFERENCES projects(id) ON DELETE SET NULL,
	created_at  TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
	CHECK (end_min > start_min)
);

CREATE INDEX IF NOT EXISTS idx_entries_user_day ON entries(user_id, day);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
`);

// Migrari aditive. Se ruleaza la fiecare pornire si sunt idempotente: se adauga
// coloana doar daca lipseste. Nimic nu se sterge si nimic nu se rescrie — baza
// contine date reale.
function addColumn(table: string, column: string, decl: string) {
	const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
	if (!cols.some((c) => c.name === column)) {
		db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${decl}`);
		if (!fresh) console.log(`[hourbook] Migration: added ${table}.${column}`);
	}
}

// Culoarea e o CHEIE de paleta (`albastru`, `verde`...), nu un cod hex: asa
// aceeasi eticheta poate avea nuante diferite pe tema luminoasa si pe cea
// intunecata, fara sa se rescrie datele.
addColumn('clients', 'color', 'TEXT');
addColumn('projects', 'color', 'TEXT');

// Antetul si subsolul folosite la export/proces verbal, per client. HTML produs
// de editorul din interfata, curatat pe server inainte de salvare.
addColumn('clients', 'doc_header', 'TEXT');
addColumn('clients', 'doc_footer', 'TEXT');
addColumn('clients', 'doc_email', 'TEXT');

// Aceleasi campuri si pe proiect. Se aplica peste cele ale clientului, camp cu
// camp: un proiect poate schimba doar subsolul si sa mosteneasca antetul.
addColumn('projects', 'doc_header', 'TEXT');
addColumn('projects', 'doc_footer', 'TEXT');
addColumn('projects', 'doc_email', 'TEXT');

// Corpul documentului: un singur camp in care tabelul se pune unde vrei, prin
// `{raport}`. Antetul si subsolul raman pentru documentele scrise inainte —
// daca nu exista corp, se compun automat ca `antet + {raport} + subsol`, deci
// nimic nu trebuie rescris.
addColumn('clients', 'doc_body', 'TEXT');
addColumn('projects', 'doc_body', 'TEXT');

// Limba si formatele alese de utilizator (JSON, vezi `$lib/prefs`). NULL =
// valorile implicite, deci contul existent arata ca inainte pana alege altceva.
addColumn('users', 'prefs', 'TEXT');

// Setari generale (SMTP, planificare): tabel cheie-valoare. Sunt putine si se
// citesc rar, deci nu merita coloane dedicate.
db.exec(`
CREATE TABLE IF NOT EXISTS settings (
	key   TEXT PRIMARY KEY,
	value TEXT NOT NULL
);

-- Ce s-a trimis si cand. Serveste la doua lucruri: sa nu se trimita de doua ori
-- acelasi raport programat, si sa se vada in interfata ce a plecat.
-- Cronometrul in desfasurare: cel mult unul per utilizator. Sta pe server, nu
-- in browser, ca sa poata fi pornit pe telefon si oprit pe calculator.
CREATE TABLE IF NOT EXISTS running_timers (
	user_id     INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
	started_at  INTEGER NOT NULL,      -- milisecunde de la epoca
	description TEXT NOT NULL DEFAULT '',
	client      TEXT NOT NULL DEFAULT '',
	project     TEXT NOT NULL DEFAULT ''
);

-- Sabloane reutilizabile de document. Se IMPORTA (se copiaza) intr-un client
-- sau proiect, nu se leaga: asa o modificare de sablon nu schimba pe tacute
-- documente deja trimise clientilor.
CREATE TABLE IF NOT EXISTS doc_templates (
	id         INTEGER PRIMARY KEY,
	user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	name       TEXT NOT NULL,
	body       TEXT NOT NULL DEFAULT '',
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	UNIQUE (user_id, name COLLATE NOCASE)
);

CREATE TABLE IF NOT EXISTS sent_reports (
	id         INTEGER PRIMARY KEY,
	client_id  INTEGER REFERENCES clients(id) ON DELETE SET NULL,
	client_name TEXT NOT NULL DEFAULT '',
	period_from TEXT NOT NULL,
	period_to   TEXT NOT NULL,
	recipient   TEXT NOT NULL,
	kind        TEXT NOT NULL,          -- 'manual' | 'programat'
	ok          INTEGER NOT NULL,
	detail      TEXT NOT NULL DEFAULT '',
	sent_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// Curatenie la pornire: sesiuni expirate.
db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());

import { db } from './db';

// Setarile stau in tabelul cheie-valoare, serializate JSON. Parola SMTP ajunge
// astfel in clar in fisierul bazei — la fel ca oricare `.env` de pe server.
// De aceea fisierul bazei nu trebuie sa iasa din director si nu se comite.
export function getSetting<T>(key: string, fallback: T): T {
	const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
		| { value: string }
		| undefined;
	if (!row) return fallback;
	try {
		return JSON.parse(row.value) as T;
	} catch {
		return fallback;
	}
}

export function setSetting(key: string, value: unknown) {
	db.prepare(
		'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
	).run(key, JSON.stringify(value));
}

export type Smtp = {
	host: string;
	port: number;
	secure: boolean;
	user: string;
	pass: string;
	from: string;
};

export const SMTP_EMPTY: Smtp = { host: '', port: 587, secure: false, user: '', pass: '', from: '' };

export function getSmtp(): Smtp {
	return { ...SMTP_EMPTY, ...getSetting<Partial<Smtp>>('smtp', {}) };
}

export function smtpConfigured(): boolean {
	const s = getSmtp();
	return !!(s.host && s.from);
}

// Datele prestatorului: aceleasi pentru toate documentele, deci stau in setari,
// nu in fiecare sablon. Altfel o schimbare de firma ar cere rescrierea tuturor.
export type Provider = {
	firma: string;
	reprezentant: string;
	cui: string;
	adresa: string;
};

export const PROVIDER_EMPTY: Provider = { firma: '', reprezentant: '', cui: '', adresa: '' };

export function getProvider(): Provider {
	return { ...PROVIDER_EMPTY, ...getSetting<Partial<Provider>>('provider', {}) };
}

export type Schedule = {
	enabled: boolean;
	frequency: 'saptamanal' | 'lunar';
	// Ziua din saptamana (1 = luni) sau din luna (1-28), dupa frecventa.
	day: number;
	hour: number;
	// Trimite doar clientilor care au adresa completata.
	lastRun: string | null;
};

export const SCHEDULE_DEFAULT: Schedule = {
	enabled: false,
	frequency: 'lunar',
	day: 1,
	hour: 8,
	lastRun: null
};

export function getSchedule(): Schedule {
	return { ...SCHEDULE_DEFAULT, ...getSetting<Partial<Schedule>>('schedule', {}) };
}

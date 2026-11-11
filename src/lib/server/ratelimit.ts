// Limitator de incercari la autentificare.
//
// De ce in memorie: exista o singura instanta a aplicatiei, iar o repornire (rara,
// si pe care un atacator nu o poate provoca) reseteaza contoarele. In schimb nu
// creste baza de date cu un rand la fiecare cerere esuata.
//
// Doua chei, fiindca acopera atacuri diferite:
//   - (IP, utilizator): cineva incearca parole pentru un cont anume;
//   - (IP): cineva incearca acelasi lucru cu multe nume de utilizator diferite.
//
// Blocarea se verifica INAINTE de scrypt. Altfel un atacator ar obtine si un mic
// atac de tip DoS gratuit: fiecare incercare ar costa serverul o derivare scrypt
// (N=16384), indiferent cat de gresita e parola.

// Cheia NU e adresa exacta, ci reteaua din care vine.
//
// Motivul l-a aratat un test: aceleasi cereri, plecate de pe acelasi server, au
// ajuns o data cu IPv4 si o data cu IPv6 — deci doua identitati diferite pentru
// aceeasi masina, iar blocarea uneia nu insemna nimic pentru cealalta. Pe IPv6
// e mult mai rau: un atacator primeste de obicei un /64 intreg, adica 18
// trilioane de adrese pe care le poate roti la fiecare incercare.
//
// Asa ca IPv6 se reduce la prefixul /64, iar IPv4 ramane adresa intreaga.
export function ipKey(ip: string): string {
	if (!ip.includes(':')) return ip;

	// IPv4 impachetat in IPv6 (::ffff:1.2.3.4) e tot IPv4.
	const v4 = /(\d{1,3}(?:\.\d{1,3}){3})$/.exec(ip);
	if (v4) return v4[1];

	// Se desface forma comprimata, apoi se pastreaza primele 4 grupuri = /64.
	const [head, tail = ''] = ip.split('::');
	const h = head ? head.split(':').filter(Boolean) : [];
	const t = tail ? tail.split(':').filter(Boolean) : [];
	const full = ip.includes('::') ? [...h, ...Array(8 - h.length - t.length).fill('0'), ...t] : h;
	return full.slice(0, 4).map((g) => g.replace(/^0+(?=.)/, '').toLowerCase()).join(':') + '::/64';
}

type Bucket = { count: number; first: number; lockedUntil: number };

export type Rule = { max: number; windowMs: number; lockMs: number };

export const PER_USER: Rule = { max: 5, windowMs: 15 * 60_000, lockMs: 15 * 60_000 };
export const PER_IP: Rule = { max: 20, windowMs: 15 * 60_000, lockMs: 60 * 60_000 };

const buckets = new Map<string, Bucket>();

// Ultimele incercari esuate, pentru pagina de blocari. Inel de dimensiune fixa:
// interesant e ce s-a intamplat recent, iar memoria ramane marginita.
const RECENT_MAX = 60;
const recent: { at: number; ip: string; username: string; locked: boolean }[] = [];

// Ceas injectabil: face logica testabila fara sa se astepte 15 minute reale.
let clock = () => Date.now();
export function _setClock(fn: () => number) {
	clock = fn;
}
export function _reset() {
	buckets.clear();
}

function prune(now: number) {
	if (buckets.size < 500) return;
	for (const [k, b] of buckets) {
		if (b.lockedUntil < now && now - b.first > PER_IP.windowMs) buckets.delete(k);
	}
}

/** Milisecunde ramase din blocare, sau 0 daca nu e blocat. */
function lockedFor(key: string, now: number): number {
	const b = buckets.get(key);
	if (!b) return 0;
	return b.lockedUntil > now ? b.lockedUntil - now : 0;
}

/**
 * Se apeleaza inainte de verificarea parolei. Intoarce numarul de secunde de
 * asteptare daca cererea trebuie respinsa, altfel 0.
 */
export function checkLogin(ip: string, username: string): number {
	const now = clock();
	const k = ipKey(ip);
	const ms = Math.max(lockedFor(`u:${k}|${username.toLowerCase()}`, now), lockedFor(`i:${k}`, now));
	return ms > 0 ? Math.ceil(ms / 1000) : 0;
}

function bump(key: string, rule: Rule, now: number): boolean {
	let b = buckets.get(key);
	// Fereastra expirata => se porneste alta. Contoarele nu se acumuleaza la
	// nesfarsit din incercari gresite razlete, la zile distanta.
	if (!b || now - b.first > rule.windowMs) {
		b = { count: 0, first: now, lockedUntil: 0 };
		buckets.set(key, b);
	}
	b.count++;
	if (b.count >= rule.max) {
		b.lockedUntil = now + rule.lockMs;
		b.count = 0;
		b.first = now;
		return true;
	}
	return false;
}

/** Se apeleaza dupa o incercare esuata. Intoarce true daca tocmai s-a blocat. */
export function recordFailure(ip: string, username: string): boolean {
	const now = clock();
	prune(now);
	const k = ipKey(ip);
	const lockedUser = bump(`u:${k}|${username.toLowerCase()}`, PER_USER, now);
	const lockedIp = bump(`i:${k}`, PER_IP, now);
	const locked = lockedUser || lockedIp;

	recent.unshift({ at: now, ip: k, username, locked });
	if (recent.length > RECENT_MAX) recent.length = RECENT_MAX;

	return locked;
}

/** Autentificare reusita: contoarele acelui IP se sterg, ca sa nu ramana aproape de prag. */
export function recordSuccess(ip: string, username: string) {
	const k = ipKey(ip);
	buckets.delete(`u:${k}|${username.toLowerCase()}`);
	buckets.delete(`i:${k}`);
}

// --- Pentru pagina de blocari -------------------------------------------

export type Lock = {
	key: string;
	scope: 'retea' | 'retea+utilizator';
	network: string;
	username: string | null;
	remainingSec: number;
	until: number;
};

export function listLocks(): Lock[] {
	const now = clock();
	const out: Lock[] = [];
	for (const [key, b] of buckets) {
		if (b.lockedUntil <= now) continue;
		const isUser = key.startsWith('u:');
		const body = key.slice(2);
		const [network, username] = isUser ? body.split('|') : [body, null];
		out.push({
			key,
			scope: isUser ? 'retea+utilizator' : 'retea',
			network,
			username,
			remainingSec: Math.ceil((b.lockedUntil - now) / 1000),
			until: b.lockedUntil
		});
	}
	return out.sort((a, b) => b.remainingSec - a.remainingSec);
}

export function listRecent(): { at: number; ip: string; username: string; locked: boolean }[] {
	return recent.slice(0, 30);
}

/** Deblocare manuala. Sterge complet contorul, nu doar blocarea. */
export function unlock(key: string): boolean {
	return buckets.delete(key);
}

export function unlockAll(): number {
	const n = [...buckets.values()].filter((b) => b.lockedUntil > clock()).length;
	buckets.clear();
	return n;
}

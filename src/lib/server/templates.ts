import { db } from './db';
import type { Locale } from '$lib/prefs';

export type DocTemplate = { id: number; name: string; body: string; created_at: string };

export function listTemplates(userId: number): DocTemplate[] {
	return db
		.prepare('SELECT id, name, body, created_at FROM doc_templates WHERE user_id = ? ORDER BY name COLLATE NOCASE')
		.all(userId) as DocTemplate[];
}

export function saveTemplate(userId: number, name: string, body: string, id?: number): number {
	if (id) {
		db.prepare('UPDATE doc_templates SET name = ?, body = ? WHERE id = ? AND user_id = ?').run(
			name,
			body,
			id,
			userId
		);
		return id;
	}
	// Acelasi nume => se suprascrie, in loc sa esueze pe constrangerea de unicitate:
	// "salveaza ca sablon" apasat de doua ori nu trebuie sa dea eroare.
	const r = db
		.prepare(
			`INSERT INTO doc_templates (user_id, name, body) VALUES (?, ?, ?)
			 ON CONFLICT(user_id, name) DO UPDATE SET body = excluded.body`
		)
		.run(userId, name, body);
	return Number(r.lastInsertRowid);
}

export function deleteTemplate(userId: number, id: number) {
	db.prepare('DELETE FROM doc_templates WHERE id = ? AND user_id = ?').run(id, userId);
}

type Starter = { name: string; body: string };

/** Sabloane oferite la prima folosire, ca sa nu se plece de la pagina alba. */
const RO: Starter[] = [
	{
		name: 'Raport lunar de activitate',
		body: `<table class="doc-antet"><tbody><tr>
<td><div class="doc-firma">{firma}</div><div class="doc-mic">{cui}<br>{adresa}</div></td>
<td class="doc-mic" style="text-align: right; vertical-align: bottom;">Raport de activitate<br>emis la {data}</td>
</tr></tbody></table>

<table><tbody><tr>
<td style="width: 55%;">
<span class="doc-eticheta">Beneficiar</span>
<div class="doc-titlu">{client}</div>
<div class="doc-mic">{proiect}</div>
</td>
<td style="text-align: right; vertical-align: bottom;">
<span class="doc-eticheta">{perioada}</span>
<span class="doc-total">{total_ore}</span>
</td>
</tr></tbody></table>

{raport: data, proiect, activitate, durata}

<p class="doc-nota">{intervale} de lucru, însumând {total_zecimal} ore. Documentul se anexează facturii aferente perioadei.</p>

<div class="semnaturi">
<table><tbody><tr>
<td style="width: 50%;">
<span class="doc-eticheta">Din partea prestatorului</span>
<div class="linie-semnatura"></div>
{reprezentant}<br><span class="doc-mic">{firma}</span>
</td>
<td>
<span class="doc-eticheta">Din partea beneficiarului</span>
<div class="linie-semnatura"></div>
{client}
</td>
</tr></tbody></table>
</div>`
	},
	{
		name: 'Proces-verbal de recepție',
		body: `<table class="doc-antet"><tbody><tr>
<td><div class="doc-firma">{firma}</div><div class="doc-mic">{cui}<br>{adresa}</div></td>
<td class="doc-mic" style="text-align: right; vertical-align: bottom;">Încheiat la {data}</td>
</tr></tbody></table>

<h3 class="titlu">PROCES-VERBAL</h3>
<p class="titlu">{proiect}</p>

<p>În perioada {perioada}, au fost prestate următoarele servicii:</p>

{raport: data, activitate, durata}

<p class="doc-nota">Beneficiarul confirmă executarea serviciilor de mai sus — {intervale}, în total {total_ore} — și nu are obiecțiuni.</p>

<div class="semnaturi">
<p><strong>Reprezentant prestator,</strong></p>
<p>{reprezentant}<br>{firma}</p>
<div class="spatiu"></div>
<p><strong>Reprezentant beneficiar,</strong></p>
<p>{client}</p>
<div class="spatiu"></div>
<p><strong>Comisia de recepție,</strong></p>
<div class="spatiu"></div>
<div class="spatiu"></div>
</div>`
	}
];

// Aceleasi doua documente, scrise in engleza si cu numele englezesti ale
// variabilelor ({company}, {report: date, ...}).
const EN: Starter[] = [
	{
		name: 'Monthly activity report',
		body: `<table class="doc-antet"><tbody><tr>
<td><div class="doc-firma">{company}</div><div class="doc-mic">{tax_id}<br>{address}</div></td>
<td class="doc-mic" style="text-align: right; vertical-align: bottom;">Activity report<br>issued on {date}</td>
</tr></tbody></table>

<table><tbody><tr>
<td style="width: 55%;">
<span class="doc-eticheta">Client</span>
<div class="doc-titlu">{client}</div>
<div class="doc-mic">{project}</div>
</td>
<td style="text-align: right; vertical-align: bottom;">
<span class="doc-eticheta">{period}</span>
<span class="doc-total">{total_hours}</span>
</td>
</tr></tbody></table>

{report: date, project, activity, duration}

<p class="doc-nota">{intervals} of work, {total_decimal} hours in total. This document is attached to the invoice for the period.</p>

<div class="semnaturi">
<table><tbody><tr>
<td style="width: 50%;">
<span class="doc-eticheta">For the provider</span>
<div class="linie-semnatura"></div>
{representative}<br><span class="doc-mic">{company}</span>
</td>
<td>
<span class="doc-eticheta">For the client</span>
<div class="linie-semnatura"></div>
{client}
</td>
</tr></tbody></table>
</div>`
	},
	{
		name: 'Acceptance certificate',
		body: `<table class="doc-antet"><tbody><tr>
<td><div class="doc-firma">{company}</div><div class="doc-mic">{tax_id}<br>{address}</div></td>
<td class="doc-mic" style="text-align: right; vertical-align: bottom;">Issued on {date}</td>
</tr></tbody></table>

<h3 class="titlu">ACCEPTANCE CERTIFICATE</h3>
<p class="titlu">{project}</p>

<p>During {period}, the following services were provided:</p>

{report: date, activity, duration}

<p class="doc-nota">The client confirms that the services above were performed — {intervals}, {total_hours} in total — and has no objections.</p>

<div class="semnaturi">
<p><strong>Provider representative,</strong></p>
<p>{representative}<br>{company}</p>
<div class="spatiu"></div>
<p><strong>Client representative,</strong></p>
<p>{client}</p>
<div class="spatiu"></div>
<p><strong>Acceptance committee,</strong></p>
<div class="spatiu"></div>
<div class="spatiu"></div>
</div>`
	}
];

export const STARTER_TEMPLATES: Record<Locale, Starter[]> = { ro: RO, en: EN };

import nodemailer from 'nodemailer';
import { db } from './db';
import { getSmtp } from './settings';
import { buildReport, reportHtml, reportCsv } from './report';
import { formatPeriod } from '$lib/format';
import { translate, plural } from '$lib/i18n';
import type { Prefs } from '$lib/prefs';

export async function sendMail(to: string, subject: string, html: string, attachments: {
	filename: string;
	content: string;
	contentType: string;
}[] = []) {
	const s = getSmtp();
	if (!s.host || !s.from) throw new Error('SMTP nu e configurat');

	const transport = nodemailer.createTransport({
		host: s.host,
		port: s.port,
		// `secure` = TLS de la inceput (465). Pe 587 se porneste in clar si se
		// trece la TLS prin STARTTLS — nodemailer o face automat.
		secure: s.secure,
		auth: s.user ? { user: s.user, pass: s.pass } : undefined
	});

	await transport.sendMail({ from: s.from, to, subject, html, attachments });
}

export type SendResult = { ok: boolean; detail: string };

/** Compune si trimite raportul unui client, apoi noteaza rezultatul in istoric. */
export async function sendReport(opts: {
	userId: number;
	username: string;
	from: string;
	to: string;
	client?: string;
	project?: string;
	recipient: string;
	kind: 'manual' | 'programat';
	prefs: Prefs;
}): Promise<SendResult> {
	const r = buildReport(opts);
	const lang = opts.prefs.lang;
	const subject = `${translate(lang, 'mail.subject')} ${opts.client ? opts.client + ' ' : ''}${formatPeriod(r.from, r.to, opts.prefs)}`;

	let ok = true;
	let detail = plural(lang, 'report.entries', r.entries.length);
	try {
		await sendMail(opts.recipient, subject, reportHtml(r), [
			{
				filename: `pontaj_${r.from}_${r.to}.csv`,
				content: reportCsv(r),
				contentType: 'text/csv; charset=utf-8'
			}
		]);
	} catch (e) {
		ok = false;
		detail = e instanceof Error ? e.message : String(e);
	}

	db.prepare(
		`INSERT INTO sent_reports (client_name, period_from, period_to, recipient, kind, ok, detail)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`
	).run(opts.client ?? '', r.from, r.to, opts.recipient, opts.kind, ok ? 1 : 0, detail);

	return { ok, detail };
}

export function recentSends(limit = 15) {
	return db
		.prepare(
			`SELECT client_name, period_from, period_to, recipient, kind, ok, detail, sent_at
			 FROM sent_reports ORDER BY id DESC LIMIT ?`
		)
		.all(limit) as {
		client_name: string;
		period_from: string;
		period_to: string;
		recipient: string;
		kind: string;
		ok: number;
		detail: string;
		sent_at: string;
	}[];
}

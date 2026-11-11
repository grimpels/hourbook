import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendReport } from '$lib/server/mailer';
import { smtpConfigured } from '$lib/server/settings';
import { translate } from '$lib/i18n';

export const POST: RequestHandler = async ({ locals, request }) => {
	const lang = locals.prefs.lang;
	if (!smtpConfigured()) throw error(400, translate(lang, 'err.smtpMissing'));

	const b = (await request.json()) as {
		from?: string;
		to?: string;
		client?: string;
		project?: string;
		recipient?: string;
	};
	const recipient = (b.recipient ?? '').trim();
	if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient)) throw error(400, translate(lang, 'err.invalidEmail'));
	if (!b.from || !b.to) throw error(400, translate(lang, 'err.missingRange'));

	const res = await sendReport({
		userId: locals.user!.id,
		username: locals.user!.username,
		from: b.from,
		to: b.to,
		client: b.client || undefined,
		project: b.project || undefined,
		recipient,
		kind: 'manual',
		prefs: locals.prefs
	});

	if (!res.ok) throw error(502, translate(lang, 'err.sendFailed', { detail: res.detail }));
	return json({ ok: true, detail: res.detail });
};

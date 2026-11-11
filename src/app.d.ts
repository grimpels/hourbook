import type { SessionUser } from '$lib/server/auth';
import type { Prefs } from '$lib/prefs';

declare global {
	namespace App {
		interface Locals {
			user: SessionUser | null;
			prefs: Prefs;
		}
	}
}

export {};

import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			// Verificarea CSRF se face in hooks.server.ts, fata de antetul Host:
			// cea din SvelteKit cere ORIGIN fixat la pornire, deci o adresa
			// configurata inainte de instalare.
			csrf: { trustedOrigins: ['*'] }
		})
	]
});

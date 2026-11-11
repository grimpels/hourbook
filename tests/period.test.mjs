import { previousPeriod } from '../src/lib/period.ts';
let f = 0; const ok = (c, m) => { if (!c) { console.log('  ESUAT:', m); f++; } else console.log('  ok:', m); };

console.log('perioada acoperita de raportul programat');
let p = previousPeriod('lunar', new Date(2026, 8, 1)); // 1 septembrie
ok(p.from === '2026-08-01' && p.to === '2026-08-31', `1 sept -> august intreg (${p.from}..${p.to})`);
p = previousPeriod('lunar', new Date(2026, 2, 1)); // 1 martie
ok(p.from === '2026-02-01' && p.to === '2026-02-28', `1 martie -> februarie complet (${p.from}..${p.to})`);
p = previousPeriod('lunar', new Date(2028, 2, 1)); // an bisect
ok(p.to === '2028-02-29', `an bisect: februarie are 29 de zile (${p.to})`);
p = previousPeriod('lunar', new Date(2026, 0, 1)); // 1 ianuarie
ok(p.from === '2025-12-01' && p.to === '2025-12-31', `1 ian -> decembrie anul trecut (${p.from}..${p.to})`);
p = previousPeriod('saptamanal', new Date(2026, 8, 14)); // luni 14 sept
ok(p.from === '2026-09-07' && p.to === '2026-09-13', `luni -> saptamana incheiata (${p.from}..${p.to})`);

p = previousPeriod('saptamanal', new Date(2026, 8, 14), 0); // saptamana incepe duminica
ok(p.from === '2026-09-06' && p.to === '2026-09-12', `duminica prima zi -> dum..sam (${p.from}..${p.to})`);
// Formatarea intervalului din titlu e verificata in format.test.mjs.

console.log(f ? `\n${f} esuate` : '\nToate verificarile au trecut');
process.exit(f ? 1 : 0);

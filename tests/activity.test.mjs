import { completeaza } from '../src/lib/activity.ts';
let f = 0; const ok = (c, m) => { if (!c) { console.log('  ESUAT:', m); f++; } else console.log('  ok:', m); };
const a = { description: 'Mentenanta', client_name: 'Comuna X', project_name: 'Site' };
const eq = (r, c, p) => r.client === c && r.project === p;

console.log('refolosirea unei activitati din istoric');
ok(eq(completeaza(a, '', ''), 'Comuna X', 'Site'), 'formular gol: aduce clientul si proiectul');
ok(eq(completeaza(a, 'Alt client', ''), 'Alt client', ''), 'alt client ales: nu-l schimba, nu leaga proiectul strain');
ok(eq(completeaza(a, 'comuna x', ''), 'comuna x', 'Site'), 'acelasi client (alte litere): aduce doar proiectul');
ok(eq(completeaza(a, 'Comuna X', 'Altul'), 'Comuna X', 'Altul'), 'proiect deja ales: ramane');
ok(eq(completeaza({ ...a, client_name: null, project_name: null }, '', ''), '', ''), 'activitate fara client');
ok(eq(completeaza(undefined, 'C', 'P'), 'C', 'P'), 'text care nu e in istoric: nimic nu se schimba');

console.log(f ? `\n${f} esuate` : '\nToate verificarile au trecut');
process.exit(f ? 1 : 0);

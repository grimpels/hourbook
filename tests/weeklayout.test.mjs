import { layoutZi } from '../src/lib/weeklayout.ts';
let f = 0; const ok = (c, m) => { if (!c) { console.log('  ESUAT:', m); f++; } else console.log('  ok:', m); };
const E = (id, start, end) => ({ id, start_min: start, end_min: end });
// 50 px minim la 44 px/ora => 69 de minute de spatiu vizual
const MIN = 69;

console.log('1. intrari care nu se ating');
let p = layoutZi([E(1, 9 * 60, 10 * 60), E(2, 14 * 60, 15 * 60)], MIN);
ok(p.get(1).col === 0 && p.get(2).col === 0, 'ambele pe prima coloana');
ok(p.get(1).of === 1 && p.get(2).of === 1, 'latime intreaga pentru fiecare');

console.log('2. suprapunere reala');
p = layoutZi([E(1, 9 * 60, 11 * 60), E(2, 10 * 60, 12 * 60)], MIN);
ok(p.get(1).col === 0 && p.get(2).col === 1, 'a doua trece pe coloana urmatoare');
ok(p.get(1).of === 2 && p.get(2).of === 2, 'ziua se imparte in doua');

console.log('3. doua intrari scurte, apropiate — se suprapun DOAR desenate');
p = layoutZi([E(1, 10 * 60, 10 * 60 + 5), E(2, 10 * 60 + 30, 10 * 60 + 35)], MIN);
ok(p.get(2).col === 1, 'a doua nu se aseaza peste prima');
ok(p.get(1).of === 2, 'latimea se imparte, ca sa se vada amandoua');

console.log('4. scurte, dar destul de departate');
p = layoutZi([E(1, 10 * 60, 10 * 60 + 5), E(2, 12 * 60, 12 * 60 + 5)], MIN);
ok(p.get(2).col === 0, 'la doua ore distanta stau pe aceeasi coloana');
ok(p.get(1).of === 1, 'fiecare pe toata latimea');

console.log('5. trei suprapuse');
p = layoutZi([E(1, 9 * 60, 12 * 60), E(2, 10 * 60, 11 * 60), E(3, 10 * 60 + 30, 13 * 60)], MIN);
ok(new Set([p.get(1).col, p.get(2).col, p.get(3).col]).size === 3, 'trei coloane distincte');
ok(p.get(1).of === 3, 'ziua se imparte in trei');

console.log('6. ordinea de intrare nu conteaza');
const a = layoutZi([E(1, 9 * 60, 11 * 60), E(2, 10 * 60, 12 * 60)], MIN);
const b = layoutZi([E(2, 10 * 60, 12 * 60), E(1, 9 * 60, 11 * 60)], MIN);
ok(a.get(1).col === b.get(1).col && a.get(2).col === b.get(2).col, 'acelasi rezultat, indiferent de ordine');

console.log(f ? `\n${f} verificari esuate` : '\nToate verificarile au trecut');
process.exit(f ? 1 : 0);

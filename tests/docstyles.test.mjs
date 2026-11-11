import { inlineDocStyles, DOC_STYLES } from '../src/lib/docstyles.ts';
let f = 0; const ok = (c, m) => { if (!c) { console.log('  ESUAT:', m); f++; } else console.log('  ok:', m); };

console.log('stiluri inline pentru email');
let h = inlineDocStyles('<div class="doc-total">1h 15m</div>');
ok(h.includes('font-size:26px'), 'clasa cunoscuta primeste stil');
ok(h.includes('class="doc-total"'), 'clasa ramane pe element');

h = inlineDocStyles('<td class="doc-eticheta" style="width: 55%">x</td>');
ok(h.includes('width: 55%'), 'stilul scris de utilizator se pastreaza');
ok(h.indexOf('display:block') < h.indexOf('width: 55%'), 'stilul clasei vine primul, deci al utilizatorului castiga');

ok(inlineDocStyles('<div class="necunoscut">x</div>') === '<div class="necunoscut">x</div>', 'clasa necunoscuta nu e atinsa');
ok(inlineDocStyles('<p>simplu</p>') === '<p>simplu</p>', 'element fara clasa nu e atins');

h = inlineDocStyles('<div class="semnaturi titlu">x</div>');
ok(h.includes('margin-top:20px') && h.includes('text-align:center'), 'doua clase, ambele stiluri');

ok(Object.keys(DOC_STYLES).length >= 10, 'harta acopera rolurile documentului');

console.log(f ? `\n${f} verificari esuate` : '\nToate verificarile au trecut');
process.exit(f ? 1 : 0);

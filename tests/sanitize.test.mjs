import { sanitizeHtml, fillPlaceholders } from '../src/lib/server/sanitize.ts';
let f = 0;
const ok = (c, m) => { if (!c) { console.log('  ESUAT:', m); f++; } else console.log('  ok:', m); };

console.log('1. ce trebuie sa dispara');
ok(!sanitizeHtml('<script>alert(1)</script>Text').includes('alert'), 'script sters cu tot cu continut');
ok(sanitizeHtml('<script>alert(1)</script>Text') === 'Text', 'ramane doar textul');
ok(!sanitizeHtml('<img src=x onerror=alert(1)>').includes('onerror'), 'eticheta nepermisa + handler');
ok(!sanitizeHtml('<p onclick="alert(1)">a</p>').includes('onclick'), 'handler pe eticheta permisa');
ok(!sanitizeHtml('<a href="javascript:alert(1)">x</a>').includes('javascript'), 'href javascript: respins');
ok(!sanitizeHtml('<style>body{display:none}</style>x').includes('display'), 'style sters cu tot cu continut');

console.log('2. ce trebuie sa ramana');
ok(sanitizeHtml('<p><strong>Bold</strong> si <em>italic</em></p>') === '<p><strong>Bold</strong> si <em>italic</em></p>', 'formatare de baza');
ok(sanitizeHtml('<p style="text-align: center;">x</p>').includes('text-align: center'), 'alinierea pastrata');
ok(!sanitizeHtml('<p style="position:fixed;top:0">x</p>').includes('position'), 'alt stil eliminat');
ok(sanitizeHtml('<a href="https://x.ro">l</a>').includes('rel="noopener"'), 'link https pastrat, cu rel');
ok(sanitizeHtml('<ul><li>a</li></ul>') === '<ul><li>a</li></ul>', 'liste');

console.log('3. substitutii');
const v = { client: 'Proger Global Network', total_ore: '1h 15m' };
ok(fillPlaceholders('<p>{client} — {total_ore}</p>', v) === '<p>Proger Global Network — 1h 15m</p>', 'inlocuire');
ok(fillPlaceholders('<p>{necunoscut}</p>', v) === '<p>{necunoscut}</p>', 'cheia necunoscuta ramane vizibila');
ok(fillPlaceholders('<p>{client}</p>', { client: '<script>x</script>' }) === '<p>&lt;script&gt;x&lt;/script&gt;</p>', 'valoarea substituita e escapata');


console.log('4. clase permise doar din lista');
ok(sanitizeHtml('<div class="semnaturi">x</div>') === '<div class="semnaturi">x</div>', 'clasa cunoscuta ramane');
ok(!sanitizeHtml('<div class="hack">x</div>').includes('class'), 'clasa necunoscuta dispare');
ok(sanitizeHtml('<div class="semnaturi hack">x</div>') === '<div class="semnaturi">x</div>', 'se pastreaza doar ce e pe lista');

ok(sanitizeHtml('<div class="doc-antet">x</div>').includes('doc-antet'), 'clasele de document sunt permise');
ok(sanitizeHtml('<span class="doc-total">1h</span>').includes('doc-total'), 'clasa totalului e permisa');

console.log(f ? `\n${f} verificari esuate` : '\nToate verificarile au trecut');
process.exit(f ? 1 : 0);

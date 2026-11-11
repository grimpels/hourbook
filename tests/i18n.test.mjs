import { ro } from '../src/lib/i18n/ro.ts';
import { en } from '../src/lib/i18n/en.ts';
import { translate, plural, segments } from '../src/lib/i18n/index.ts';
import { parseColumns, replaceRaport, hasRaport, columnToken, COLUMNS } from '../src/lib/docbody.ts';
import { withAliases, placeholderToken, PLACEHOLDERS } from '../src/lib/placeholders.ts';
import { fillPlaceholders } from '../src/lib/server/sanitize.ts';
let f = 0; const ok = (c, m) => { if (!c) { console.log('  ESUAT:', m); f++; } else console.log('  ok:', m); };

console.log('cataloagele au aceleasi chei si parametri');
const kr = Object.keys(ro), ke = Object.keys(en);
const lipsaEn = kr.filter((k) => !(k in en)), lipsaRo = ke.filter((k) => !(k in ro));
ok(!lipsaEn.length, `nicio cheie lipsa in engleza ${lipsaEn.join(' ')}`);
ok(!lipsaRo.length, `nicio cheie in plus in engleza ${lipsaRo.join(' ')}`);
// Exceptii: texte care CONTIN sintaxa documentelor, scrisa in limba lor.
const CONTINUT = new Set(['legend.example', 'legend.typoExample', 'templates.newBody']);
const params = (s) => [...String(s ?? '').matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
const dif = kr.filter((k) => !CONTINUT.has(k) && params(ro[k]) !== params(en[k]));
ok(!dif.length, `aceiasi parametri in ambele limbi ${dif.join(' ')}`);
const goale = ke.filter((k) => !String(en[k]).trim());
ok(!goale.length, `niciun text gol ${goale.join(' ')}`);
// Control: o diacritica romaneasca in catalogul englez inseamna text netradus.
const netradus = ke.filter((k) => /[ăâîșțĂÂÎȘȚ]/.test(en[k]));
ok(!netradus.length, `niciun text romanesc ramas in engleza ${netradus.join(' ')}`);
ok(PLACEHOLDERS.every((p) => `ph.${p.key}` in ro), 'fiecare variabila are eticheta');
ok(COLUMNS.every((c) => `col.${c.key}` in ro), 'fiecare coloana are nume');

console.log('traducere si plural');
ok(translate('ro', 'report.sent', { to: 'a@b.ro' }) === 'Raportul a fost trimis către a@b.ro', 'parametru');
ok(translate('en', 'report.sent', { to: 'a@b.ro' }) === 'The report was sent to a@b.ro', 'parametru, engleza');
ok(translate('ro', 'templates.newBody').includes('{raport}'), 'acoladele fara parametru raman (continut de sablon)');
const pr = (n) => plural('ro', 'report.intervals', n);
ok(pr(1) === '1 interval' && pr(2) === '2 intervale' && pr(19) === '19 intervale', 'romana: 1, 2-19');
ok(pr(20) === '20 de intervale' && pr(100) === '100 de intervale', 'romana: 20+ cu „de"');
ok(pr(101) === '101 intervale' && pr(119) === '119 intervale' && pr(120) === '120 de intervale', 'romana: 101-119 fara „de"');
ok(pr(0) === '0 intervale', 'romana: zero');
ok(plural('en', 'report.intervals', 1) === '1 interval' && plural('en', 'report.intervals', 20) === '20 intervals', 'engleza');
const s = segments('Pune {token} aici, nu {altceva}', { token: ['code', '{raport}'] });
ok(s.length === 3 && s[1].k === 'code' && s[1].v === '{raport}' && s[2].v === ' aici, nu {altceva}', 'segmente: doar parametrii marcati devin elemente');

console.log('documentele accepta numele englezesti');
ok(JSON.stringify(parseColumns('date, hours, activity').columns) === '["data","ore","activitate"]', 'coloane in engleza');
ok(JSON.stringify(parseColumns('data, project, durata').columns) === '["data","proiect","durata"]', 'amestec');
ok(parseColumns('date, foo').unknown.join() === 'foo', 'necunoscutele raman semnalate');
ok(hasRaport('<p>{report}</p>') && hasRaport('<p>{ Report: date }</p>'), '{report} e recunoscut');
ok(replaceRaport('<p>{report: date}</p>', (c) => c.join('|')).html === '<p>data</p>', '{report: date} -> tabel');
const v = withAliases({ proiect: 'Site', total_ore: '1h', cui: 'RO1' });
ok(fillPlaceholders('{project} {proiect} {total_hours} {tax_id}', v) === 'Site Site 1h RO1', 'variabile in ambele limbi');
ok(fillPlaceholders('{report}', v) === '{report}', 'substitutia nu atinge semnul tabelului');
ok(placeholderToken('cui', 'en') === 'tax_id' && placeholderToken('cui', 'ro') === 'cui', 'numele variabilei dupa limba');
ok(columnToken('ore', 'en') === 'hours' && columnToken('ore', 'ro') === 'ore', 'numele coloanei dupa limba');

console.log(f ? `\n${f} esuate` : '\nToate verificarile au trecut');
process.exit(f ? 1 : 0);

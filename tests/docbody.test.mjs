import { parseColumns, replaceRaport, hasRaport, effectiveBody, dropEmptyBlocks, DEFAULT_COLUMNS }
  from '../src/lib/docbody.ts';
let f = 0; const ok = (c, m) => { if (!c) { console.log('  ESUAT:', m); f++; } else console.log('  ok:', m); };

console.log('1. coloane');
ok(parseColumns(undefined).columns === DEFAULT_COLUMNS, 'fara specificatie -> coloanele implicite');
ok(parseColumns('data, ore').columns.join() === 'data,ore', 'lista simpla');
ok(parseColumns(' DATA ,  Ore ').columns.join() === 'data,ore', 'spatii si majuscule tolerate');
ok(parseColumns('data,inexistenta').unknown.join() === 'inexistenta', 'coloana necunoscuta raportata');
ok(parseColumns('doar,gresite').columns === DEFAULT_COLUMNS, 'daca nimic nu se potriveste, revine la implicit');

console.log('2. recunoasterea semnului');
ok(hasRaport('<p>{raport}</p>'), 'forma simpla');
ok(hasRaport('<p>{ raport : data }</p>'), 'cu spatii');
ok(hasRaport('<p>{RAPORT}</p>'), 'majuscule');
ok(!hasRaport('<p>{rapoarte}</p>'), 'cuvant asemanator, nu se potriveste');

console.log('3. inlocuire');
let r = replaceRaport('<p>A</p>{raport}<p>B</p>', (c) => `[TABEL:${c.join('|')}]`);
ok(r.html === '<p>A</p>[TABEL:data|interval|ore|activitate]<p>B</p>', 'inlocuit la locul lui');
r = replaceRaport('{raport: data,ore}...{raport: activitate}', (c) => `[${c.join('|')}]`);
ok(r.html === '[data|ore]...[activitate]', 'doua semne, coloane diferite fiecare');
r = replaceRaport('{raport: xyz}', (c) => `[${c.join('|')}]`);
ok(r.unknown.join() === 'xyz', 'coloanele gresite ajung la apelant ca sa fie semnalate');

console.log('4. compatibilitate cu antet/subsol');
ok(effectiveBody(null, '<p>H</p>', '<p>F</p>') === '<p>H</p>\n{raport}\n<p>F</p>', 'antet+subsol devin corp');
ok(effectiveBody('<p>corp</p>', '<p>H</p>', null) === '<p>corp</p>', 'corpul are prioritate');
ok(effectiveBody(null, null, null) === '', 'nimic definit -> gol');
ok(effectiveBody('   ', '<p>H</p>', null).includes('{raport}'), 'corp doar cu spatii = gol');

console.log('5. blocuri ramase goale');
ok(dropEmptyBlocks('<p>text</p><p></p>') === '<p>text</p>', 'paragraf gol scos');
ok(dropEmptyBlocks('<div class="doc-mic"><br></div>x') === 'x', 'bloc cu doar <br> scos');
ok(dropEmptyBlocks('<p>&nbsp;</p>') === '<p>&nbsp;</p>', 'spatiul scris intentionat ramane');
ok(dropEmptyBlocks('<div class="spatiu"></div>') === '<div class="spatiu"></div>', 'spatiul de semnatura ramane');
ok(dropEmptyBlocks('<div class="linie-semnatura"></div>').includes('linie-semnatura'), 'linia de semnatura ramane');
ok(dropEmptyBlocks('<p><span></span></p>') === '', 'bloc gol imbricat: se curata din interior');

console.log(f ? `\n${f} verificari esuate` : '\nToate verificarile au trecut');
process.exit(f ? 1 : 0);

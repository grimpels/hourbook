import {
	formatDay, formatRange, formatPeriod, formatTime, formatHour,
	formatDecimal, csvSeparator, dayNames, monthTitle,
	parseDay, parseTime, dayPattern
} from '../src/lib/format.ts';
import { startOfWeek } from '../src/lib/time.ts';
import { DEFAULT_PREFS, normalizePrefs } from '../src/lib/prefs.ts';
let f = 0; const ok = (c, m) => { if (!c) { console.log('  ESUAT:', m); f++; } else console.log('  ok:', m); };

const ro = DEFAULT_PREFS.ro;
const P = (o) => ({ ...ro, ...o });

console.log('formatul datei');
ok(formatDay('2026-01-31', ro) === '31.01.2026', 'implicit: 31.01.2026');
ok(formatDay('2026-01-31', P({ dateFormat: 'dmy/' })) === '31/01/2026', 'zi/luna/an cu bara');
ok(formatDay('2026-01-31', P({ dateFormat: 'mdy' })) === '01/31/2026', 'luna/zi/an');
ok(formatDay('2026-01-31', P({ dateFormat: 'iso' })) === '2026-01-31', 'ISO');

console.log('interval scurt in titlu (partea comuna o singura data)');
ok(formatRange('2026-09-07', '2026-09-13', ro) === '07 – 13.09.2026', 'aceeasi luna');
ok(formatRange('2026-09-28', '2026-10-04', ro) === '28.09 – 04.10.2026', 'luni diferite, acelasi an');
ok(formatRange('2025-12-29', '2026-01-04', ro) === '29.12.2025 – 04.01.2026', 'ani diferiti: intreg');
ok(formatRange('2026-09-07', '2026-09-07', ro) === '07.09.2026', 'o singura zi: fara interval');
ok(formatRange('2026-09-07', '2026-09-13', P({ dateFormat: 'dmy/' })) === '07 – 13/09/2026', 'cu bara');
ok(formatRange('2026-09-07', '2026-09-13', P({ dateFormat: 'mdy' })) === '09/07 – 09/13/2026', 'mdy: luna ramane (e prima)');
ok(formatRange('2025-12-29', '2026-01-04', P({ dateFormat: 'mdy' })) === '12/29/2025 – 01/04/2026', 'mdy, ani diferiti');
ok(formatRange('2026-09-07', '2026-09-13', P({ dateFormat: 'iso' })) === '2026-09-07 – 09-13', 'ISO: anul o data');
ok(formatPeriod('2026-09-01', '2026-09-30', ro) === '01.09.2026 – 30.09.2026', 'perioada din documente e intreaga');

console.log('ora');
ok(formatTime(0, ro) === '00:00' && formatTime(1439, ro) === '23:59', '24h: capetele zilei');
ok(formatTime(1440, ro) === '00:00', '24h: sfarsit la miezul noptii');
const h12 = P({ hour12: true });
ok(formatTime(0, h12) === '12:00 AM', '12h: miezul noptii e 12 AM');
ok(formatTime(59, h12) === '12:59 AM', '12h: 00:59 -> 12:59 AM');
ok(formatTime(720, h12) === '12:00 PM', '12h: amiaza e 12 PM');
ok(formatTime(785, h12) === '1:05 PM', '12h: 13:05 -> 1:05 PM');
ok(formatTime(1439, h12) === '11:59 PM', '12h: 23:59');
ok(formatHour(6, ro) === '06:00' && formatHour(6, h12) === '6 AM', 'ora din grila');
ok(formatHour(12, h12) === '12 PM' && formatHour(0, h12) === '12 AM', 'grila 12h: amiaza si miezul noptii');

console.log('zecimale si CSV');
ok(formatDecimal(105, ro) === '1,75', 'virgula implicita in romana');
ok(formatDecimal(105, P({ decimal: '.' })) === '1.75', 'punct');
ok(formatDecimal(0, ro) === '0,00', 'zero');
ok(csvSeparator(ro) === ';' && csvSeparator(P({ decimal: '.' })) === ',', 'separatorul CSV nu se bate cu cel zecimal');

console.log('saptamana si lunile');
ok(dayNames(ro)[0] === 'Lu' && dayNames(ro)[6] === 'Du', 'luni prima');
ok(dayNames(P({ weekStart: 0 }))[0] === 'Du' && dayNames(P({ weekStart: 0 }))[6] === 'Sâ', 'duminica prima');
ok(dayNames(DEFAULT_PREFS.en)[0] === 'Su', 'engleza, duminica prima');
ok(monthTitle(2026, 9, ro) === 'septembrie 2026' && monthTitle(2026, 9, DEFAULT_PREFS.en) === 'September 2026', 'numele lunii');
ok(startOfWeek('2026-09-11') === '2026-09-07', 'vineri -> lunea de dinainte');
ok(startOfWeek('2026-09-11', 0) === '2026-09-06', 'vineri -> duminica de dinainte');
ok(startOfWeek('2026-09-06', 0) === '2026-09-06', 'duminica e deja inceputul');
ok(startOfWeek('2026-09-06', 1) === '2026-08-31', 'duminica, cu luni prima: lunea trecuta');
ok(startOfWeek('2026-01-01', 0) === '2025-12-28' && startOfWeek('2026-01-01') === '2025-12-29', 'peste an');

console.log('citirea datei scrise de mana');
const R = '2026-11-11';
ok(parseDay('31.01.2026', ro, R) === '2026-01-31', 'dmy cu punct');
ok(parseDay('31/01/2026', P({ dateFormat: 'dmy/' }), R) === '2026-01-31', 'dmy cu bara');
ok(parseDay('1/2/26', P({ dateFormat: 'dmy/' }), R) === '2026-02-01', 'fara zerouri, an pe doua cifre');
ok(parseDay('01/31/2026', P({ dateFormat: 'mdy' }), R) === '2026-01-31', 'mdy');
ok(parseDay('2026-01-31', P({ dateFormat: 'iso' }), R) === '2026-01-31', 'ISO');
ok(parseDay('5.3', ro, R) === '2026-03-05', 'fara an: anul curent');
ok(parseDay('31.02.2026', ro, R) === null, 'zi inexistenta');
ok(parseDay('13/31/2026', P({ dateFormat: 'dmy/' }), R) === null, 'ordinea gresita e respinsa');
ok(parseDay('', ro, R) === null && parseDay('abc', ro, R) === null, 'gol / text');
ok(dayPattern(P({ dateFormat: 'dmy/' })) === 'ZZ/LL/AAAA' && dayPattern(DEFAULT_PREFS.en) === 'MM/DD/YYYY', 'sablonul campului');

console.log('citirea orei scrise de mana');
ok(parseTime('14:05') === 845 && parseTime('14.05') === 845 && parseTime('1405') === 845, '14:05 in trei feluri');
ok(parseTime('9') === 540 && parseTime('930') === 570 && parseTime('09:30') === 570, '9 / 930 / 09:30');
ok(parseTime('0:00') === 0 && parseTime('23:59') === 1439, 'capetele zilei');
ok(parseTime('2:05 PM') === 845 && parseTime('2p') === 840 && parseTime('12am') === 0 && parseTime('12 PM') === 720, 'AM/PM');
ok(parseTime('24:00') === null && parseTime('12:60') === null && parseTime('13pm') === null, 'ore invalide');
ok(parseTime('') === null && parseTime('12345') === null, 'gol / prea multe cifre');

console.log('preferinte validate');
ok(JSON.stringify(normalizePrefs(null, 'ro')) === JSON.stringify(ro), 'nimic salvat -> implicitele limbii');
ok(normalizePrefs({ lang: 'en' }, 'ro').dateFormat === 'mdy', 'limba aleasa aduce implicitele ei');
const rau = normalizePrefs({ lang: 'xx', dateFormat: 'zz', weekStart: 5, decimal: ';', hour12: 'da' }, 'ro');
ok(JSON.stringify(rau) === JSON.stringify(ro), 'valorile necunoscute cad pe implicit');
const bun = normalizePrefs({ weekStart: 0, hour12: true, decimal: '.' }, 'ro');
ok(bun.weekStart === 0 && bun.hour12 && bun.decimal === '.' && bun.lang === 'ro', 'valorile valide se pastreaza');

console.log(f ? `\n${f} esuate` : '\nToate verificarile au trecut');
process.exit(f ? 1 : 0);

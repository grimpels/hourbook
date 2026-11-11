// Test cu ceas controlat: verifica pragurile, expirarea si izolarea intre IP-uri.
import { checkLogin, recordFailure, recordSuccess, _setClock, _reset, PER_USER, PER_IP }
  from '../src/lib/server/ratelimit.ts';

let now = 1_000_000;
_setClock(() => now);
const A = '86.120.1.1', B = '86.120.9.9';
let fails = 0;
const ok = (cond, msg) => { if (!cond) { console.log('  ESUAT:', msg); fails++; } else console.log('  ok:', msg); };

_reset();
console.log('1. blocare dupa 5 incercari pe (IP, utilizator)');
for (let i = 0; i < 4; i++) { ok(checkLogin(A,'alice') === 0, `incercarea ${i+1} permisa`); recordFailure(A,'alice'); }
ok(checkLogin(A,'alice') === 0, 'incercarea 5 inca permisa');
recordFailure(A,'alice');
ok(checkLogin(A,'alice') > 0, 'a 6-a e blocata');
ok(Math.abs(checkLogin(A,'alice') - PER_USER.lockMs/1000) <= 1, 'asteptare ~15 minute');

console.log('2. alt IP nu e afectat');
ok(checkLogin(B,'alice') === 0, 'IP-ul B trece');

console.log('3. blocarea expira');
now += PER_USER.lockMs + 1000;
ok(checkLogin(A,'alice') === 0, 'dupa 15 min e din nou permis');

console.log('4. autentificarea reusita reseteaza contorul');
_reset(); now += 1000;
for (let i = 0; i < 4; i++) recordFailure(A,'alice');
recordSuccess(A,'alice');
for (let i = 0; i < 4; i++) { ok(checkLogin(A,'alice') === 0, `dupa succes, incercarea ${i+1} permisa`); recordFailure(A,'alice'); }

console.log('5. incercarile razlete nu se acumuleaza (fereastra expira)');
_reset();
for (let i = 0; i < 20; i++) { now += PER_USER.windowMs + 1000; recordFailure(A,'alice'); }
ok(checkLogin(A,'alice') === 0, '20 esecuri la > 15 min distanta nu blocheaza');

console.log('6. limita pe IP prinde incercarea cu multe nume de utilizator');
_reset(); now += 1000;
let blocat = false;
for (let i = 0; i < PER_IP.max && !blocat; i++) { recordFailure(A, 'user' + i); blocat = checkLogin(A, 'altcineva') > 0; }
ok(blocat, `blocat pe IP dupa ${PER_IP.max} nume diferite`);
ok(checkLogin(B, 'altcineva') === 0, 'alt IP nu e prins de limita pe IP');

console.log(fails ? `\n${fails} verificari esuate` : '\nToate verificarile au trecut');
process.exit(fails ? 1 : 0);

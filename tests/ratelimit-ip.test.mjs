import { checkLogin, recordFailure, _setClock, _reset, ipKey } from '../src/lib/server/ratelimit.ts';
let now = 1_000_000; _setClock(() => now); _reset();
let fails = 0;
const ok = (c, m) => { if (!c) { console.log('  ESUAT:', m); fails++; } else console.log('  ok:', m); };

console.log('1. reducerea la prefix /64');
ok(ipKey('203.0.113.135') === '203.0.113.135', 'IPv4 ramane intreg');
ok(ipKey('2001:db8:0:1::1') === ipKey('2001:db8:0:1:ffff:ffff:ffff:ffff'),
   'doua adrese din acelasi /64 dau aceeasi cheie');
ok(ipKey('2001:db8:0:1::1') !== ipKey('2001:db8:0:2::1'), '/64 diferit => cheie diferita');
ok(ipKey('::ffff:203.0.113.135') === '203.0.113.135', 'IPv4 impachetat in IPv6 e tratat ca IPv4');

console.log('2. rotirea adreselor in acelasi /64 nu ocoleste blocarea');
for (let i = 0; i < 5; i++) recordFailure(`2001:db8:0:1::${i + 1}`, 'alice');
ok(checkLogin('2001:db8:0:1::999', 'alice') > 0, 'a 6-a adresa din acelasi /64 e blocata');
ok(checkLogin('2001:db8:0:2::1', 'alice') === 0, 'alt /64 nu e afectat');

console.log(fails ? `\n${fails} verificari esuate` : '\nToate verificarile au trecut');
process.exit(fails ? 1 : 0);

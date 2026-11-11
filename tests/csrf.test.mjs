import { crossSiteForm } from '../src/lib/csrf.ts';
let f = 0; const ok = (c, m) => { if (!c) { console.log('  ESUAT:', m); f++; } else console.log('  ok:', m); };
const FORM = 'application/x-www-form-urlencoded';

console.log('formulare de pe alt site');
ok(!crossSiteForm('POST', FORM, 'https://time.example.com', 'time.example.com'), 'acelasi site: trece');
ok(!crossSiteForm('POST', FORM, 'http://203.0.113.5:3000', '203.0.113.5:3000'), 'pe IP si port, fara domeniu: trece');
ok(!crossSiteForm('POST', FORM, 'https://Time.Example.com', 'time.example.com'), 'litere mari in gazda: trece');
ok(crossSiteForm('POST', FORM, 'https://rau.example', 'time.example.com'), 'alt site: refuzat');
ok(crossSiteForm('POST', FORM, 'https://time.example.com.rau.example', 'time.example.com'), 'gazda care doar incepe la fel: refuzat');
ok(crossSiteForm('POST', 'multipart/form-data; boundary=x', 'https://rau.example', 'a.b'), 'multipart, alt site: refuzat');
ok(crossSiteForm('POST', 'text/plain', 'https://rau.example', 'a.b'), 'text/plain, alt site: refuzat');
ok(crossSiteForm('POST', FORM, null, 'time.example.com'), 'fara Origin: refuzat');
ok(crossSiteForm('POST', FORM, 'null', 'time.example.com'), 'Origin „null" (iframe izolat): refuzat');
ok(crossSiteForm('DELETE', FORM, 'https://rau.example', 'a.b'), 'DELETE, alt site: refuzat');

console.log('ce nu e formular nu se verifica aici');
ok(!crossSiteForm('GET', FORM, 'https://rau.example', 'a.b'), 'GET');
ok(!crossSiteForm('POST', 'application/json', 'https://rau.example', 'a.b'), 'JSON (browserul cere preflight CORS)');

console.log(f ? `\n${f} esuate` : '\nToate verificarile au trecut');
process.exit(f ? 1 : 0);

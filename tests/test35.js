// Brancher Pennylane pas à pas : deux chemins (j'ai accès / mon comptable), messages d'erreur clairs, réservé au propriétaire.
// Vraie base, comptes de test ; aucun vrai jeton n'est utilisé, aucun message n'est envoyé. Espace supprimé à la fin.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist'), OUT = __dirname + '/shots35';
fs.mkdirSync(OUT, { recursive: true });
const types = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(8097);
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 320, height: 640 }, serviceWorkers: 'block' }), p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8097/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1200); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'SCI Test Banque'); await p.click('#esp_btn'); await p.waitForTimeout(3000);
  await p.evaluate(() => { S.sci.gerant = 'Camille Test'; save(); });
  const espace = await p.evaluate(() => ESPACE);
  // 1. Réglages › Banque
  await p.evaluate(() => reglage('banque')); await p.waitForTimeout(700);
  await p.screenshot({ path: OUT + '/1-reglages.png' });
  ok('Réglages : rubrique Banque avec "Brancher Pennylane"', await p.evaluate(() => /Brancher Pennylane/.test(document.querySelector('#rgl-banque').innerText)));
  // 2. Assistant : choix
  await p.evaluate(() => assistantPennylane()); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/2-choix.png' });
  ok('deux chemins proposés', await p.evaluate(() => /J'ai accès à Pennylane/.test(document.getElementById('overlay').innerText) && /C'est mon comptable/.test(document.getElementById('overlay').innerText)));
  // 3. J'ai accès : étapes + collage
  await p.click('text=J\'ai accès à Pennylane'); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/3-moi.png', fullPage: true });
  ok('étapes Pennylane (Développeurs, Lecture seule, Comptes bancaires, Transactions)', await p.evaluate(() => { const t = document.getElementById('overlay').innerText; return /Développeurs/.test(t) && /Lecture seule/.test(t) && /Comptes bancaires/.test(t) && /Transactions/.test(t) && /Illimitée/.test(t); }));
  await p.fill('#overlay textarea[name=jeton]', 'abc'); await p.click('#mform button.primary'); await p.waitForTimeout(1500);
  ok('jeton trop court : message clair', await p.evaluate(() => /Ce n'est pas un jeton Pennylane/.test((document.getElementById('toast') || {}).innerText || '')));
  await p.fill('#overlay textarea[name=jeton]', 'faux-jeton-de-test-0123456789abcdefghijklmnop'); await p.click('#mform button.primary'); await p.waitForTimeout(6000);
  const t2 = await p.evaluate(() => (document.getElementById('toast') || {}).innerText || '');
  ok('faux jeton : refusé avec un message clair (' + t2.trim().slice(0, 70) + ')', /ne reconnaît pas ce jeton|refusé/.test(t2));
  ok('la fenêtre reste ouverte pour corriger', await p.evaluate(() => !document.getElementById('overlay').hidden));
  // 4. Mon comptable : message prêt
  await p.click('text=C\'est mon comptable'); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/4-comptable.png', fullPage: true });
  const msg = await p.evaluate(() => document.getElementById('msgCompta').value);
  ok('message au comptable complet', /SCI Test Banque/.test(msg) && /Lecture seule/.test(msg) && /Comptes bancaires/.test(msg) && /Transactions/.test(msg) && /Camille Test/.test(msg));
  ok('guillemets droits seulement', !/[«»“”]/.test(msg));
  ok('boutons Copier / E-mail / SMS', await p.evaluate(() => ['Copier', 'E-mail', 'SMS'].every(x => document.getElementById('overlay').innerText.includes(x))));
  const sw = await p.evaluate(() => document.documentElement.scrollWidth); ok('pas de débordement en 320 (' + sw + ')', sw <= 320);
  await p.evaluate(() => closeOverlay());
  // 5. Quelqu'un qui n'est pas propriétaire ne peut pas brancher (contrôle côté serveur)
  const p2 = await (await b.newContext({ serviceWorkers: 'block' })).newPage(); await p2.goto('http://localhost:8097/'); await p2.waitForTimeout(1000);
  const refus = await p2.evaluate(async e => { await SB.auth.signInWithPassword({ email: 'test-b@gestion-test.fr', password: 'TestMotDePasse-2026!' }); const r = await SB.rpc('banque_brancher', { e, jeton: 'faux-jeton-de-test-0123456789abcdefghijklmnop' }); const d = await SB.rpc('banque_debrancher', { e }); return [r.error && r.error.message, d.error && d.error.message]; }, espace);
  ok('autre compte : brancher refusé (' + refus[0] + ')', /Seul le propriétaire/.test(refus[0] || ''));
  ok('autre compte : débrancher refusé', /Seul le propriétaire/.test(refus[1] || ''));
  await p.evaluate(async e => { await SB.from('espaces').delete().eq('id', e); }, espace);
  console.log('ERREURS', errs); console.log('KO', KO);
  await b.close(); srv.close();
})().catch(e => { console.log('FATAL', e.message); srv.close(); process.exit(1); });

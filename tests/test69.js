// Notifications complètes : tous les types × téléphone / e-mail, interrupteurs enregistrés, raccourcis Tout / L'essentiel / Rien. Vraie base, compte de test.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); }).listen(8099);
let ok = 0, ko = 0; const t = (c, m) => { c ? ok++ : ko++; console.log((c ? 'OK ' : 'KO ') + m); };
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true, serviceWorkers: 'block' })).newPage();
  p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); await SB.from('notif_prefs').delete().eq('user_id', r.data.user.id); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test notifications'); await p.click('#esp_btn'); await p.waitForTimeout(2000);
  await p.evaluate(() => { location.hash = 'reglages'; render(); }); await p.waitForTimeout(500);
  await p.click('#rgl-notif summary'); await p.waitForTimeout(1500);
  const rows = await p.locator('.notif-l:not(.notif-h)').count();
  const NT = await p.evaluate(() => TYPES_NOTIF.length); t(rows === NT && NT >= 8, NT + ' types d\'alerte');
  t((await p.locator('.notif-sw').count()) === NT * 2, 'deux interrupteurs par type (📱 et ✉️)');
  const etat = () => p.evaluate(() => TYPES_NOTIF.map(([k]) => k + ':' + (veutNotif(k, 'push') ? 'P' : '-') + (veutNotif(k, 'mail') ? 'M' : '-')).join(' '));
  console.log(await etat());
  t(/demande:PM/.test(await etat()) && /loyer_recu:P-/.test(await etat()), 'réglages par défaut sensés (problème locataire : téléphone + e-mail ; loyer reçu : téléphone)');
  await p.locator('#rgl-notif').screenshot({ path: __dirname + '/shots58/notifs.png' });
  // couper "Loyer reçu" sur le téléphone, activer "Loyer en retard" par e-mail
  await p.locator('.notif-l', { hasText: 'Loyer reçu' }).locator('.notif-sw').first().click(); await p.waitForTimeout(800);
  await p.locator('.notif-l', { hasText: 'Loyer en retard' }).locator('.notif-sw').nth(1).click(); await p.waitForTimeout(800);
  const db = await p.evaluate(async () => (await SB.from('notif_prefs').select('types').maybeSingle()).data.types);
  t(db.loyer_recu.push === false && db.retard.mail === true, 'interrupteurs enregistrés sur le serveur');
  t(await p.locator('.notif-l', { hasText: 'Loyer reçu' }).locator('.notif-sw').first().getAttribute('aria-checked') === 'false', 'interrupteur affiché coupé');
  // rechargement
  await p.evaluate(async () => { NOTIF = { etat: '?', prefs: null }; await chargerNotif(); }); await p.waitForTimeout(500);
  t(/loyer_recu:-- /.test(await etat()) && /retard:PM/.test(await etat()), 'gardé après rechargement');
  await p.click('.notif-raccourcis button:nth-child(2)'); await p.waitForTimeout(800);
  const attendu = await p.evaluate(() => TYPES_NOTIF.map(([k, , , , , m]) => k + ':' + (ESSENTIEL_NOTIF.includes(k) ? 'P' + (m ? 'M' : '-') : '--')).join(' '));
  t((await etat()) === attendu && /retard:P- /.test(attendu) && /demande:PM/.test(attendu) && /banque:PM/.test(attendu), '"L\'essentiel" : retards, problèmes des locataires, banque');
  await p.click('.notif-raccourcis button:nth-child(3)'); await p.waitForTimeout(800);
  t(!/P|M/.test((await etat()).replace(/[a-z_]+:/g, '')), '"Rien" : tout coupé');
  await p.click('.notif-raccourcis button:nth-child(1)'); await p.waitForTimeout(800);
  t(/loyer_recu:P- .*demande:PM .*banque:PM/.test(await etat()), '"Tout" : tout sur le téléphone, e-mail pour l\'important');
  t(new RegExp(NT + ' alertes sur ' + NT).test(await p.locator('#rgl-notif summary').innerText()), 'résumé de la rubrique à jour ("' + NT + ' alertes sur ' + NT + '")');
  t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  await p.evaluate(async () => { await SB.from('notif_prefs').delete().eq('user_id', SB_USER.id); await SB.from('espaces').delete().eq('id', ESPACE); });
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

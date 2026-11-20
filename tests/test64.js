// Tous mes espaces sur un écran + Prochaines sorties (vraie base, compte de test avec 2 espaces).
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
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500);
  const cree = async (nom, fn) => { await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', nom); await p.click('#esp_btn'); await p.waitForTimeout(2000); await p.evaluate(fn); await p.waitForTimeout(2000); return p.evaluate(() => ESPACE); };
  const e1 = await cree('SCI Tous Un', () => { S.sci.nom = 'SCI Tous Un'; S.biens.push({ id: 'b1', nom: 'T2', adresse: '1 rue', cp: '35000', ville: 'Rennes' }); const d = new Date(TODAY); d.setDate(d.getDate() - 6);
    S.baux.push({ id: 'l1', bienId: 'b1', nom: 'Jean Retard', typeBail: 'vide', dateEntree: addM(CUR, -1) + '-01', suiviDepuis: CUR, loyerHC: '700', charges: '0', jourPaiement: String(d.getDate()), revisions: [] }); save(); });
  const e2 = await cree('Biens perso', () => { S.sci.nom = 'Biens perso'; S.biens.push({ id: 'b2', nom: 'Studio', adresse: '2 rue', cp: '35000', ville: 'Rennes' }, { id: 'b3', nom: 'Garage', adresse: '3 rue', cp: '35000', ville: 'Rennes' });
    S.baux.push({ id: 'l2', bienId: 'b2', nom: 'Léa Ok', typeBail: 'vide', dateEntree: addM(CUR, -1) + '-01', suiviDepuis: CUR, loyerHC: '500', charges: '0', jourPaiement: '1', revisions: [] }); S.paiements.push({ id: 'p', bailId: 'l2', mois: CUR, montant: 500, date: iso(TODAY) }); save(); });
  await p.evaluate(() => { location.hash = ''; render(); }); await p.waitForTimeout(500);
  t(await p.isVisible('a[href="#tous"]'), 'accueil : carte "🏢 Tous mes espaces"');
  await p.evaluate(() => { location.hash = 'tous'; }); await p.waitForSelector('.tous-g', { timeout: 30000 }); await p.waitForTimeout(300);
  const txt = await p.locator('#app').innerText(); console.log(txt.slice(0, 900));
  await p.screenshot({ path: __dirname + '/shots58/tous.png', fullPage: true });
  t(/SCI Tous Un/.test(txt) && /Biens perso/.test(txt), 'les 2 espaces sont là');
  t(/500,00\s€\nsur 1\s200,00\s€ attendus/.test(txt) || /500,00\s€[\s\S]*sur 1\s200,00/.test(txt), 'total des loyers du mois de tous les espaces (500 / 1 200 €)');
  t(/Jean Retard[\s\S]*700,00/.test(txt), 'retard de Jean visible avec le montant');
t(/Rien d'urgent/.test(await p.locator('.tous-c', { hasText: 'Biens perso' }).innerText()) && !/Rien d'urgent/.test(await p.locator('.tous-c', { hasText: 'SCI Tous Un' }).innerText()), 'espace sans souci : "✓ Rien d\'urgent"');
  t(txt.indexOf('SCI Tous Un') < txt.indexOf('Biens perso'), 'l\'espace qui a des soucis est en premier');
  // ouvrir l'autre espace depuis la page
  const autre = await p.evaluate(e => ESPACE === e, e2) ? 'SCI Tous Un' : 'Biens perso';
  await p.locator('.tous-c', { hasText: autre }).locator('button:has-text("Ouvrir")').click(); await p.waitForTimeout(3000);
  t(await p.evaluate(n => S.sci.nom === n && location.hash === '', autre), 'bouton Ouvrir : bascule sur l\'espace, à l\'accueil');
  // Prochaines sorties
  await p.evaluate(() => { location.hash = 'bientot'; }); await p.waitForTimeout(2000);
  t(/Prochaines sorties/.test(await p.locator('#app').innerText()) && (await p.locator('.bientot-c').count()) >= 5, 'page "🚀 Prochaines sorties"');
  const avant = await p.evaluate(() => ENVIES.nb['signature-distance'] || 0);
  await p.locator('.bientot-c', { hasText: 'Signature électronique' }).locator('button').click(); await p.waitForTimeout(1500);
  const apres = await p.evaluate(() => ({ n: ENVIES.nb['signature-distance'], moi: ENVIES.miennes.has('signature-distance') }));
  t(apres.moi && apres.n === avant + 1, '"Ça m\'intéresse" : compté (' + apres.n + ')');
  await p.screenshot({ path: __dirname + '/shots58/bientot.png' });
  await p.evaluate(() => { ENVIES = null; render(); }); await p.waitForTimeout(2000);
  t(await p.evaluate(() => ENVIES.miennes.has('signature-distance')), 'gardé après rechargement');
  await p.locator('.bientot-c', { hasText: 'Signature électronique' }).locator('button').click(); await p.waitForTimeout(1500);
  t(await p.evaluate(a => !ENVIES.miennes.has('signature-distance') && (ENVIES.nb['signature-distance'] || 0) === a, avant), 'retouché : retiré');
  t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  await p.evaluate(async ids => { for (const id of ids) await SB.from('espaces').delete().eq('id', id); }, [e1, e2]);
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

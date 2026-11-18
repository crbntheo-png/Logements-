// 1) Supprimer un bien : visible sur sa fiche (Plus › Supprimer), retour à la liste, explication s'il a des locataires.
// 2) L'appli rouvre sur la page où on était (et le même onglet de Compta) ; l'actualisation ne change pas de page.
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); }).listen(8099);
let ok = 0, ko = 0; const t = (c, m) => { c ? ok++ : ko++; console.log((c ? 'OK ' : 'KO ') + m); };
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const ctx = await b.newContext({ ...devices['iPhone 13'], ignoreHTTPSErrors: true, serviceWorkers: 'block' }); const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(1500);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test suppression'); await p.click('#esp_btn'); await p.waitForTimeout(2000);
  const ESP = await p.evaluate(() => ESPACE);
  await p.evaluate(async () => { S.biens.push({ id: 'b1', nom: 'Appart 1er étage', adresse: '1 rue', cp: '35000', ville: 'Rennes' }, { id: 'b2', nom: 'Local loué', adresse: '2 rue', cp: '35000', ville: 'Rennes' });
    S.baux.push({ id: 'l1', bienId: 'b2', nom: 'Jean Test', typeBail: 'vide', dateEntree: '2026-01-01', suiviDepuis: '2026-11', loyerHC: '500', charges: '0', jourPaiement: '5', revisions: [] });
    save(); await new Promise(r => setTimeout(r, 1500)); go('bien-b1'); render(); });
  await p.waitForTimeout(500);
  await p.locator('.head .menu-plus summary').click(); await p.waitForTimeout(200);
  t(await p.isVisible('button:has-text("Supprimer ce bien")'), 'fiche du bien › Plus : "🗑 Supprimer ce bien"');
  await p.click('button:has-text("Supprimer ce bien")'); await p.waitForTimeout(300);
  t(/Supprimer « Appart 1er étage »/.test(await p.locator('#overlay').innerText()), 'confirmation claire');
  await p.click('#cyes'); await p.waitForTimeout(2500);
  const r1 = await p.evaluate(async () => ({ h: location.hash, n: S.biens.length, srv: (await SB.from('docs').select('doc_id').eq('espace_id', ESPACE).eq('coll', 'biens')).data.map(x => x.doc_id) }));
  t(r1.h === '#biens' && r1.n === 1 && r1.srv.length === 1 && r1.srv[0] === 'b2', 'supprimé (appli et serveur), retour à la liste des biens ' + JSON.stringify(r1));
  await p.evaluate(() => supprimerBien('b2')); await p.waitForTimeout(300);
  t(/Ce bien a des locataires/.test(await p.locator('#overlay').innerText()) && /Jean Test/.test(await p.locator('#overlay').innerText()), 'bien avec locataire : explique quoi faire (au lieu d\'un refus muet)');
  await p.evaluate(() => closeOverlay());
  // rouvrir l'appli sur la même page et le même onglet
  await p.evaluate(() => { go('compta'); render(); }); await p.waitForTimeout(300);
  await p.locator('.c-onglets button', { hasText: 'Dépenses' }).click(); await p.waitForTimeout(300);
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(6000); // comme une réouverture de l'appli installée (adresse de départ, sans page)
  const r2 = await p.evaluate(() => ({ h: location.hash, o: view.comptaOnglet, titre: (document.querySelector('#app h1') || {}).innerText }));
  t(r2.h === '#compta' && r2.o === 'depenses' && /Compta/.test(r2.titre), 'réouverture : de retour sur Compta, onglet Dépenses ' + JSON.stringify(r2));
  await p.evaluate(async () => { await rafraichirTout(); }); await p.waitForTimeout(800);
  t((await p.evaluate(() => location.hash)) === '#compta', 'actualiser (tirer vers le bas) : reste sur la même page');
  await p.evaluate(() => { localStorage.setItem('gestion-sci-page', JSON.stringify({ h: '#afaire', t: Date.now() - 7 * 3600e3 })); });
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(5000);
  t(['', '#'].includes(await p.evaluate(() => location.hash)), 'après plus de 6 h : l\'appli rouvre sur l\'accueil');
  t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  await p.evaluate(async esp => { await SB.from('espaces').delete().eq('id', esp); }, ESP);
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

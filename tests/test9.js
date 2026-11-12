// Test de bout en bout de la version installable contre la vraie base Supabase
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = require('path').join(__dirname, '..', 'dist'), out = __dirname + '/shots9';
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); }).listen(8099);
const MDP = 'TestMotDePasse-2026!';
const log = (...a) => console.log(...a);
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: "localhost,127.0.0.1" } } : {});
  const errs = [];
  const nouvelle = async (vp) => { const ctx = await b.newContext({ viewport: vp, ignoreHTTPSErrors: true, serviceWorkers: 'block' }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text())); await p.route('**/jspdf.umd.min.js', r => r.fulfill({ path: __dirname + '/vendor/jspdfpkg/package/dist/jspdf.umd.min.js', contentType: 'application/javascript' })); return p; };
  const connecter = async (p, email) => { await p.evaluate(async ([e, m]) => { const r = await SB.auth.signInWithPassword({ email: e, password: m }); if (r.error) throw new Error(r.error.message); await apresConnexion(r.data.user); }, [email, MDP]); await p.waitForTimeout(800); };
  // A : connexion, écran de connexion d'abord
  const A = await nouvelle({ width: 390, height: 844 });
  await A.goto('http://localhost:8099/'); await A.waitForTimeout(1500);
  log('MODE initial A', await A.evaluate(() => MODE));
  await A.screenshot({ path: out + '/1-connexion.png' });
  await connecter(A, 'test-a@gestion-test.fr');
  log('MODE après connexion A', await A.evaluate(() => MODE));
  await A.screenshot({ path: out + '/2-nouvel-espace.png' });
  await A.fill('#esp_nom', 'SCI Test A'); await A.click('#esp_btn'); await A.waitForTimeout(1500);
  log('Espace A', await A.evaluate(() => [MODE, ESPACE, S.sci.nom]));
  // ajouter un bien et un locataire
  await A.evaluate(() => { S.biens.push({ id: 'b1', nom: 'Studio test', type: 'Studio', adresse: '1 rue Test', cp: '35000', ville: 'Rennes', meuble: 'vide' }); S.baux.push({ id: 'l1', bienId: 'b1', nom: 'Jean Test', typeBail: 'vide', dateEntree: '2026-01-01', suiviDepuis: '2026-11', loyerHC: '500', charges: '20', jourPaiement: '5', revisions: [] }); save(); render(); });
  await A.waitForTimeout(1500);
  // recharger : les données reviennent du serveur
  await A.reload(); await A.waitForTimeout(2500);
  log('Après rechargement A', await A.evaluate(() => [MODE, S.biens.length, S.baux.length, S.sci.nom]));
  await A.screenshot({ path: out + '/3-accueil-A.png', fullPage: true });
  // B : ne voit rien
  const B = await nouvelle({ width: 1280, height: 860 });
  await B.goto('http://localhost:8099/'); await B.waitForTimeout(1200);
  await connecter(B, 'test-b@gestion-test.fr');
  log('B sans invitation', await B.evaluate(() => [MODE, ESPACES.length]));
  const fuite = await B.evaluate(async (id) => { const r = await SB.from('docs').select('*').eq('espace_id', id); return [r.data && r.data.length, r.error && r.error.message]; }, await A.evaluate(() => ESPACE));
  log('B lit les données de A ?', fuite);
  const ecrit = await B.evaluate(async (id) => { const r = await SB.from('docs').insert({ espace_id: id, coll: 'biens', doc_id: 'pirate', data: { id: 'pirate' } }); return r.error ? 'refusé: ' + r.error.code : 'ACCEPTÉ'; }, await A.evaluate(() => ESPACE));
  log('B écrit chez A ?', ecrit);
  // A invite B
  await A.evaluate(() => location.hash = 'reglages'); await A.waitForTimeout(1200);
  await A.fill('#inv_email', 'test-b@gestion-test.fr'); await A.click('form.row button.primary'); await A.waitForTimeout(1500);
  await A.screenshot({ path: out + '/4-membres.png', fullPage: true });
  // B se reconnecte : rejoint l'espace
  await B.evaluate(() => apresConnexion(SB_USER)); await B.waitForTimeout(2500);
  await B.evaluate(id => ouvrirEspace(id), await A.evaluate(() => ESPACE)); await B.waitForTimeout(2500);
  log('B après invitation', await B.evaluate(() => [MODE, ESPACES.map(e => e.nom), S.baux.map(x => x.nom)]));
  // temps réel : A marque le loyer payé, B le voit
  await A.evaluate(() => location.hash = 'locataires'); await A.waitForTimeout(500);
  await A.evaluate(() => { S.paiements.push({ id: 'p1', bailId: 'l1', mois: '2026-11', montant: 520, date: '2026-11-08', mode: 'virement' }); save(); render(); });
  await B.waitForTimeout(4000);
  log('B voit le paiement en direct ?', await B.evaluate(() => S.paiements.length));
  await B.screenshot({ path: out + '/5-accueil-B.png', fullPage: true });
  // envoi d'e-mail : pas encore configuré
  // nettoyage
  const idA = await A.evaluate(() => ESPACE);
  await A.evaluate(async (id) => { await SB.from('espaces').delete().eq('id', id); }, idA);
  log('ERRORS', errs);
  await b.close(); srv.close();
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

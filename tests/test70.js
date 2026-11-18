// Qui a fait quoi : une action d'une PERSONNE est à son nom ; une action AUTOMATIQUE de l'appli (pointage d'un virement)
// est marquée "🤖 L'appli (automatiquement, sur le téléphone de …)". Vraie base, vrai navigateur (le signal x-auto doit passer).
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
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test qui a fait quoi'); await p.click('#esp_btn'); await p.waitForTimeout(2000);
  await p.evaluate(async () => { S.biens.push({ id: 'b1', nom: 'T2', adresse: '1 rue', cp: '35000', ville: 'Rennes' }); S.baux.push({ id: 'jean', bienId: 'b1', nom: 'Jean Dupontel', typeBail: 'vide', dateEntree: '2026-09-01', suiviDepuis: '2026-11', loyerHC: '500', charges: '0', jourPaiement: '5', revisions: [] }); save(); await new Promise(r => setTimeout(r, 2000)); });
  // 1. action d'une personne : paiement saisi à la main
  await p.evaluate(async () => { S.paiements.push({ id: 'pmain', bailId: 'jean', mois: '2026-11', montant: 100, date: '2026-11-06', mode: 'especes' }); save(); await new Promise(r => setTimeout(r, 2000)); });
  // 2. action automatique : virement lu dans la banque, pointé par l'appli
  await p.evaluate(async () => { BANQUE = { etat: 'ok', lien: { source: 'enablebanking' }, ops: [{ tx_id: '4242', date: '2026-11-05', montant: 400, libelle: 'VIR JEAN DUPONTEL' }], comptes: [], opsTous: [], comptesTous: [] }; rapprocherBanque(); await new Promise(r => setTimeout(r, 2500)); });
  const lignes = await p.evaluate(async () => (await SB.from('docs').select('doc_id, auto').eq('espace_id', ESPACE).eq('coll', 'paiements')).data);
  console.log(JSON.stringify(lignes));
  t(lignes.length === 2, 'les deux paiements sont bien enregistrés sur le serveur (le signal passe)');
  t(lignes.find(x => x.doc_id === 'pmain').auto === false, 'paiement saisi à la main : marqué "personne"');
  t(lignes.find(x => x.doc_id !== 'pmain').auto === true, 'virement pointé par l\'appli : marqué "automatique"');
  // suppressions : une à la main, une automatique
  await p.evaluate(async () => { S.paiements = S.paiements.filter(x => x.id !== 'pmain'); save(); await new Promise(r => setTimeout(r, 1500)); S.paiements = []; saveAuto(); await new Promise(r => setTimeout(r, 2000)); HISTO = null; location.hash = 'historique'; render(); });
  await p.waitForTimeout(2500);
  const h = await p.locator('#app').innerText(); console.log(h.replace(/\n+/g, ' | ').slice(0, 600));
  t(/Test\s*\|?\s*a supprimé le paiement de Jean Dupontel 100,00/.test(h.replace(/\n+/g, ' | ')), 'Historique : "Test a supprimé…" pour l\'action faite à la main');
  t(/L'appli \(automatiquement, sur le téléphone de Test\)[\s\S]*a supprimé le paiement de Jean Dupontel 400,00/.test(h), 'Historique : "🤖 L\'appli (automatiquement, sur le téléphone de Test)…" pour l\'action automatique');
  await p.screenshot({ path: __dirname + '/shots58/qui.png' });
  t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  await p.evaluate(async () => { await SB.from('espaces').delete().eq('id', ESPACE); });
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

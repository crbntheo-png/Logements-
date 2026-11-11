const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const DIST = require('path').join(__dirname, '..', 'dist'), GTP = '1be09613-be2e-49f7-85ca-583ebecc723c';
const sql = q => execSync(`python3 ${__dirname}/sql.py ${JSON.stringify(q)}`, { env: process.env }).toString();
const types = { '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); }).listen(8099);
(async () => {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } }); const errs = [];
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true, serviceWorkers: 'block' })).newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.route('**/jspdf.umd.min.js', r => r.fulfill({ path: __dirname + '/vendor/jspdfpkg/package/dist/jspdf.umd.min.js', contentType: 'application/javascript' }));
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1200);
  if (await p.evaluate(() => MODE) !== 'nouvel-espace') await p.evaluate(() => { MODE = 'nouvel-espace'; render(); });
  await p.fill('#esp_nom', 'Copie GTP'); await p.click('#esp_btn'); await p.waitForTimeout(1500);
  const E = await p.evaluate(() => ESPACE);
  sql(`insert into docs (espace_id, coll, doc_id, data) select '${E}', coll, doc_id, data from docs where espace_id='${GTP}' on conflict (espace_id, coll, doc_id) do update set data = excluded.data; insert into banque select '${E}', tx_id, date, montant, libelle, compte from banque where espace_id='${GTP}'; insert into banque_comptes select '${E}', compte_id, nom, solde, maj_le from banque_comptes where espace_id='${GTP}'; insert into banque_liens (espace_id, derniere_synchro) values ('${E}', now());`);
  await p.reload(); await p.waitForTimeout(4000);
  console.log('espace', await p.evaluate(() => [S.sci.nom, ESPACE === E] , E).catch(() => 0));
  const r = await p.evaluate(() => S.baux.map(b => { const e = echeance(b, CUR); return `${b.nom}: ${e ? e.statut + ' payé ' + e.paye : '-'} | ` + S.paiements.filter(x => x.bailId === b.id).map(x => `${x.mois} ${x.montant} tx=${x.tx || 'manuel'}`).join(', '); }));
  console.log(r.join('\n'));
  console.log('toasts/banque', await p.evaluate(() => [BANQUE.etat, BANQUE.ops.length, BANQUE.comptes.map(c => c.solde)]));
  // 2e passage : rien de neuf (pas de doublon)
  console.log('2e rapprochement', await p.evaluate(() => rapprocherBanque()), 'paiements', await p.evaluate(() => S.paiements.length));
  await p.screenshot({ path: __dirname + '/b17-accueil.png' });
  await p.evaluate(() => location.hash = 'compta'); await p.waitForTimeout(500); await p.screenshot({ path: __dirname + '/b17-compta.png', fullPage: true });
  // actualiser via le serveur sur la copie : pas de jeton => 0, pas d'erreur
  console.log('actualiser', await p.evaluate(async () => (await SB.rpc('banque_actualiser', { e: ESPACE })).error?.message || 'ok'));
  await p.evaluate(async () => { await SB.from('espaces').delete().eq('id', ESPACE); });
  console.log('reste copie', sql(`select count(*) from banque where espace_id='${E}'`));
  console.log('ERR', errs); await b.close(); srv.close();
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

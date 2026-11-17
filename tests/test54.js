// Signature au doigt, vraie base : le PDF signé est rangé dans les documents du logement (stockage réel),
// rattaché au locataire, ouvrable ; avertissement si on ferme sans ranger. Compte de test, espace supprimé à la fin.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); }).listen(8099);
let ok = 0, ko = 0; const t = (c, m) => { c ? ok++ : ko++; console.log((c ? 'OK ' : 'KO ') + m); };
async function dessiner(p) { const bx = await p.locator('#sigZone').boundingBox(); await p.mouse.move(bx.x + 30, bx.y + 100); await p.mouse.down(); for (let i = 1; i <= 15; i++) await p.mouse.move(bx.x + 30 + i * 14, bx.y + 100 - Math.sin(i / 2) * 40); await p.mouse.up(); }
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true, serviceWorkers: 'block' })).newPage();
  p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
  await p.route('**/jspdf.umd.min.js', r => r.fulfill({ path: __dirname + '/vendor/jspdfpkg/package/dist/jspdf.umd.min.js', contentType: 'application/javascript' }));
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test signature'); await p.click('#esp_btn'); await p.waitForTimeout(2000);
  await p.evaluate(() => { S.biens.push({ id: 'b1', nom: 'Studio Rennes', type: 'Studio', adresse: '1 rue', cp: '35000', ville: 'Rennes', meuble: 'vide' });
    S.baux.push({ id: 'l1', bienId: 'b1', nom: 'Jean Test', typeBail: 'vide', dateEntree: '2026-01-01', suiviDepuis: '2026-11', loyerHC: '500', charges: '0', jourPaiement: '5', revisions: [] }); save(); render(); docBailOpen('l1'); });
  await p.waitForTimeout(400);
  await p.click('#dsigner'); await p.waitForTimeout(200);
  await p.locator('.sig-liste li').nth(1).locator('button').click(); await dessiner(p); await p.click('#sigOk'); await p.waitForTimeout(200);
  t(await p.isVisible('#sigRanger'), 'bouton "Ranger le PDF signé dans le logement"');
  t(/sinon, la signature est perdue/.test(await p.locator('#sigpad').innerText()), 'prévient que la signature est perdue sans rangement');
  // fermer sans ranger : avertissement, le document reste ouvert
  await p.keyboard.press('Escape'); await p.click('.docbar .fermer'); await p.waitForTimeout(200);
  t(await p.isVisible('#sigpad >> text=pas encore rangée') && await p.isVisible('#paper'), 'fermer sans ranger : avertissement, document gardé');
  await p.click('#sigRanger'); await p.waitForTimeout(4000);
  await p.screenshot({ path: __dirname + '/shots53/range.png' });
  const F = await p.evaluate(() => S.fichiers.map(f => ({ nom: f.nom, bien: f.bienId, bail: f.bailId, cat: f.cat, chemin: f.chemin, signe: f.signe, taille: f.taille })));
  console.log(JSON.stringify(F));
  const f = F[0] || {};
  t(F.length === 1 && f.bien === 'b1' && f.bail === 'l1' && f.cat === 'Bail' && f.signe, 'PDF signé rangé dans Studio Rennes, rattaché à Jean Test, catégorie Bail');
  t(/^Bail \(signé le \d\d\/\d\d\/\d{4}\)$/.test(f.nom || ''), 'nom clair : ' + f.nom);
  t(/Le PDF signé est rangé/.test(await p.locator('#sigpad').innerText()), 'message "rangé"');
  const dl = await p.evaluate(async c => { const r = await SB.storage.from('documents').download(c); if (r.error) return { err: r.error.message }; const t = await r.data.text(); return { pdf: t.startsWith('%PDF'), images: (t.match(/\/Subtype \/Image/g) || []).length }; }, f.chemin);
  t(dl.pdf && dl.images >= 1, `fichier rangé = vrai PDF avec la signature (${JSON.stringify(dl)})`);
  await p.keyboard.press('Escape'); await p.click('.docbar .fermer'); await p.waitForTimeout(200);
  t(!(await p.isVisible('#paper')), 'une fois rangé, le document se ferme normalement');
  t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  await p.evaluate(async () => { closeOverlay(); const c = S.fichiers.filter(f => f.chemin).map(f => f.chemin); await SB.storage.from('documents').remove(c); await SB.from('espaces').delete().eq('id', ESPACE); });
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

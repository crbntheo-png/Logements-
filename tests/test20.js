const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = require('path').join(__dirname, '..', 'dist'), out = __dirname + '/shots20';
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); }).listen(8099);
const MDP = 'TestMotDePasse-2026!';
(async () => {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } }); const errs = [];
  const nouvelle = async () => { const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true, serviceWorkers: 'block' })).newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && !/400|403/.test(m.text()) && errs.push(m.text())); await p.route('**/jspdf.umd.min.js', r => r.fulfill({ path: __dirname + '/vendor/jspdfpkg/package/dist/jspdf.umd.min.js', contentType: 'application/javascript' })); await p.goto('http://localhost:8099/'); await p.waitForTimeout(1200); return p; };
  const p = await nouvelle();
  await p.evaluate(async m => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: m }); await apresConnexion(r.data.user); }, MDP); await p.waitForTimeout(1500);
  if (await p.evaluate(() => MODE) !== 'partage') { await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); }
  await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test EDL'); await p.click('#esp_btn'); await p.waitForTimeout(1500);
  await p.evaluate(() => { S.biens.push({ id: 'b1', nom: 'Agon 3e', type: 'Appartement', adresse: '3 rue de l\'Église', cp: '50230', ville: 'Agon', meuble: 'meuble', pieces: 3, surface: 55 }); S.baux.push({ id: 'l1', bienId: 'b1', nom: 'Sofiane Test', typeBail: 'meuble', dateEntree: '2026-09-28', suiviDepuis: '2026-11', loyerHC: '750', charges: '0', jourPaiement: '5', revisions: [] }); save(); location.hash = 'bail-l1'; });
  await p.waitForTimeout(800); await p.screenshot({ path: out + '/1-fiche.png', fullPage: true });
  await p.evaluate(() => nouvelEdl('l1', 'entree')); await p.waitForTimeout(500);
  await p.evaluate(() => { const e = S.edl[0]; e.compteurs.elec = '12345'; e.cles = '2 clés'; save(); etatEdl(e.id, 0, 'bon'); etatEdl(e.id, 1, 'usage'); });
  await p.locator('textarea').first().fill('Trou de cheville mur gauche'); await p.locator('textarea').first().dispatchEvent('change');
  const inputs = p.locator('input[type=file]');
  await inputs.nth(1).setInputFiles([__dirname + '/photo0.jpg', __dirname + '/photo1.jpg']); await p.waitForTimeout(6000);
  const e1 = await p.evaluate(() => S.edl[0]); console.log('entrée', e1.pieces.slice(0, 2).map(x => [x.nom, x.etat, x.commentaire, x.photos.length]), 'inventaire', e1.inventaire && e1.inventaire.length);
  await p.screenshot({ path: out + '/2-edl.png', fullPage: true });
  // rechargement : tout revient du serveur + photos visibles
  await p.reload(); await p.waitForTimeout(4000);
  console.log('après rechargement', await p.evaluate(() => [S.edl.length, S.edl[0].pieces[0].photos.length]), 'img chargées', await p.evaluate(() => [...document.querySelectorAll('img[data-photo]')].filter(i => i.complete && i.naturalWidth > 0).length));
  // sortie : comparaison
  await p.evaluate(() => nouvelEdl('l1', 'sortie')); await p.waitForTimeout(800);
  console.log('sortie montre l\'entrée', await p.evaluate(() => document.body.innerText.includes("À l'entrée : Bon — Trou de cheville")));
  await p.screenshot({ path: out + '/3-sortie.png' });
  // PDF avec photos
  const pdf = await p.evaluate(async () => { const id = S.edl.find(e => e.type === 'entree').id; docEdl(id); const imgs = await imagesDoc(CURDOC.o); const d = fairePdf(CURDOC.html, imgs); return [imgs.length, d.getNumberOfPages(), Math.round(d.output('arraybuffer').byteLength / 1024) + ' Ko']; });
  console.log('PDF', pdf);
  const chemin = await p.evaluate(() => S.edl.find(e => e.type === 'entree').pieces[0].photos[0]);
  // B ne voit pas les photos de A
  const q = await nouvelle();
  await q.evaluate(async m => { await SB.auth.signInWithPassword({ email: 'test-b@gestion-test.fr', password: m }); }, MDP);
  console.log('B lit la photo de A ?', await q.evaluate(async c => { const r = await SB.storage.from('photos').createSignedUrl(c, 60); return r.error ? 'refusé' : 'LU'; }, chemin));
  console.log('B dépose chez A ?', await q.evaluate(async c => { const r = await SB.storage.from('photos').upload(c.split('/')[0] + '/x/pirate.jpg', new Blob(['x'], { type: 'image/jpeg' })); return r.error ? 'refusé' : 'ACCEPTÉ'; }, chemin));
  // suppression de l'EDL efface les photos
  await p.evaluate(() => { const e = S.edl.find(x => x.type === 'entree'); supprimerFichiers([...e.pieces.flatMap(x => x.photos)]); });
  await p.waitForTimeout(1500);
  console.log('photo après suppression', await p.evaluate(async c => { const r = await SB.storage.from('photos').createSignedUrl(c, 60); return r.error ? 'effacée' : 'encore là'; }, chemin));
  await p.evaluate(async () => { await SB.from('espaces').delete().eq('id', ESPACE); });
  console.log('ERR', errs); await b.close(); srv.close();
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

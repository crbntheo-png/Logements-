// Importer un .zip : .zip téléchargé depuis le Drive (sous-dossiers compris), aperçu, copie dans les logements
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); }).listen(8099);
let ok = 0, ko = 0; const t = (c, m) => { c ? ok++ : ko++; console.log((c ? 'OK ' : 'KO ') + m); };
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true, serviceWorkers: 'block' })).newPage();
  p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort()); await p.route('**/jszip/3.10.1/jszip.min.js', r => r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync('/tmp/claude-0/-home-user-Logements-/d313f993-ac07-5053-899e-0d1094f4ea9f/scratchpad/jszip/package/dist/jszip.min.js') }));
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test import zip'); await p.click('#esp_btn'); await p.waitForTimeout(2000);
  await p.evaluate(() => { S.biens.push({ id: 'b1', nom: 'Studio Rennes', type: 'Studio', adresse: '1 rue', cp: '35000', ville: 'Rennes', meuble: 'vide' }, { id: 'b2', nom: 'T2 Agon', type: 'T2', adresse: '2 rue', cp: '50230', ville: 'Agon', meuble: 'vide' });
    S.baux.push({ id: 'l1', bienId: 'b1', nom: 'Jean Test', typeBail: 'vide', dateEntree: '2026-01-01', suiviDepuis: '2026-11', loyerHC: '500', charges: '0', jourPaiement: '5', revisions: [] }); save();
    DRIVEG = { etat: 'non' }; go('docs'); render(); });
  await p.waitForTimeout(500);
  await p.locator('.menu-plus summary').last().click(); await p.waitForTimeout(200); // rangé dans "Plus" depuis le 18/11
  t(await p.isVisible('button:has-text("Importer un .zip")'), 'bouton « Importer un .zip » même sans Drive connecté (menu Plus)');
  await p.click('button:has-text("Importer un .zip")'); await p.waitForTimeout(300);
  await p.screenshot({ path: __dirname + '/b46-aide.png' });
  t(await p.isVisible('#overlay >> text=clic droit'), 'explique comment télécharger le dossier depuis le Drive');
  const acc = await p.getAttribute('#overlay input[name=fichiers]', 'accept');
  t(acc && acc.includes('.zip') && !/image|\*/.test(acc), 'le téléphone ouvre directement ses fichiers (pas Photo / Vidéo)');
  t(!(await p.isVisible('#overlay button:has-text("Choisir dans mon Drive")')), 'plus de doublon avec le Drive dans la fenêtre d’import');
  await p.setInputFiles('#overlay input[name=fichiers]', __dirname + '/gtp-test.zip'); await p.waitForTimeout(3000);
  await p.screenshot({ path: __dirname + '/b46-apercu.png' });
  const I = await p.evaluate(() => (IMPORT_DOS || []).map(f => ({ t: f.titre, c: f.chemin.join('/'), b: f.bienId, cat: f.cat, r: f.refus })));
  console.log(JSON.stringify(I));
  t(I.length === 5, '5 documents lus (fichiers cachés et __MACOSX ignorés)');
  t(I.some(f => f.t === 'DPE studio 2026.pdf' && f.c === '02 - GTP Invest/Studio Rennes/Diagnostics'), 'sous-dossiers lus');
  t(I.find(f => f.t === 'Bail Jean Test.pdf').b === 'b1', 'bail reconnu dans le bon logement');
  t(I.find(f => f.t === 'Notes.odt').r === 'format non accepté', 'format refusé signalé');
  t(await p.isVisible('#overlay >> text=Reconnus') && await p.isVisible('#overlay >> text=À choisir toi-même'), 'aperçu : reconnus / à choisir');
  t(await p.evaluate(() => S.fichiers.length) === 0, 'rien copié avant validation');
  // l'associé choisit un logement pour les statuts
  await p.selectOption('#overlay select[name=b_imp3]', 'b2').catch(() => {});
  const statutsId = await p.evaluate(() => IMPORT_DOS.find(f => f.titre === 'Statuts SCI.pdf').id);
  await p.selectOption(`#overlay select[name=b_${statutsId}]`, 'b2');
  await p.click('#overlay button.primary'); await p.waitForTimeout(6000); console.log('TOAST', await p.evaluate(() => (document.getElementById('toast') || {}).textContent), await p.evaluate(() => document.getElementById('overlay').hidden));
  const F = await p.evaluate(() => S.fichiers.map(f => ({ nom: f.nom, bien: f.bienId, bail: f.bailId, cat: f.cat, chemin: !!f.chemin })));
  console.log(JSON.stringify(F));
  t(F.some(f => f.nom === 'Bail Jean Test' && f.bien === 'b1' && f.bail === 'l1' && f.chemin), 'bail copié dans Studio Rennes, rattaché à Jean Test');
  t(F.some(f => f.nom === 'Statuts SCI' && f.bien === 'b2'), 'document choisi à la main copié dans le logement choisi');
  t(!F.some(f => f.nom === 'Notes'), 'format refusé non importé');
  const ch = await p.evaluate(() => S.fichiers.find(f => f.chemin).chemin);
  t(await p.evaluate(async c => !(await SB.storage.from('documents').createSignedUrl(c, 60)).error, ch), 'fichier importé ouvrable');
  // relancer le même import : signale ce qui est déjà là
  await p.evaluate(() => importerDossier()); await p.setInputFiles('#overlay input[name=fichiers]', __dirname + '/gtp-test.zip'); await p.click('#overlay button.primary'); await p.waitForTimeout(2500);
  t(await p.evaluate(() => IMPORT_DOS.find(f => f.titre === 'Bail Jean Test.pdf').deja), 'réimport : « déjà dans l’appli », non coché');
  t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  await p.evaluate(async () => { closeOverlay(); const c = S.fichiers.filter(f => f.chemin).map(f => f.chemin); await SB.storage.from('documents').remove(c); await SB.from('espaces').delete().eq('id', ESPACE); });
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

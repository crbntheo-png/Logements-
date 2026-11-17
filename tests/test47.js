// Dossiers PARTAGÉS avec l'appli (méthode principale) : explication, lecture du dossier entier, rangement, téléchargement par le serveur
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
  // le serveur "partage" simulé : rien de partagé, puis GTP (bail + sous-dossier avec DPE)
  let partage = false;
  await p.route('**/functions/v1/partage', async r => { const c = JSON.parse(r.request().postData() || '{}');
    if (c.action === 'config') return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ pret: true, adresse: 'lecture@gestion-locative-drive.iam.gserviceaccount.com' }) });
    if (c.action === 'lister') return r.fulfill({ contentType: 'application/json', body: JSON.stringify(!partage ? { racines: [], dossiers: {}, fichiers: [] } : { racines: [{ id: 'GTP', nom: '02 - GTP Invest', dossier: true }], dossiers: { GTP: { titre: '02 - GTP Invest', chemin: ['02 - GTP Invest'], ancetres: [], racine: true }, sub: { titre: 'Diagnostics', chemin: ['02 - GTP Invest', 'Diagnostics'], ancetres: ['GTP'] } },
      fichiers: [{ id: 'a1', titre: 'Bail Jean Test.pdf', type: 'application/pdf', lien: 'https://drive.google.com/file/d/a1/view', chemin: ['02 - GTP Invest'], ancetres: ['GTP'], racine: 'GTP', partage: true }, { id: 'a2', titre: 'Facture plombier Studio Rennes.pdf', type: 'application/pdf', lien: 'https://drive.google.com/file/d/a2/view', chemin: ['02 - GTP Invest', 'Diagnostics'], ancetres: ['GTP', 'sub'], racine: 'GTP', partage: true }] }) });
    if (c.action === 'fichier') { window_fichier = c.id; return r.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-1.4 partage' }); }
    r.fulfill({ status: 400, body: '{}' }); });
  let window_fichier = '';
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test dossiers partagés'); await p.click('#esp_btn'); await p.waitForTimeout(2000);
  await p.evaluate(() => { S.biens.push({ id: 'b1', nom: 'Studio Rennes', type: 'Studio', adresse: '1 rue', cp: '35000', ville: 'Rennes', meuble: 'vide' });
    S.baux.push({ id: 'l1', bienId: 'b1', nom: 'Jean Test', typeBail: 'vide', dateEntree: '2026-01-01', suiviDepuis: '2026-11', loyerHC: '500', charges: '0', jourPaiement: '5', revisions: [] }); save();
    DRIVEG = { etat: 'non' }; DOCS = { etat: 'vide', fichiers: [], dossiers: {} }; go('docs'); render(); });
  await p.waitForTimeout(1500); await p.evaluate(() => render()); await p.waitForTimeout(300);
  await p.screenshot({ path: __dirname + '/b47-vide.png', fullPage: true });
  t(await p.isVisible('text=comme avec un associé'), 'sans Drive connecté : explique le partage de dossiers');
  t(!(await p.isVisible('text=Lire mes dossiers en entier')) && !(await p.isVisible('text=Connecte ton Google Drive')), 'plus d’accès à tout le Drive proposé, plus d’écran Google obligatoire');
  await p.click('button:has-text("+ Ajouter un dossier")'); await p.waitForTimeout(300);
  await p.screenshot({ path: __dirname + '/b47-partager.png' });
  t(await p.isVisible('#overlay >> text=lecture@gestion-locative-drive.iam.gserviceaccount.com'), 'l’adresse de l’appli à copier');
  t(await p.isVisible('#overlay >> text=Lecteur') && await p.isVisible('#overlay >> text=Ouvrir mon Drive'), 'étapes : Partager › Lecteur, lien vers le Drive');
  partage = true;
  await p.click('#overlay button:has-text("C\'est fait")'); await p.waitForTimeout(2500);
  await p.screenshot({ path: __dirname + '/b47-docs.png', fullPage: true });
  t(await p.isVisible('.lr-main:has-text("02 - GTP Invest") >> text=2 fichiers'), 'dossier partagé lu en entier, sous-dossiers compris');
  t(await p.isVisible('.lr-main:has-text("02 - GTP Invest") >> text=partagé, lecture seule'), 'marqué « partagé, lecture seule »');
  t(await p.evaluate(() => S.fichiers.some(f => f.bienId === 'b1' && /Bail Jean Test/.test(f.nom))), 'rangement automatique du bail dans le logement');
  await p.click('.lr-main:has-text("02 - GTP Invest")'); await p.waitForTimeout(300);
  t(await p.isVisible('button:text-is("Retirer")') && !(await p.isVisible('text=+ Choisir des fichiers ici')), 'dans le dossier : rien à toucher un par un, Retirer');
  await p.click('button:text-is("Retirer")'); await p.waitForTimeout(300);
  t(await p.isVisible('#overlay >> text=Supprimer l\'accès'), 'Retirer : explique comment arrêter le partage dans le Drive');
  await p.evaluate(() => closeOverlay());
  // copier un fichier partagé dans un logement : passe par le serveur
  await p.evaluate(() => { view.docDossier = 'GTP'; render(); }); await p.click('.doc-l:has-text("Facture plombier")'); await p.waitForTimeout(300);
  await p.click('#overlay >> text=Ranger dans un logement'); await p.waitForTimeout(300); await p.click('#overlay button.primary'); await p.waitForTimeout(3000);
  t(await p.evaluate(() => S.fichiers.some(f => f.driveId === 'a2' && f.chemin)), 'fichier partagé copié dans l’appli (lu par le serveur)');
  t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  await p.evaluate(async () => { const c = S.fichiers.filter(f => f.chemin).map(f => f.chemin); if (c.length) await SB.storage.from('documents').remove(c); await SB.from('espaces').delete().eq('id', ESPACE); });
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

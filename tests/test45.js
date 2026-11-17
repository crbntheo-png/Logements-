// Page Documents (appli installée) : explorateur des dossiers choisis, entrer/sortir d'un dossier, actions d'un fichier, onglets du sélecteur
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
  await p.route('https://www.googleapis.com/drive/v3/files?**', r => r.fulfill({ contentType: 'application/json', body: '{"files":[]}' })); // drive.file : Google ne montre rien dans les dossiers
  await p.route('https://www.googleapis.com/drive/v3/files/**', r => r.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-1.4 fichier' }));
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test explorateur docs'); await p.click('#esp_btn'); await p.waitForTimeout(2000);
  await p.evaluate(() => { S.biens.push({ id: 'b1', nom: 'Studio Rennes', type: 'Studio', adresse: '1 rue', cp: '35000', ville: 'Rennes', meuble: 'vide' }); save();
    DRIVEG = { etat: 'oui', adresse: 'moi@gmail.com', jeton: 'faux', exp: Date.now() + 3600e3 };
    S.sci.driveDossiers = [{ id: 'GTP', nom: '02 - GTP Invest' }, { id: 'VIDE', nom: 'Compta' }];
    S.sci.driveChoisis = [{ id: 'f1', titre: 'Bail Studio Rennes.pdf', type: 'application/pdf', lien: 'https://drive.google.com/file/d/f1/view', dossier: 'GTP' }, { id: 'f2', titre: 'Kbis GTP.pdf', type: 'application/pdf', lien: 'https://drive.google.com/file/d/f2/view', parent: 'SOUSDOSSIER', dossier: 'GTP' }, { id: 'f3', titre: 'Photo compteur.jpg', type: 'image/jpeg', lien: 'x' }];
    save(); DOCS = { etat: 'vide', fichiers: [], dossiers: {} }; go('docs'); render(); });
  await p.waitForTimeout(1500); await p.evaluate(() => render()); await p.waitForTimeout(300);
  await p.screenshot({ path: __dirname + '/b45-accueil.png', fullPage: true });
  t(await p.isVisible('text=Mes dossiers Drive'), 'carte « Mes dossiers Drive » visible tout de suite');
  t(await p.isVisible('button:has-text("+ Ajouter un dossier")'), 'bouton « + Ajouter des dossiers » toujours visible');
  t(await p.isVisible('.lr-main:has-text("02 - GTP Invest") >> text=2 fichiers'), 'GTP Invest : 2 fichiers (même choisi dans un sous-dossier)');
  t(await p.isVisible('.lr-main:has-text("Compta") >> text=ancienne méthode'), 'dossier vide : invite à choisir les fichiers');
  t(await p.isVisible('.lr-main:has-text("Fichiers choisis un par un")'), 'fichiers isolés regroupés');
  // entrer dans un dossier, puis en ressortir
  await p.click('.lr-main:has-text("02 - GTP Invest")'); await p.waitForTimeout(300);
  await p.screenshot({ path: __dirname + '/b45-dossier.png', fullPage: true });
  t(await p.isVisible('h1:has-text("02 - GTP Invest")'), 'on entre dans le dossier');
  t(await p.isVisible('text=Tous mes dossiers'), 'lien « ← Tous mes dossiers »');
  t(await p.isVisible('button:has-text("+ Choisir des fichiers ici")') && await p.isVisible('button:text-is("Retirer")'), 'dans le dossier : Choisir des fichiers ici, Retirer ce dossier');
  t(await p.locator('#docres .doc-l').count() === 2, 'seulement les 2 fichiers du dossier');
  // toucher un fichier : ses actions
  await p.click('.doc-l:has-text("Kbis GTP")'); await p.waitForTimeout(300);
  await p.screenshot({ path: __dirname + '/b45-actions.png' });
  for (const x of ['Ouvrir', 'Ranger dans un logement', 'Envoyer par e-mail', "Retirer de l'appli"]) t(await p.isVisible(`#overlay >> text=${x}`), `action « ${x} »`);
  await p.click("#overlay >> text=Retirer de l'appli"); await p.waitForTimeout(200); await p.click('#cyes'); await p.waitForTimeout(400);
  t(await p.evaluate(() => !choisisDrive().some(f => f.id === 'f2') && !DOCS.fichiers.some(f => f.id === 'f2')), 'fichier retiré de l’appli');
  t(await p.locator('#docres .doc-l').count() === 1, 'la liste se met à jour');
  // ranger un fichier dans un logement
  await p.click('.doc-l:has-text("Bail Studio")'); await p.waitForTimeout(300); await p.click('#overlay >> text=Ranger dans un logement'); await p.waitForTimeout(300);
  t(await p.evaluate(() => document.querySelector('#overlay select[name=bienId]').value) === 'b1', 'logement deviné d’après le nom');
  await p.click('#overlay button.primary'); await p.waitForTimeout(2500);
  t(await p.evaluate(() => S.fichiers.some(f => f.driveId === 'f1' && f.bienId === 'b1')), 'fichier rangé dans le logement');
  await p.evaluate(() => render()); await p.waitForTimeout(200);
  t(await p.isVisible('.doc-l:has-text("Bail Studio") small:has-text("Studio Rennes ·")'), 'la ligne montre où il est rangé');
  await p.click('text=Tous mes dossiers'); await p.waitForTimeout(300);
  t(await p.isVisible('text=Mes dossiers Drive') && await p.evaluate(() => !view.docDossier), 'retour à tous les dossiers');
  // sélecteur Google : onglets (dossier, Mon Drive, Partagés, Drives partagés)
  await p.evaluate(() => { const vues = []; window.__vues = vues;
    class V { constructor() { this.o = {}; } setIncludeFolders() { return this; } setSelectFolderEnabled() { return this; } setMode() { return this; } setMimeTypes() { return this; } setLabel(l) { this.o.label = l; return this; } setParent(x) { this.o.parent = x; return this; } setOwnedByMe() { return this; } setEnableDrives() { this.o.drives = 1; return this; } }
    class B { addView(v) { vues.push(v.o); return this; } setOAuthToken() { return this; } setAppId() { return this; } setLocale() { return this; } setTitle() { return this; } setOrigin() { return this; } setCallback(c) { this.c = c; return this; } enableFeature() { return this; } build() { const c = this.c; return { setVisible() { c({ action: 'cancel' }); } }; } }
    window.google = Object.assign(window.google || {}, { picker: { DocsView: V, PickerBuilder: B, ViewId: { DOCS: 1, RECENTLY_PICKED: 2 }, DocsViewMode: { LIST: 1 }, Response: { ACTION: 'action', DOCUMENTS: 'docs' }, Action: { PICKED: 'picked', CANCEL: 'cancel' }, Feature: { MULTISELECT_ENABLED: 1 } } }); });
  const ouvrir = await p.evaluate(async () => { const o = window.ouvrirPicker; return typeof o; });
  await p.evaluate(async () => { await ouvrirPicker('x', true, false, 'GTP'); });
  const V = await p.evaluate(() => window.__vues);
  console.log(JSON.stringify(V));
  t(V[0] && V[0].parent === 'GTP' && V[0].label === '02 - GTP Invest', 'le sélecteur s’ouvre dans le dossier');
  t(V.some(v => v.parent === 'root' && v.label === 'Mon Drive'), 'onglet « Mon Drive » pour remonter tout en haut');
  t(V.some(v => v.drives), 'onglet « Drives partagés »');
  // retirer un dossier demande confirmation et retire ses fichiers
  await p.evaluate(() => { view.docDossier = 'GTP'; render(); }); await p.click('button:text-is("Retirer")'); await p.waitForTimeout(200);
  t(await p.isVisible('#overlay >> text=Il reste dans ton Drive'), 'confirmation avant de retirer un dossier'); await p.click('#cyes'); await p.waitForTimeout(800);
  t(await p.evaluate(() => !dossiersChoisis().some(d => d.id === 'GTP') && !choisisDrive().some(f => f.dossier === 'GTP') && !view.docDossier), 'dossier et ses fichiers retirés, retour à l’accueil');
  t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  await p.evaluate(async () => { await SB.from('espaces').delete().eq('id', ESPACE); });
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})();

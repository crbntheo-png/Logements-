// Vraie base (compte de test) + faux Google Drive : connexion expliquée, choix du dossier, lecture, propositions de rangement.
// Google est simulé (aucun appel réel à Google). L'espace de test est supprimé à la fin.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist'), OUT = __dirname + '/shots33';
fs.mkdirSync(OUT, { recursive: true });
const types = { '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(8099);
// Faux Drive : un dossier "Locations" avec deux sous-dossiers
const F = 'application/vnd.google-apps.folder';
const ARBRE = {
  root: [{ id: 'locs', name: 'Locations', mimeType: F }, { id: 'perso', name: 'Photos vacances', mimeType: F }],
  partages: [{ id: 'compta', name: 'Compta partagée', mimeType: F }],
  locs: [{ id: 'd1', name: 'Studio Lyon', mimeType: F }, { id: 'f0', name: 'Kbis SCI Test.pdf', mimeType: 'application/pdf' }],
  d1: [{ id: 'f1', name: 'Bail Camille Martin 2025.pdf', mimeType: 'application/pdf' }, { id: 'f2', name: 'DPE C Studio Lyon.pdf', mimeType: 'application/pdf' }, { id: 'f3', name: 'Taxe foncière 2026 Studio Lyon.pdf', mimeType: 'application/pdf' }],
};
const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; }; let KO = 0;
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })).newPage();
  p.on('pageerror', e => errs.push(e.message));
  let appelsGoogle = 0;
  await p.route('https://www.googleapis.com/drive/v3/files?**', r => {
    appelsGoogle++;
    const q = new URL(r.request().url()).searchParams.get('q');
    const id = /sharedWithMe/.test(q) ? 'partages' : (q.match(/'([^']+)' in parents/) || [])[1];
    let l = (ARBRE[id] || []).map(x => ({ ...x, webViewLink: 'https://drive.google.com/file/d/' + x.id + '/view', modifiedTime: '2026-11-01T10:00:00Z' }));
    if (/mimeType = /.test(q)) l = l.filter(x => x.mimeType === F);
    r.fulfill({ contentType: 'application/json', body: JSON.stringify({ files: l }) });
  });
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1200); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test Drive'); await p.click('#esp_btn'); await p.waitForTimeout(2500);
  await p.evaluate(() => { S.sci.driveId = ''; S.biens.push({ id: 'bl', nom: 'Studio Lyon', type: 'Appartement', meuble: 'vide' }); S.baux.push({ id: 'cm', bienId: 'bl', nom: 'Camille Martin', dateEntree: '2025-01-01', loyerHC: 500, charges: 0, jourPaiement: 5, typeBail: 'vide', revisions: [] }); save(); });
  await p.waitForTimeout(800);
  // 1. Pas connecté : page Docs
  await p.evaluate(() => location.hash = 'docs'); await p.waitForTimeout(1200);
  await p.screenshot({ path: OUT + '/1-docs-pas-connecte.png', fullPage: true });
  ok('Docs : bouton "Connecter mon Google Drive"', await p.evaluate(() => /Connecter mon Google Drive/.test(document.body.innerText)));
  // 2. Fenêtre d'explication
  await p.evaluate(() => connecterDrive()); await p.waitForTimeout(1500);
  await p.screenshot({ path: OUT + '/2-explication.png' });
  const txt = await p.evaluate(() => document.getElementById('overlay').innerText);
  ok('explique ce que ça permet', /Ce que la connexion permet/.test(txt) && /Ce qu'elle ne permet pas/.test(txt) && /Rien modifier/.test(txt));
  await p.click('#overlay button.primary'); await p.waitForTimeout(800);
  const t1 = await p.evaluate(() => (document.getElementById('toast') || {}).innerText || '');
  ok('bouton Continuer : réagit (' + t1.trim().slice(0, 60) + ')', /pas encore installée|Un instant|Google|annulée/.test(t1));
  await p.evaluate(() => closeOverlay());
  // 3. Réglages : rubrique Google Drive
  await p.evaluate(() => reglage('drive')); await p.waitForTimeout(800);
  await p.screenshot({ path: OUT + '/3-reglages.png' });
  ok('Réglages : rubrique Google Drive ouverte', await p.evaluate(() => !!document.querySelector('#rgl-drive[open]')));
  // 4. Connecté (Google simulé) : choix du dossier
  await p.evaluate(() => { fnDrive = async a => a === 'jeton' ? { access_token: 'faux', expires_in: 3600 } : { ok: true }; DRIVEG = { etat: 'oui', adresse: 'test-a@gmail.com' }; DOCS = { etat: 'vide', fichiers: [], dossiers: {} }; location.hash = 'docs'; render(); });
  await p.waitForTimeout(800); await p.screenshot({ path: OUT + '/4-choisir.png', fullPage: true });
  ok('demande de choisir le dossier', await p.evaluate(() => /Choisis le ou les dossiers/.test(document.body.innerText)));
  await p.evaluate(() => choisirDossierDrive()); await p.waitForTimeout(1200);
  await p.screenshot({ path: OUT + '/5-liste-dossiers.png' });
  ok('liste Mon Drive + Partagé avec moi', await p.evaluate(() => { const t = document.getElementById('overlay').innerText; return /Locations/.test(t) && /Compta partagée/.test(t) && /Partagé avec moi/.test(t); }));
  await p.click('#overlay li:has-text("Locations") input[type=checkbox]'); await p.click('#overlay button.primary'); await p.waitForTimeout(2500);
  ok('dossier enregistré', await p.evaluate(() => S.sci.driveId === 'locs'));
  await p.screenshot({ path: OUT + '/6-propositions.png', fullPage: true }); console.log('DEBUG', await p.evaluate(() => JSON.stringify([DOCS.etat, DOCS.err, pageCourante(), driveRacine()])));
  const n = await p.evaluate(() => [DOCS.etat, DOCS.fichiers.length, S.fichiers.filter(f => f.auto).length, document.body.innerText.includes('Bail Camille Martin')]);
  ok('Drive lu : ' + n[1] + ' fichiers, ' + n[2] + ' rangés automatiquement', n[0] === 'pret' && n[1] === 4 && n[2] >= 2 && n[3]);
  ok('pas de "Photos vacances" (hors dossier)', await p.evaluate(() => !DOCS.fichiers.some(f => /vacances/i.test(f.chemin.join(' ')))));
  // 5. Ranger
  await p.evaluate(() => { const b = document.querySelector('.props-drive form button.primary'); if (b) b.click(); }); await p.waitForTimeout(800);
  ok('documents rangés dans le logement', await p.evaluate(() => S.fichiers.filter(f => f.bienId === 'bl').length >= 2));
  const sw = await p.evaluate(() => document.documentElement.scrollWidth); ok('pas de débordement (' + sw + ')', sw <= 390);
  // 6. Un associé (membre, pas propriétaire) : pas de Drive, message clair
  ok('propriétaire reconnu', await p.evaluate(() => estProprio()));
  await p.evaluate(() => { MEMBRES.membres = MEMBRES.membres.map(m => m.user_id === SB_USER.id ? { ...m, role: 'membre' } : m).concat([{ user_id: 'x', email: 'proprio@exemple.fr', role: 'proprietaire' }]); location.hash = 'docs'; render(); });
  await p.waitForTimeout(500); await p.screenshot({ path: OUT + '/7-associe-docs.png', fullPage: true });
  ok('associé : Drive géré par le propriétaire', await p.evaluate(() => !estProprio() && /géré par le propriétaire/.test(document.body.innerText) && !/Connecter mon Google Drive/.test(document.body.innerText)));
  await p.evaluate(() => connecterDrive()); await p.waitForTimeout(300);
  ok('associé : connecter refusé', await p.evaluate(() => /Seul le propriétaire/.test((document.getElementById('toast') || {}).innerText || '') && document.getElementById('overlay').hidden));
  await p.evaluate(() => reglage('drive')); await p.waitForTimeout(400);
  ok('associé : réglages sans bouton de connexion', await p.evaluate(() => /Géré par proprio@exemple.fr/.test(document.body.innerText) && !document.querySelector('#rgl-drive button')));
  await p.evaluate(() => { MEMBRES.membres = MEMBRES.membres.filter(m => m.user_id !== 'x').map(m => ({ ...m, role: 'proprietaire' })); });
  await p.evaluate(async () => { await SB.from('espaces').delete().eq('id', ESPACE); });
  console.log('appels Google simulés', appelsGoogle, 'ERREURS', errs); console.log('KO', KO);
  await b.close(); srv.close();
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

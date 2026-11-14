// Drive : plusieurs dossiers, sous-dossiers, "ce dossier = logement", rangement automatique par lot, Annuler, pas de doublon,
// rien pour un membre non propriétaire, bandeau si le Drive se déconnecte. Vraie base (compte de test) + Google simulé.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist'), OUT = __dirname + '/shots36';
fs.mkdirSync(OUT, { recursive: true });
const types = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(8096);
const F = 'application/vnd.google-apps.folder', PDF = 'application/pdf';
const ARBRE = {
  root: [{ id: 'locs', name: 'Locations', mimeType: F }, { id: 'perso', name: 'Photos vacances', mimeType: F }],
  partages: [{ id: 'agon', name: 'Agon', mimeType: F }],
  locs: [{ id: 'dl', name: 'Studio Lyon', mimeType: F }, { id: 'appa', name: 'Appartement A', mimeType: F }, { id: 'f_kbis', name: 'Kbis SCI.pdf', mimeType: PDF }],
  dl: [{ id: 'f_bail', name: 'Bail Camille Martin 2025.pdf', mimeType: PDF }, { id: 'f_dpe', name: 'DPE C Studio Lyon.pdf', mimeType: PDF }, { id: 'f_tf', name: 'Taxe foncière 2026 Studio Lyon.pdf', mimeType: PDF }],
  appa: [{ id: 'appaf', name: 'Factures', mimeType: F }],
  appaf: [{ id: 'f_plomb', name: 'Facture plombier.pdf', mimeType: PDF }],
  agon: [{ id: 'f_bailp', name: 'Bail Paul Durand.pdf', mimeType: PDF }, { id: 'f_ign', name: 'Assurance PNO Agon T2.pdf', mimeType: PDF }],
  perso: [{ id: 'f_vac', name: 'Facture hôtel Studio Lyon.pdf', mimeType: PDF }]
};
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })).newPage();
  p.on('pageerror', e => errs.push(e.message));
  let lus = new Set();
  await p.route('https://www.googleapis.com/drive/v3/files?**', r => {
    const q = new URL(r.request().url()).searchParams.get('q');
    const id = /sharedWithMe/.test(q) ? 'partages' : ((q.match(/'([^']+)' in parents/) || [])[1] || '').replace(/x{24}$/, ''); lus.add(id);
    let l = (ARBRE[id] || []).map(x => ({ ...x, webViewLink: 'https://drive.google.com/file/d/' + x.id + 'xxxxxxxxxxxxxxxxxxxxxxxx/view', modifiedTime: '2026-11-01T10:00:00Z' }));
    if (/mimeType = /.test(q)) l = l.filter(x => x.mimeType === F);
    r.fulfill({ contentType: 'application/json', body: JSON.stringify({ files: l.map(x => ({ ...x, id: x.id.length < 25 ? x.id + 'xxxxxxxxxxxxxxxxxxxxxxxx' : x.id })) }) });
  });
  await p.goto('http://localhost:8096/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1200); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test Drive 2'); await p.click('#esp_btn'); await p.waitForTimeout(2500);
  const espace = await p.evaluate(() => ESPACE);
  await p.evaluate(() => { S.sci.driveId = ''; S.biens.push({ id: 'bl', nom: 'Studio Lyon', type: 'Appartement', meuble: 'vide' }, { id: 'ba', nom: 'Agon T2', type: 'Appartement', meuble: 'vide' });
    S.baux.push({ id: 'cm', bienId: 'bl', nom: 'Camille Martin', dateEntree: '2025-01-01', loyerHC: 500, charges: 0, jourPaiement: 5, typeBail: 'vide', revisions: [] }, { id: 'pd', bienId: 'ba', nom: 'Paul Durand', dateEntree: '2025-03-01', loyerHC: 600, charges: 0, jourPaiement: 5, typeBail: 'vide', revisions: [] }); save(); });
  await p.waitForTimeout(1000);
  // 1. Juste avant Google : la phrase demandée
  await p.evaluate(() => connecterDrive()); await p.waitForTimeout(400);
  ok('avant Google : "elle ne lira que les dossiers que tu choisis"', await p.evaluate(() => /Google va dire que l'appli peut voir tout ton Drive\. En vrai, elle ne lira que les dossiers que tu choisis juste après\./.test(document.getElementById('overlay').innerText)));
  await p.screenshot({ path: OUT + '/1-avant-google.png' }); await p.evaluate(() => closeOverlay());
  // Google simulé : connecté
  await p.evaluate(() => { fnDrive = async a => a === 'jeton' ? { access_token: 'faux', expires_in: 3600 } : { ok: true }; DRIVEG = { etat: 'oui', adresse: 'test-a@gmail.com' }; DOCS = { etat: 'vide', fichiers: [], dossiers: {} }; });
  // 2. Choix de plusieurs dossiers, avec navigation dans un sous-dossier puis retour
  await p.evaluate(() => choisirDossierDrive()); await p.waitForTimeout(800);
  ok('liste : Mon Drive + Partagé avec moi', await p.evaluate(() => { const t = document.getElementById('overlay').innerText; return /Locations/.test(t) && /Agon/.test(t) && /Partagé avec moi/.test(t); }));
  await p.click('#overlay li:has-text("Locations") input[type=checkbox]'); await p.waitForTimeout(100);
  await p.click('#overlay li:has-text("Locations") button[aria-label^="Ouvrir"]'); await p.waitForTimeout(800);
  await p.screenshot({ path: OUT + '/2-sous-dossier.png' });
  ok('dans "Locations" : ses sous-dossiers + chemin + Retour', await p.evaluate(() => { const t = document.getElementById('overlay').innerText; return /Studio Lyon/.test(t) && /Appartement A/.test(t) && /Mon Drive › Locations/.test(t) && /Retour/.test(t); }));
  ok('la coche de "Locations" est gardée', await p.evaluate(() => /1 dossier coché : Locations/.test(document.getElementById('choixNb').innerText)));
  await p.click('#overlay button:has-text("Retour")'); await p.waitForTimeout(800);
  await p.click('#overlay li:has-text("Agon") input[type=checkbox]'); await p.waitForTimeout(100);
  ok('2 dossiers cochés', await p.evaluate(() => /2 dossiers cochés/.test(document.getElementById('choixNb').innerText)));
  await p.screenshot({ path: OUT + '/3-deux-dossiers.png' });
  await p.evaluate(() => { S.faits['drv-ign-f_ignxxxxxxxxxxxxxxxxxxxxxxxx'] = '2026-11-14'; }); // un document déjà ignoré
  await p.click('#mform button.primary'); await p.waitForTimeout(3500);
  ok('dossiers enregistrés (tableau) + compatibilité driveId', await p.evaluate(() => S.sci.driveDossiers.length === 2 && S.sci.driveId === S.sci.driveDossiers[0].id));
  ok('les 2 dossiers et leurs sous-dossiers lus, pas "Photos vacances"', ['locs', 'dl', 'appa', 'appaf', 'agon'].every(x => lus.has(x)) && !lus.has('perso'));
  const r1 = await p.evaluate(() => { const a = S.fichiers.filter(f => f.auto); return { n: a.length, noms: a.map(f => f.nom + '→' + f.bienId).sort(), lots: (S.sci.driveLots || []).length, toast: (document.getElementById('toast') || {}).innerText || '' }; });
  console.log('    rangés auto :', r1.noms.join(' | '));
  ok('rangement auto : bail, DPE, taxe foncière de Studio Lyon + bail de Paul (4)', r1.n === 4 && r1.noms.some(x => /Bail Camille.*→bl/.test(x)) && r1.noms.some(x => /Bail Paul.*→ba/.test(x)));
  ok('pas le document ignoré, pas le Kbis ni la facture sans logement', !r1.noms.some(x => /PNO|Kbis|plombier/.test(x)));
  ok('message "4 documents rangés automatiquement · Voir · Annuler"', /4 documents rangés automatiquement/.test(r1.toast) && /Voir/.test(r1.toast) && /Annuler/.test(r1.toast));
  ok('chaque document marqué auto + lot', await p.evaluate(() => S.fichiers.filter(f => f.auto).every(f => f.lot && f.lot === S.sci.driveLots[0].id)));
  // 3. Pas de doublon si on relance
  const n2 = await p.evaluate(async () => { const avant = S.fichiers.length; await lectureDriveFond('modif'); await lectureDriveFond('dossier'); return S.fichiers.length - avant; });
  ok('relancer 2 fois : aucun doublon', n2 === 0);
  // 4. Dossier = logement : "Appartement A" = Studio Lyon -> la facture du sous-dossier "Factures" est rangée
  await p.evaluate(() => { location.hash = 'docs'; view.dossiersOuverts = true; render(); }); await p.waitForTimeout(500);
  await p.screenshot({ path: OUT + '/4-docs.png', fullPage: true });
  ok('Docs : "Dossiers et logements" + "Derniers rangements automatiques"', await p.evaluate(() => /Dossiers et logements/.test(document.body.innerText) && /Derniers rangements automatiques/.test(document.body.innerText)));
  await p.evaluate(() => relierDossier(Object.keys(DOCS.dossiers).find(id => DOCS.dossiers[id].titre === 'Appartement A'), 'bl')); await p.waitForTimeout(500);
  ok('dossier relié : facture du sous-dossier rangée dans Studio Lyon', await p.evaluate(() => S.fichiers.some(f => /plombier/.test(f.nom) && f.bienId === 'bl' && f.auto)));
  ok('2 lots', await p.evaluate(() => S.sci.driveLots.length === 2));
  // 5. Annuler le 1er lot : tout le lot part, et il ne revient pas tout seul (mais reste proposé)
  await p.evaluate(() => annulerLot(S.sci.driveLots[1].id)); await p.waitForTimeout(400);
  const r5 = await p.evaluate(async () => { const n = S.fichiers.filter(f => f.auto).length; await lectureDriveFond('modif'); const n2 = S.fichiers.filter(f => f.auto).length; const props = analyserDrive(DOCS.fichiers).ranger.length; return [n, n2, props]; });
  ok('Annuler retire tout le lot (reste la facture : ' + r5[0] + ')', r5[0] === 1);
  ok('le lot annulé n\'est pas rangé à nouveau tout seul', r5[1] === 1);
  ok('mais il reste proposé (' + r5[2] + ' propositions)', r5[2] === 4);
  // 6. Un nouveau locataire déclenche le rangement (ici : rien de neuf, et pas d'erreur)
  // 7. Membre non propriétaire : rien ne se déclenche
  const r7 = await p.evaluate(async () => { const avant = S.fichiers.length; MEMBRES.membres = MEMBRES.membres.map(m => ({ ...m, role: 'membre' })).concat([{ user_id: 'x', email: 'proprio@exemple.fr', role: 'proprietaire' }]); delete S.faits['drv-noauto-' + 'f_bailxxxxxxxxxxxxxxxxxxxxxxxx']; Object.keys(S.faits).filter(k => k.startsWith('drv-noauto-')).forEach(k => delete S.faits[k]);
    const a = await lectureDriveFond('modif'), b2 = rangerAuto('test'); return [a, b2, S.fichiers.length - avant]; });
  ok('membre : aucun rangement déclenché', r7[0] === 0 && r7[1] === 0 && r7[2] === 0);
  await p.evaluate(() => { MEMBRES.membres = MEMBRES.membres.filter(m => m.user_id !== 'x').map(m => ({ ...m, role: 'proprietaire' })); });
  // 6. Renommer un logement (propriétaire) déclenche le rangement automatique
  await p.evaluate(() => { location.hash = 'biens'; }); await p.waitForTimeout(500); await p.evaluate(() => editBien('bl')); await p.waitForTimeout(400);
  await p.fill('#overlay input[name=nom]', 'Studio Lyon centre'); await p.click('#mform button.primary'); await p.waitForTimeout(1500);
  ok('logement renommé : rangement relancé tout seul (' + await p.evaluate(() => S.fichiers.filter(f => f.auto).length) + ' rangés)', await p.evaluate(() => S.fichiers.filter(f => f.auto).length === 5 && S.sci.driveLots.length === 2));
  // 8. Drive perdu : bandeau sur l'accueil
  await p.evaluate(() => { DRIVEG = { etat: 'non', perdu: true }; location.hash = ''; render(); }); await p.waitForTimeout(400);
  await p.screenshot({ path: OUT + '/5-bandeau.png' });
  ok('bandeau "Ton Drive s\'est déconnecté, reconnecte-le"', await p.evaluate(() => /Ton Drive s'est déconnecté/.test(document.body.innerText) && /reconnecte-le/.test(document.body.innerText)));
  const sw = await p.evaluate(() => document.documentElement.scrollWidth); ok('pas de débordement (' + sw + ')', sw <= 390);
  await p.evaluate(async e => { await SB.from('espaces').delete().eq('id', e); }, espace);
  console.log('ERREURS', errs); console.log('KO', KO);
  await b.close(); srv.close();
})().catch(e => { console.log('FATAL', e.message); srv.close(); process.exit(1); });

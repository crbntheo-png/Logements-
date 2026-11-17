// Drive "dossiers entiers" (projet Google à part, lecture seule) : proposition, connexion avec le bon client, contenu des dossiers lu
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
  // Google Drive (lecture seule) : GTP contient un bail et un sous-dossier avec un DPE
  await p.route('https://www.googleapis.com/drive/v3/files?**', r => { const q = new URL(r.request().url()).searchParams.get('q');
    const L = /'GTP' in parents/.test(q) ? [{ id: 'a1', name: 'Bail Jean Test.pdf', mimeType: 'application/pdf' }, { id: 'sub', name: 'Diagnostics', mimeType: 'application/vnd.google-apps.folder' }] : /'sub' in parents/.test(q) ? [{ id: 'a2', name: 'DPE studio 2026.pdf', mimeType: 'application/pdf' }] : [];
    r.fulfill({ contentType: 'application/json', body: JSON.stringify({ files: L }) }); });
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test dossiers entiers'); await p.click('#esp_btn'); await p.waitForTimeout(2000);
  await p.evaluate(() => { S.biens.push({ id: 'b1', nom: 'Studio Rennes', type: 'Studio', adresse: '1 rue', cp: '35000', ville: 'Rennes', meuble: 'vide' });
    S.baux.push({ id: 'l1', bienId: 'b1', nom: 'Jean Test', typeBail: 'vide', dateEntree: '2026-01-01', suiviDepuis: '2026-11', loyerHC: '500', charges: '0', jourPaiement: '5', revisions: [] });
    S.sci.driveDossiers = [{ id: 'GTP', nom: '02 - GTP Invest' }]; save();
    GCFG = { pret: true, client_id: '502656965437-a.apps.googleusercontent.com', complet: true, client_id_complet: '999888777-b.apps.googleusercontent.com' };
    window.fnDrive = async (action, extra) => { window.__fn = (window.__fn || []).concat([[action, extra]]); if (action === 'config') return GCFG; if (action === 'brancher') return { ok: true, adresse: 'moi@gmail.com', mode: extra.mode, access_token: 'jeton', expires_in: 3600 }; if (action === 'jeton') return { access_token: 'jeton', expires_in: 3600, mode: DRIVEG.mode, scope: '' }; return {}; };
    DRIVEG = { etat: 'oui', mode: 'choix', adresse: 'moi@gmail.com', jeton: 'faux', exp: Date.now() + 3600e3 };
    window.google = { accounts: { oauth2: { initCodeClient: cfg => { window.__cfg = cfg; return { requestCode: () => cfg.callback({ code: 'CODE' }) }; } } } };
    DOCS = { etat: 'vide', fichiers: [], dossiers: {} }; go('docs'); render(); });
  await p.waitForTimeout(1500); await p.evaluate(() => render()); await p.waitForTimeout(300);
  await p.screenshot({ path: __dirname + '/b47-proposition.png', fullPage: true });
  t(await p.isVisible('text=Tes dossiers sont lus à moitié'), 'accès « fichiers choisis » : l’appli propose de lire les dossiers en entier');
  t(await p.isVisible('button:has-text("+ Ajouter des dossiers ou fichiers")'), 'un seul bouton pour ajouter dossiers ou fichiers');
  await p.click('button:has-text("Lire mes dossiers en entier") >> nth=0'); await p.waitForTimeout(500);
  t(await p.isVisible('#overlay >> text=Paramètres avancés') && await p.isVisible('#overlay >> text=lecture seule'), 'explique l’écran de Google et la lecture seule');
  await p.screenshot({ path: __dirname + '/b47-connexion.png' });
  await p.click('#overlay button.primary'); await p.waitForTimeout(2500);
  const cfg = await p.evaluate(() => ({ id: window.__cfg.client_id, scope: window.__cfg.scope }));
  t(cfg.id.startsWith('999888777') && /drive\.readonly/.test(cfg.scope) && !/drive\.file/.test(cfg.scope), 'connexion avec le projet Drive et la lecture seule');
  t(await p.evaluate(() => (window.__fn || []).some(([a, e]) => a === 'brancher' && e.mode === 'complet') && DRIVEG.mode === 'complet'), 'serveur : branché en mode « complet »');
  await p.evaluate(() => { DOCS = { etat: 'vide', fichiers: [], dossiers: {} }; go('docs'); render(); }); await p.waitForTimeout(2000); await p.evaluate(() => render()); await p.waitForTimeout(300);
  await p.screenshot({ path: __dirname + '/b47-docs.png', fullPage: true });
  t(await p.isVisible('.lr-main:has-text("02 - GTP Invest") >> text=2 fichiers'), 'contenu du dossier lu, sous-dossiers compris (2 fichiers)');
  t(await p.isVisible("text=L'appli lit tes dossiers en entier"), 'confirmation : dossiers lus en entier');
  t(!(await p.isVisible('text=Tes dossiers sont lus à moitié')), 'plus de proposition une fois activé');
  await p.click('.lr-main:has-text("02 - GTP Invest")'); await p.waitForTimeout(300);
  t(!(await p.isVisible('button:has-text("+ Choisir des fichiers ici")')) && await p.locator('#docres .doc-l').count() === 2, 'dans le dossier : tout est là, plus besoin de toucher les fichiers');
  // sélecteur : dossiers ET fichiers, projet Drive
  await p.evaluate(() => { const vues = []; window.__vues = vues; window.__app = '';
    class V { constructor() { this.o = {}; } setIncludeFolders() { return this; } setSelectFolderEnabled(x) { this.o.dossiers = x; return this; } setMode() { return this; } setMimeTypes(m) { this.o.mime = m; return this; } setLabel(l) { this.o.label = l; return this; } setParent(x) { this.o.parent = x; return this; } setOwnedByMe() { return this; } setEnableDrives() { return this; } }
    class B { addView(v) { vues.push(v.o); return this; } setOAuthToken() { return this; } setAppId(a) { window.__app = a; return this; } setLocale() { return this; } setTitle() { return this; } setOrigin() { return this; } setCallback(c) { this.c = c; return this; } enableFeature() { return this; } build() { const c = this.c; return { setVisible() { c({ action: 'cancel' }); } }; } }
    window.google.picker = { DocsView: V, PickerBuilder: B, ViewId: { DOCS: 1, RECENTLY_PICKED: 2 }, DocsViewMode: { LIST: 1 }, Response: { ACTION: 'action', DOCUMENTS: 'docs' }, Action: { PICKED: 'picked', CANCEL: 'cancel' }, Feature: { MULTISELECT_ENABLED: 1 } }; });
  await p.evaluate(() => choisirDossierDrive()); await p.waitForTimeout(500);
  const V = await p.evaluate(() => ({ vues: window.__vues, app: window.__app }));
  t(V.vues.length && V.vues.every(v => v.dossiers === true && !v.mime), 'sélecteur : dossiers et fichiers, les deux');
  t(V.app === '999888777', 'sélecteur rattaché au projet Drive');
  t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  await p.evaluate(async () => { await SB.from('espaces').delete().eq('id', ESPACE); });
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

// Demander une intégration (Dropbox, banque…) : formulaire, envoi (simulé : le vrai prévient l'administrateur), page admin réservée
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
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test integrations'); await p.click('#esp_btn'); await p.waitForTimeout(2000);
  // la vraie fonction réservée à l'administrateur refuse ce compte
  const vrai = await p.evaluate(async () => { const r = await SB.rpc('demandes_integrations'); return { err: r.error && r.error.message, admin: (await SB.rpc('est_admin')).data }; });
  t(/administrateur/.test(vrai.err || '') && vrai.admin === false, 'page admin : refusée à un utilisateur normal (vrai serveur)');
  // envoi simulé (le vrai prévient l'administrateur par e-mail)
  await p.evaluate(() => { const o = SB.rpc.bind(SB); window.__sig = null; SB.rpc = (n, a) => n === 'signaler' ? (window.__sig = a, Promise.resolve({ data: 1, error: null })) : o(n, a); });
  await p.evaluate(() => reglage('integrations')); await p.waitForTimeout(600);
  t(await p.isVisible('button:has-text("Demander une intégration")'), 'Réglages : « 🔌 Demander une intégration »');
  t(!(await p.isVisible('text=Voir les demandes')), 'pas de lien admin pour un utilisateur normal');
  await p.click('button:has-text("Demander une intégration")'); await p.waitForTimeout(300);
  await p.screenshot({ path: __dirname + '/b51-form.png' });
  await p.click('#overlay label:has-text("Autre")'); await p.fill('#overlay input[name=autre]', 'Nuki');
  await p.click('#overlay label:has-text("Indispensable")');
  await p.fill('#overlay textarea[name=pourquoi]', 'Pour donner les clés à distance aux nouveaux locataires.');
  await p.click('#overlay button:has-text("Envoyer la demande")'); await p.waitForTimeout(800);
  const sig = await p.evaluate(() => window.__sig); console.log(JSON.stringify(sig));
  t(sig && sig.type === 'integration' && sig.contexte.appli === 'Nuki' && sig.contexte.importance === 'indispensable' && /clés à distance/.test(sig.message), 'demande envoyée : appli, importance, pourquoi');
  t(await p.isVisible('#overlay .gros-msg >> text=Demande bien reçue'), 'confirmation en grand');
  await p.evaluate(() => closeOverlay());
  // entrée depuis la page Docs et le bouton « ? »
  await p.evaluate(() => { DOCS = { etat: 'pret', fichiers: [], dossiers: {} }; DRIVEG = { etat: 'non' }; go('docs'); render(); }); await p.waitForTimeout(400);
  t(await p.isVisible('text=Demande-nous de le brancher'), 'Docs : « Tes documents sont ailleurs ? Demande-nous de le brancher »');
  // page admin (données simulées)
  await p.evaluate(() => { ADMIN = true; const o = SB.rpc; SB.rpc = (n, a) => n === 'demandes_integrations' ? Promise.resolve({ data: [{ appli: 'Dropbox', nb: 3, personnes: 2, demandes: [{ email: 'a@b.fr', message: 'Dropbox — tous mes baux y sont', importance: 'indispensable', date: '2026-11-18T10:00:00Z' }] }, { appli: 'Qonto', nb: 1, personnes: 1, demandes: [{ email: 'c@d.fr', message: 'Qonto — mon compte de SCI', importance: 'pratique', date: '2026-11-17T10:00:00Z' }] }], error: null }) : o(n, a); INTEG = null; location.hash = 'integrations'; });
  await p.waitForTimeout(800);
  await p.screenshot({ path: __dirname + '/b51-admin.png', fullPage: true });
  t(await p.isVisible('h1:has-text("Intégrations demandées")') && await p.isVisible('text=3 demandes · 2 personnes') && await p.isVisible('text=tous mes baux y sont'), 'admin : classement des demandes avec les raisons');
  t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  await p.evaluate(async () => { await SB.from('espaces').delete().eq('id', ESPACE); });
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

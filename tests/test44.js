// Gmail "envoi seulement" (Google simulé) : écran, ancien mot de passe signalé, branchement, envoi, débranchement ; page confidentialité
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); }).listen(8099);
let ok = 0, ko = 0; const t = (c, m) => { c ? ok++ : ko++; console.log((c ? 'OK ' : 'KO ') + m); };
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true, serviceWorkers: 'block' })).newPage();
  p.on('pageerror', e => errs.push(e.message));
  const appels = [];
  await p.route('**/functions/v1/envoyer-gmail', async r => { const c = JSON.parse(r.request().postData() || '{}'); appels.push(c);
    if (c.action === 'brancher_google') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, adresse: 'Moi@Gmail.com' }) });
    return r.continue(); });
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test Gmail'); await p.click('#esp_btn'); await p.waitForTimeout(2000);
  // config réelle du serveur
  const cfg = await p.evaluate(() => appelGmail({ action: 'config' }, true));
  t(cfg.ok && cfg.j.pret && cfg.j.scope.includes('gmail.send') && !cfg.j.scope.includes('gmail.readonly') && !/mail\.google\.com/.test(cfg.j.scope), 'serveur : connexion Google prête, droit "envoyer" seulement');
  // pas branché
  await p.evaluate(() => { GMAIL = null; reglage('gmail'); }); await p.waitForTimeout(400);
  t(await p.isVisible('text=Continuer avec Google'), 'bouton « Continuer avec Google »');
  t(!(await p.isVisible('text=Mot de passe d\'application (16 lettres)')), 'plus de case "mot de passe d\'application"');
  t(await p.isVisible('text=ne peut pas lire'), 'explication : l\'appli ne peut pas lire les e-mails');
  // ancien branchement par mot de passe
  await p.evaluate(() => { GMAIL = { adresse: 'moi@gmail.com', mode: 'mdp' }; render(); }); await p.waitForTimeout(300);
  const taches = await p.evaluate(() => typeof calcTasks === 'function' ? calcTasks().map(x => x.key) : null);
  await p.evaluate(() => reglage('gmail')); await p.waitForTimeout(400);
  t(await p.isVisible('text=donne accès à toute ta boîte mail'), 'ancien mot de passe : avertissement affiché');
  t(await p.isVisible('a[href="https://myaccount.google.com/apppasswords"]'), 'lien pour supprimer l\'ancien mot de passe');
  // branchement Google simulé
  await p.evaluate(() => { window.chargerGIS = async () => {}; window.google = { accounts: { oauth2: { initCodeClient: o => ({ requestCode: () => { window.__scope = o.scope; o.callback({ code: 'code-simule' }); } }) } } }; });
  await p.evaluate(() => connecterGmail()); await p.waitForTimeout(1200);
  t(await p.evaluate(() => GMAIL && GMAIL.mode === 'google' && GMAIL.adresse === 'moi@gmail.com'), 'branché avec Google');
  t(await p.evaluate(() => window.__scope) === 'openid email https://www.googleapis.com/auth/gmail.send', 'Google reçoit seulement openid, email, gmail.send');
  t(appels.some(c => c.action === 'brancher_google' && c.code === 'code-simule'), 'code envoyé au serveur');
  await p.evaluate(() => reglage('gmail')); await p.waitForTimeout(400);
  t(await p.isVisible('text=partent de'), 'écran "branché" affiché');
  // envoi : le vrai serveur répond "Gmail pas branché" pour ce compte de test (aucun e-mail ne part)
  const r = await p.evaluate(() => appelGmail({ espace: ESPACE, a: ['personne@example.com'], objet: 'test', texte: 'x' }));
  t(!r.ok && /pas branché/.test(r.erreur), 'serveur : aucun envoi sans Gmail réellement branché');
  // page confidentialité
  await p.evaluate(() => { location.hash = '#legal'; }); await p.waitForTimeout(500);
  const legal = await p.textContent('body');
  t(legal.includes('Théo Corbin') && legal.includes('crbntheo@gmail.com'), 'éditeur affiché');
  t(legal.includes('ne jamais consulter tes données'), 'engagement de l\'hébergeur affiché');
  t(!legal.includes('mot de passe d\'application rangé'), 'plus de mention du mot de passe d\'application');
  await p.screenshot({ path: path.join(__dirname, 'shots', 'test44-legal.png'), fullPage: false });
  // nettoyage
  await p.evaluate(async () => { await SB.from('espaces').delete().eq('id', ESPACE); });
  t(errs.length === 0, 'aucune erreur JS ' + JSON.stringify(errs));
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})();

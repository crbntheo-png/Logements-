// Mise à jour de l'appli : version affichée, "Chercher une mise à jour", bandeau "Nouvelle version prête", rechargement.
// Sert une copie de dist/ (vraie appli installable avec service worker), puis simule la mise en ligne d'une nouvelle version.
// Compte de test, espace supprimé à la fin.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const SRC = path.join(__dirname, '..', 'dist'), OUT = __dirname + '/shots34';
fs.mkdirSync(OUT, { recursive: true });
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'maj-')); fs.cpSync(SRC, DIR, { recursive: true });
const types = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(DIR, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); fs.createReadStream(f).pipe(r); }).listen(8098);
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
// "Mettre en ligne" une nouvelle version : nouveau numéro dans version.json, index.html et sw.js
function publierV2() {
  const v1 = JSON.parse(fs.readFileSync(path.join(DIR, 'version.json'), 'utf8')), v2 = { id: 'v2test9', date: '2026-11-14T09:30' };
  fs.writeFileSync(path.join(DIR, 'version.json'), JSON.stringify(v2));
  for (const f of ['index.html', 'sw.js']) fs.writeFileSync(path.join(DIR, f), fs.readFileSync(path.join(DIR, f), 'utf8').split(v1.id).join(v2.id));
  return v2;
}
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8098/'); await p.waitForTimeout(1500);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1200); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test MAJ'); await p.click('#esp_btn'); await p.waitForTimeout(2500);
  const espace = await p.evaluate(() => ESPACE);
  // le service worker prend la main au 2e chargement
  await p.reload(); await p.waitForTimeout(2500);
  ok('appli gérée par le service worker', await p.evaluate(() => !!navigator.serviceWorker.controller));
  const v1 = await p.evaluate(() => window.APP_VERSION);
  await p.evaluate(() => { if (!ESPACE) return; reglage('maj'); }); await p.waitForTimeout(800);
  if (!(await p.evaluate(() => !!document.querySelector('#rgl-maj')))) { await p.evaluate(() => { location.hash = 'reglages'; }); await p.waitForTimeout(800); await p.evaluate(() => reglage('maj')); await p.waitForTimeout(600); }
  await p.screenshot({ path: OUT + '/1-version.png' });
  ok('version affichée (' + v1.id + ')', await p.evaluate(id => document.querySelector('#rgl-maj').innerText.includes(id), v1.id));
  // 1. rien de nouveau
  await p.click('#rgl-maj button:has-text("Chercher une mise à jour")'); await p.waitForTimeout(1200);
  ok('à jour : "Tu as la dernière version"', await p.evaluate(() => /dernière version/.test(document.querySelector('#rgl-maj').innerText)));
  ok('pas de bandeau', await p.evaluate(() => !document.querySelector('.maj-bandeau')));
  // 2. une nouvelle version est mise en ligne
  const v2 = publierV2();
  await p.click('#rgl-maj button:has-text("Chercher une mise à jour")'); await p.waitForTimeout(400);
  await p.screenshot({ path: OUT + '/2-trouvee.png' });
  ok('nouvelle version trouvée', await p.evaluate(() => /nouvelle version/i.test(document.querySelector('#rgl-maj').innerText) && !!document.querySelector('#rgl-maj button.primary')));
  await p.waitForTimeout(4000);
  await p.screenshot({ path: OUT + '/3-bandeau.png' });
  ok('bandeau "Nouvelle version prête" affiché', await p.evaluate(() => { const x = document.querySelector('.maj-bandeau'); return !!x && /Nouvelle version prête/.test(x.innerText) && /Mettre à jour/.test(x.innerText); }));
  await p.evaluate(() => { location.hash = 'loyers'; }); await p.waitForTimeout(400);
  ok('bandeau visible aussi sur les autres pages', await p.evaluate(() => !!document.querySelector('.maj-bandeau')));
  const sw = await p.evaluate(() => document.documentElement.scrollWidth); ok('pas de débordement (' + sw + ')', sw <= 390);
  // 3. Mettre à jour = recharge dans la nouvelle version
  await Promise.all([p.waitForNavigation({ timeout: 15000 }), p.click('.maj-bandeau button')]); await p.waitForTimeout(2500);
  ok('rechargée dans la nouvelle version (' + v2.id + ')', await p.evaluate(id => window.APP_VERSION && window.APP_VERSION.id === id, v2.id));
  ok('plus de bandeau après la mise à jour', await p.evaluate(() => !document.querySelector('.maj-bandeau')));
  await p.evaluate(() => { location.hash = 'reglages'; }); await p.waitForTimeout(500); await p.evaluate(() => reglage('maj')); await p.waitForTimeout(500);
  await p.screenshot({ path: OUT + '/4-apres.png' });
  ok('Réglages montre la nouvelle version', await p.evaluate(id => document.querySelector('#rgl-maj').innerText.includes(id), v2.id));
  // ménage
  await p.evaluate(async e => { await SB.from('espaces').delete().eq('id', e); }, espace);
  console.log('ERREURS', errs); console.log('KO', KO);
  await b.close(); srv.close(); fs.rmSync(DIR, { recursive: true, force: true });
})().catch(e => { console.log('FATAL', e.message); srv.close(); process.exit(1); });

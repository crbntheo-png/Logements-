// iPhone : barre du bas collée à la barre d'accueil (zone du bas simulée), fond opaque, tirer pour actualiser (roue),
// barre du bas cachée pendant la saisie (clavier), pas de débordement horizontal, champs à 16 px (pas de zoom).
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); }).listen(8099);
let ok = 0, ko = 0; const t = (c, m) => { c ? ok++ : ko++; console.log((c ? 'OK ' : 'KO ') + m); };
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const ctx = await b.newContext({ ...devices['iPhone 13'], ignoreHTTPSErrors: true, serviceWorkers: 'block' }); const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(1500);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test iphone'); await p.click('#esp_btn'); await p.waitForTimeout(2000);
  const ESP = await p.evaluate(() => ESPACE);
  await p.evaluate(() => { S.biens.push({ id: 'b1', nom: 'T2', adresse: '1 rue', cp: '35000', ville: 'Rennes' }); S.baux.push({ id: 'l1', bienId: 'b1', nom: 'Jean Test', typeBail: 'vide', dateEntree: '2026-01-01', suiviDepuis: '2026-11', loyerHC: '500', charges: '0', jourPaiement: '5', revisions: [] }); save();
    document.documentElement.style.setProperty('--sab', '18px'); go('afaire'); render(); }); // iPhone : 34 px de zone d'accueil − 16
  await p.waitForTimeout(500);
  const nav = await p.evaluate(() => { const r = document.getElementById('bottomnav').getBoundingClientRect(), cs = getComputedStyle(document.getElementById('bottomnav')); return { bas: Math.round(r.bottom), haut: Math.round(r.height), vh: innerHeight, fond: cs.backgroundColor }; });
  t(nav.bas === nav.vh && nav.haut === 64 + 18 && !/rgba\(.*0\.\d+\)/.test(nav.fond), 'barre du bas : collée en bas, 82 px (64 + zone d\'accueil réduite), fond opaque ' + JSON.stringify(nav));
  await p.screenshot({ path: __dirname + '/shots73/iphone-afaire.png' });
  // tirer pour actualiser
  await p.evaluate(() => { window.__n = 0; const o = rafraichirTout; rafraichirTout = async () => { window.__n++; await o(); }; scrollTo(0, 0); });
  const cdp = await ctx.newCDPSession(p), tp = (type, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: 195, y }] });
  await tp('touchStart', 200); for (let y = 210; y <= 400; y += 15) { await tp('touchMove', y); await p.waitForTimeout(10); }
  const vu = await p.evaluate(() => ({ o: +getComputedStyle(document.getElementById('ptr')).opacity, pret: document.getElementById('ptr').classList.contains('pret') }));
  await p.screenshot({ path: __dirname + '/shots73/iphone-tirer.png' });
  await tp('touchEnd'); await p.waitForTimeout(2500);
  const n = await p.evaluate(() => window.__n);
  t(vu.o > 0.9 && vu.pret, 'en tirant : la roue apparaît et passe en "prêt" ' + JSON.stringify(vu));
  t(n === 1, 'en relâchant : l\'appli relit les données en ligne (1 fois)');
  await tp('touchStart', 200); await tp('touchMove', 230); await tp('touchEnd'); await p.waitForTimeout(400);
  t((await p.evaluate(() => window.__n)) === 1, 'petit geste : rien ne se passe');
  // clavier
  await p.evaluate(() => { go('docs'); render(); }); await p.waitForTimeout(400);
  await p.evaluate(() => { const i = document.querySelector('#app input[type=search], #app input'); i && i.focus(); }); await p.waitForTimeout(200);
  const cl = await p.evaluate(() => [document.body.classList.contains('clavier'), getComputedStyle(document.getElementById('bottomnav')).display]);
  await p.evaluate(() => document.activeElement.blur()); await p.waitForTimeout(300);
  const cl2 = await p.evaluate(() => getComputedStyle(document.getElementById('bottomnav')).display);
  t(cl[0] && cl[1] === 'none' && cl2 !== 'none', 'saisie : la barre du bas se cache au-dessus du clavier, puis revient ' + JSON.stringify([cl, cl2]));
  // débordement horizontal et taille des champs
  const pages = ['locataires', 'afaire', 'biens', 'bien-b1', 'bail-l1', 'docs', 'compta', 'reglages', 'nouveautes'], deb = [];
  for (const h of pages) { await p.evaluate(h => { go(h); render(); }, h); await p.waitForTimeout(250); const w = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]); if (w[0] > w[1]) deb.push(h + ':' + w[0]); }
  t(!deb.length, 'aucune page ne déborde sur le côté ' + deb.join(' '));
  const petits = await p.evaluate(() => [...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=file]), select, textarea')].filter(x => parseFloat(getComputedStyle(x).fontSize) < 16).map(x => x.name || x.id).slice(0, 5));
  t(!petits.length, 'champs à 16 px au moins : pas de zoom automatique sur iPhone ' + petits.join(','));
  t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  await p.evaluate(async esp => { await SB.from('espaces').delete().eq('id', esp); }, ESP);
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

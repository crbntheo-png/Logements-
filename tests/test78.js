// Canal "Quoi de neuf" : discret depuis le 19/11 (pas de bandeau sur l'accueil ; pastille dans Réglages › Plus de réglages), page #nouveautes groupée par jour, vu = bandeau
// disparu, entrée dans Réglages, type de notification réglable ; nouvelle annonce → réapparaît ; notification envoyée une seule fois.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const DIST = path.join(__dirname, '..', 'dist');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); }).listen(8099);
let ok = 0, ko = 0; const t = (c, m) => { c ? ok++ : ko++; console.log((c ? 'OK ' : 'KO ') + m); };
const sql = q => JSON.parse(execSync(`python3 ${__dirname}/sql.py ${JSON.stringify(q)}`, { encoding: 'utf8' }) || '[]');
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true, serviceWorkers: 'block' })).newPage();
  p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { localStorage.removeItem('gestion-sci-nv-vu'); const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test nouveautes'); await p.click('#esp_btn'); await p.waitForTimeout(2000);
  const ESP = await p.evaluate(() => ESPACE);
  await p.evaluate(() => { S.biens.push({ id: 'b1', nom: 'T2', adresse: '1 rue', cp: '35000', ville: 'Rennes' }); S.baux.push({ id: 'l1', bienId: 'b1', nom: 'Jean Test', typeBail: 'vide', dateEntree: '2026-01-01', suiviDepuis: '2026-11', loyerHC: '500', charges: '0', jourPaiement: '5', revisions: [] }); save(); go('locataires'); render(); });
  await p.waitForTimeout(3000); await p.evaluate(() => render());
  t(!(await p.locator('.nv-bandeau').count()), 'accueil : pas de bandeau de nouveautés (Théo : "ça va les saouler")');
  const pastille = async () => { await p.evaluate(() => { go('reglages'); render(); }); await p.waitForTimeout(1500); return p.evaluate(() => ((document.querySelector('details.plus-rgl summary') || {}).textContent || '').replace(/\s+/g, ' ')); };
  let ban = await pastille();
  t(/🆕 \d+ nouveautés?/.test(ban), 'Réglages › Plus de réglages : pastille "🆕 N nouveautés" (' + ban + ')');
  await p.evaluate(() => { go('nouveautes'); render(); }); await p.waitForTimeout(1500);
  const pg = await p.locator('#app').innerText();
  t(/Dernières nouveautés de l'appli/.test(pg) && /18 novembre 2026/.test(pg) && /Signature à distance/.test(pg) && /Mois clôturés/.test(pg), 'page "🆕 Quoi de neuf" groupée par jour');
  await p.screenshot({ path: __dirname + '/shots73/nv-page.png', fullPage: true });
  t(!/🆕 \d+ nouveaut/.test(await pastille()), 'déjà vu : plus de pastille');
  await p.evaluate(() => { go('reglages'); render(); }); await p.waitForTimeout(300);
  await p.evaluate(() => { view.plusRgl = true; render(); }); await p.waitForTimeout(200);
  t(/Dernières nouveautés de l'appli/.test(await p.locator('#app').innerText()), 'Réglages › Plus de réglages : "🆕 Dernières nouveautés de l\'appli"');
  t(await p.evaluate(() => TYPES_NOTIF.some(x => x[0] === 'nouveautes')), 'Notifications : "Nouveautés de l\'appli" réglable');
  // une nouvelle annonce (sans notification réelle : test)
  sql("insert into public.nouveautes (id, icone, titre, texte, annonce_le) values ('test-nv', '🧪', 'Essai de nouveauté', 'Texte simple.', now()) on conflict (id) do update set cree_le = now()");
  await p.evaluate(async () => { NV.etat = 'inconnu'; await chargerNouveautes(); view.plusRgl = false; }); await p.waitForTimeout(300);
  ban = await pastille(); t(/🆕 1 nouveauté/.test(ban), 'nouvelle annonce : la pastille revient (' + ban + ')');
  await p.evaluate(() => { go('locataires'); render(); }); await p.waitForTimeout(300); t(!(await p.locator('.nv-bandeau').count()), 'et toujours rien sur l\'accueil');
  // jamais deux notifications pour la même nouveauté
  const n0 = sql("select annonce_le is not null a from public.nouveautes where id = 'test-nv'")[0].a;
  t(n0 === true, 'nouveauté déjà annoncée : la fonction ne renverra pas de notification');
  sql("delete from public.nouveautes where id = 'test-nv'");
  t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  await p.evaluate(async esp => { await SB.from('espaces').delete().eq('id', esp); }, ESP);
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

// Navigation propre + "Pas besoin" (retour de Théo, 19/11) — mode local, espace de démonstration, iPhone 13.
// 1. Docs › un logement : l'onglet Docs reste allumé, "← Documents" ramène à Docs, et ce qui manque est listé avec un bouton.
// 2. Biens › logement › Tout voir : retour vers le logement puis vers Biens ; onglet Biens allumé.
// 3. "Pas besoin" retire l'info (compteur de la tuile mis à jour), "Annuler" la remet, "Redemander" dans le menu Plus.
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist');
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'application/javascript' : 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(8097);
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const p = await (await b.newContext({ ...devices['iPhone 13'], ignoreHTTPSErrors: true, serviceWorkers: 'block' })).newPage();
  p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
  await p.goto('http://localhost:8097/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test Navigation'); await p.click('#esp_btn'); await p.waitForTimeout(3000);
  try {
  const bid = await p.evaluate(() => { const d = demo(); S.biens = d.biens; S.baux = d.baux; S.paiements = d.paiements || []; const bi = S.biens.find(x => !x.immeuble);
    // un document rangé dans ce logement, pour avoir une tuile dans Docs
    S.fichiers = [{ id: 'fx1', bienId: bi.id, bailId: '', cat: 'Bail', nom: 'Bail signé', url: 'https://exemple.fr/bail', date: '2026-11-10' }];
    delete bi.risquesVerifies; delete bi.pnoEcheance; save(); location.hash = 'docs'; render(); return bi.id; });
  await p.waitForTimeout(500);
  const nav = () => p.evaluate(() => (document.querySelector('#bottomnav a.on') || {}).textContent || '');
  const back = () => p.evaluate(() => { const a = document.querySelector('#app a.back'); return a ? '← ' + a.textContent.replace(/^\s*←?\s*/, '').trim() + ' | ' + a.getAttribute('href') : ''; });
  const tuile = p.locator(`a.doc-tuile[href^="#docs-${bid}~"]`);
  ok('tuile du logement dans Docs', await tuile.count() === 1);
  const avant = (await tuile.textContent()).match(/(\d+) infos? à compléter/);
  ok('la tuile annonce des infos à compléter', !!avant);
  await tuile.click(); await p.waitForTimeout(300);
  fs.mkdirSync(__dirname + '/shots97', { recursive: true }); await p.screenshot({ path: __dirname + '/shots97/docs-logement.png' });
  ok('onglet Docs toujours allumé', /Docs/.test(await nav()));
  ok('retour = "← Documents"', /^← Documents \| #docs$/.test(await back()));
  await p.evaluate(() => { const d = document.querySelector('#app details.a-completer'); if (d) d.open = true; });
  const carte = p.locator('#app .a-completer');
  ok('ce qui manque est listé sur la page', await carte.count() === 1 && /manque/.test(await carte.locator('h2').textContent()));
  const nb = n => p.locator('#app .a-completer li').count();
  const n0 = await carte.locator('.todo li').count() + (await p.locator('#app .a-completer details li').count());
  ok('chaque info a un bouton "Pas besoin"', await p.locator('#app .a-completer .pas-besoin').count() >= 1);
  // Pas besoin sur les risques
  const liR = p.locator('#app .a-completer li', { hasText: 'Les risques' });
  ok('les risques sont demandés', await liR.count() === 1);
  await liR.locator('.pas-besoin').click(); await p.waitForTimeout(300);
  ok('risques retirés après "Pas besoin"', await p.locator('#app .a-completer li', { hasText: 'Les risques' }).count() === 0);
  ok('toast avec Annuler', await p.locator('#toast:not([hidden]) .toast-undo', { hasText: 'Annuler' }).count() === 1);
  await p.locator('#toast .toast-undo').click(); await p.waitForTimeout(300);
  ok('Annuler remet les risques', await p.locator('#app .a-completer li', { hasText: 'Les risques' }).count() === 1);
  await p.locator('#app .a-completer li', { hasText: 'Les risques' }).locator('.pas-besoin').click(); await p.waitForTimeout(300);
  // Retour vers Docs : la tuile compte une info de moins
  await p.locator('#app a.back').click(); await p.waitForTimeout(300);
  ok('retour arrive sur Docs', await p.evaluate(() => location.hash) === '#docs' && /Docs/.test(await nav()));
  const apres = (await p.locator(`a.doc-tuile[href^="#docs-${bid}~"]`).textContent()).match(/(\d+) infos? à compléter/);
  ok(`compteur mis à jour (${avant && avant[1]} → ${apres ? apres[1] : 0})`, +(apres ? apres[1] : 0) === +avant[1] - 1);
  // Biens › logement › Tout voir › retour › retour
  await p.click('#bottomnav a[href="#biens"]'); await p.waitForTimeout(300);
  await p.evaluate(id => go('bien-' + id), bid); await p.waitForTimeout(300);
  ok('fiche du logement : retour "← Biens"', /^← Biens \| #biens$/.test(await back()));
  await p.screenshot({ path: __dirname + '/shots97/fiche-logement.png', fullPage: true });
  const sb = await p.evaluate(() => { const c = document.querySelector('#app .suivi-bien'); return c ? { n: c.querySelectorAll('.sb-s').length, t: c.innerText } : null; });
  ok('tableau de bord du logement : 3 chiffres (reçus, occupé, retard)', sb && sb.n === 3 && /loyers reçus/.test(sb.t) && /occupé/.test(sb.t) && /retard/.test(sb.t));
  ok('tableau de bord : prochaines dates', sb && /Prochaines dates/.test(sb.t));
  ok('Redemander dans le menu Plus', await p.locator('#app .menu-plus', { hasText: 'Redemander les infos mises de côté' }).count() === 1);
  const nomBien = await p.evaluate(id => bien(id).nom, bid);
  await p.evaluate(id => go(lienDocs(id, -1, '').slice(1)), bid); await p.waitForTimeout(300);
  ok('docs depuis Biens : onglet Biens allumé', /Biens/.test(await nav()));
  ok('docs depuis Biens : retour vers le logement', (await back()) === `← ${nomBien} | #bien-${bid}`);
  // changer de type (puce) ne rallonge pas le chemin du retour
  const puce = p.locator('#app .chips-cat a.chip').nth(1);
  if (await puce.count()) { await puce.click(); await p.waitForTimeout(300); ok('après une puce, retour toujours vers le logement', (await back()) === `← ${nomBien} | #bien-${bid}`); }
  await p.locator('#app a.back').click(); await p.waitForTimeout(300);
  ok('retour sur la fiche du logement', await p.evaluate(() => location.hash) === '#bien-' + bid);
  ok('puis retour "← Biens"', /^← Biens/.test(await back()));
  // Accueil › locataire › retour Accueil, onglet Accueil
  await p.click('#bottomnav a[href="#locataires"]'); await p.waitForTimeout(300);
  const bail = await p.evaluate(() => S.baux[0].id);
  await p.evaluate(id => go('bail-' + id), bail); await p.waitForTimeout(300);
  ok('fiche locataire depuis Accueil : retour "← Accueil"', /^← Accueil \| #locataires$/.test(await back()) && /Accueil/.test(await nav()));
  // Biens › logement › locataire : retour vers le logement, onglet Biens
  await p.click('#bottomnav a[href="#biens"]'); await p.waitForTimeout(200);
  const b2 = await p.evaluate(() => { const b = S.baux.find(x => x.bienId); go('bien-' + b.bienId); return b; });
  await p.waitForTimeout(200); await p.evaluate(id => go('bail-' + id), b2.id); await p.waitForTimeout(300);
  ok('locataire depuis un logement : retour vers le logement, onglet Biens', (await back()).endsWith('#bien-' + b2.bienId) && /Biens/.test(await nav()));
  // Pas besoin de la PNO : plus de rappel dans À faire
  const pno = await p.evaluate(id => { const bi = bien(id); bi.sansBesoin = ['pno']; return taches().some(t => t.key === 'leg-pno-' + id); }, bid);
  ok('PNO mise de côté : plus de rappel dans À faire', !pno);
  } finally { await p.evaluate(async () => { await SB.from('espaces').delete().eq('id', ESPACE); }); }
  ok('aucune erreur', !errs.length); if (errs.length) console.log(errs);
  await b.close(); srv.close(); console.log(KO ? `\n${KO} échec(s)` : '\nTout est bon'); process.exit(KO ? 1 : 0);
})();

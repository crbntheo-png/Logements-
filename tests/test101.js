// Banque en direct pas encore ouverte à tous (cas de Max, 20/11) — vraie base, compte de test (aucune banque qui marche), espace temporaire.
// Le serveur dit "pas ouverte" et refuse de lancer une connexion ; l'appli ne propose plus "Relier ma banque" ni "Réessayer",
// elle met "Importer mon relevé" à la place, partout (Compta › Banque, Réglages › Banque, À faire, retour de la banque).
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist');
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'application/javascript' : 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(8101);
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const p = await (await b.newContext({ ...devices['iPhone 13'], ignoreHTTPSErrors: true, serviceWorkers: 'block' })).newPage();
  p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
  await p.goto('http://localhost:8101/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test Banque fermée'); await p.click('#esp_btn'); await p.waitForTimeout(3000);
  try {
    const dispo = await p.evaluate(() => fnBanque({ action: 'dispo' }).then(j => j.ouverte, e => 'err ' + e.message));
    ok('serveur : banque en direct pas ouverte pour ce compte', dispo === false);
    const refus = await p.evaluate(() => fnBanque({ action: 'connecter', espace: ESPACE, banque: 'CIC', type: 'business' }).then(() => 'lancée', e => e.message));
    ok('serveur : refuse de lancer une connexion', /pas encore ouverte/.test(refus));
    await p.evaluate(() => { view.comptaOnglet = 'banque'; location.hash = 'compta'; render(); }); await p.waitForTimeout(1500);
    const compta = await p.evaluate(() => document.querySelector('#app').innerText);
    ok('Compta › Banque : "Importer mon relevé", pas de "Relier ma banque"', /Importer mon relevé/.test(compta) && !/Relier ma banque/.test(compta));
    await p.evaluate(() => relierBanque()); await p.waitForTimeout(300);
    ok('"Relier ma banque" appelé quand même : explication + relevé, pas de choix de banque', await p.evaluate(() => /pas encore ouverte/.test(document.getElementById('overlay').innerText) && !document.getElementById('bq_q') && !!document.querySelector('#overlay button[onclick="importerReleve()"]')));
    await p.evaluate(() => closeOverlay());
    // Comme Max : un essai resté sans compte
    await p.evaluate(() => { BANQUE.directe = { banque: 'CIC', comptes: [], erreur: null }; render(); });
    ok('À faire : plus de "Ta banque n\'a donné aucun compte"', await p.evaluate(() => !taches().some(t => t.key === 'bq-zero')));
    const reg = await p.evaluate(() => { const d = document.createElement('div'); d.innerHTML = sectionBanqueReglages(); return d.innerText; });
    ok('Réglages › Banque : relevé + "Retirer l\'essai", plus de "Réessayer"', /Importer mon relevé/.test(reg) && /Retirer l'essai de CIC/.test(reg) && !/Réessayer/.test(reg));
    await p.evaluate(() => importerReleve()); await p.waitForTimeout(300);
    ok('"Importer mon relevé" ouvre l\'import', await p.evaluate(() => /relevé/i.test(document.querySelector('#overlay .mh h2').textContent) && !!document.getElementById('relfile')));
  } finally { await p.evaluate(async () => { await SB.from('espaces').delete().eq('id', ESPACE); }); }
  ok('aucune erreur', !errs.length); if (errs.length) console.log(errs);
  await b.close(); srv.close(); console.log(KO ? `\n${KO} échec(s)` : '\nTout est bon'); process.exit(KO ? 1 : 0);
})();

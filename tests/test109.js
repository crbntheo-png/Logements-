// Qonto (clé API, gratuit, lecture seule) — vraie base, compte de test, espace temporaire, VRAI serveur Qonto avec une clé fausse.
// Bouton "Brancher Qonto" dans Compta › Banque et Réglages ; 3 étapes ; clé fausse → refus clair de Qonto ; clé mal collée → aide ;
// la clé ne peut pas être lue par un utilisateur ; affichage une fois branché (simulé) sans "Relier ma banque" en plus.
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist');
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'application/javascript' : f.endsWith('.json') ? 'application/json' : 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(8109);
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const p = await (await b.newContext({ ...devices['iPhone 13'], ignoreHTTPSErrors: true, serviceWorkers: 'block' })).newPage();
  p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
  await p.goto('http://localhost:8109/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test Qonto'); await p.click('#esp_btn'); await p.waitForTimeout(3000);
  try {
    await p.evaluate(() => { view.comptaOnglet = 'banque'; location.hash = 'compta'; render(); }); await p.waitForTimeout(1500);
    ok('Compta › Banque : "Ta banque est Qonto ? · Brancher Qonto"', await p.locator('#app button:has-text("Brancher Qonto")').count() === 1);
    await p.click('#app button:has-text("Brancher Qonto")'); await p.waitForTimeout(300);
    const m = await p.evaluate(() => document.getElementById('overlay').innerText);
    ok('3 étapes : Qonto › Paramètres › Intégrations et partenariats › Clé API', /Intégrations et partenariats/.test(m) && /Clé API/.test(m) && /identifiant/i.test(m));
    ok('rassurant, replié : lecture seule, aucun virement', /Est-ce sûr/.test(m) && await p.evaluate(() => /aucun virement/.test(document.getElementById('overlay').textContent)));
    // clé mal collée
    await p.fill('#mform [name=login]', 'x'); await p.fill('#mform [name=cle]', 'court'); await p.click('#mform button.primary'); await p.waitForTimeout(3000);
    ok('clé mal collée : on dit où la trouver', /Clé API/.test(await p.evaluate(() => (document.getElementById('qonto_err') || {}).textContent || '')));
    // clé fausse : le vrai Qonto la refuse
    await p.fill('#mform [name=login]', 'sci-test-1234'); await p.fill('#mform [name=cle]', 'abcdefghijklmnopqrstu'); await p.click('#mform button.primary'); await p.waitForTimeout(6000);
    const err = await p.evaluate(() => (document.getElementById('qonto_err') || {}).textContent || '');
    ok(`clé fausse : refus clair (${err.trim()})`, /refuse cet identifiant/.test(err) && await p.evaluate(() => /Brancher/.test(document.querySelector('#mform button.primary').textContent)));
    ok('rien de branché après un refus', await p.evaluate(async () => !(await SB.from('banque_directe').select('banque').eq('espace_id', ESPACE).maybeSingle()).data));
    // la clé n'est jamais lisible par un utilisateur
    const lu = await p.evaluate(async () => { const r = await SB.rpc('qonto_cle_lire', { e: ESPACE }); return r.error ? 'refusé' : 'LU : ' + r.data; });
    ok('la clé Qonto ne peut pas être lue depuis l\'appli', lu === 'refusé');
    await p.evaluate(() => closeOverlay());
    // une fois branché (simulé côté appli) : bloc Qonto, pas de date d'accord, pas de "Relier ma banque" en plus
    const t = await p.evaluate(() => { BANQUE.directe = { banque: 'Qonto', comptes: [{ uid: 'x', nom: 'Compte principal …1234' }], derniere_synchro: new Date().toISOString(), erreur: null }; BQ_OUVERTE = false; const d = document.createElement('div'); d.innerHTML = sectionBanqueReglages(); return { txt: d.innerText, ouverte: bqOuverte() }; });
    ok('branché : "🟣 Qonto", relu toutes les 6 heures, pas de date d\'accord', /Qonto/.test(t.txt) && /6 heures/.test(t.txt) && !/Accord jusqu/.test(t.txt));
    ok('Qonto ne fait pas apparaître "Relier ma banque" (autre banque)', !t.ouverte && !/Relier ma banque/.test(t.txt));
    ok('en cas d\'erreur : "Rebrancher Qonto"', await p.evaluate(() => { BANQUE.directe.erreur = 'Qonto refuse la clé'; const d = document.createElement('div'); d.innerHTML = sectionBanqueReglages(); return /Rebrancher Qonto/.test(d.innerText) && /brancherQonto\(\)/.test(d.innerHTML); }));
  } finally { await p.evaluate(async () => { await SB.from('espaces').delete().eq('id', ESPACE); }); }
  ok('aucune erreur', !errs.length); if (errs.length) console.log(errs);
  await b.close(); srv.close(); console.log(KO ? `\n${KO} échec(s)` : '\nTout est bon'); process.exit(KO ? 1 : 0);
})();

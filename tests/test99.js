// Assistant "Pose ta question" — vraie base, compte de test, espace temporaire, UNE vraie question à l'IA (~0,03 $).
// Bouton sur l'accueil, fenêtre avec exemples, réponse qui cite le bon locataire en retard et le bon montant, boutons qui ouvrent la bonne fiche,
// quota "questions" à part, rien n'est envoyé d'autre que le résumé des données.
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist');
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'application/javascript' : 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(8099);
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const p = await (await b.newContext({ ...devices['iPhone 13'], ignoreHTTPSErrors: true, serviceWorkers: 'block' })).newPage();
  p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
  let envoye = null; p.on('request', r => { if (/functions\/v1\/ia/.test(r.url()) && /"question"/.test(r.postData() || '')) envoye = JSON.parse(r.postData()); });
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test Assistant'); await p.click('#esp_btn'); await p.waitForTimeout(3000);
  try {
    // deux locataires : Léa Martin à jour, Paul Durand qui doit le loyer du mois dernier (650 €)
    await p.evaluate(() => {
      S.biens = [{ id: 'b1', nom: 'T2 Gare', adresse: '3 rue de la Gare', cp: '35000', ville: 'Rennes', type: 'Appartement', meuble: 'vide' }, { id: 'b2', nom: 'Studio Port', adresse: '8 quai du Port', cp: '35000', ville: 'Rennes', type: 'Studio', meuble: 'meuble' }];
      const m1 = addM(CUR, -1);
      S.baux = [{ id: 'l1', bienId: 'b1', nom: 'Léa Martin', typeBail: 'vide', dateEntree: '2024-03-01', loyerHC: 700, charges: 50, jourPaiement: 5, revisions: [], revisable: true, suiviDepuis: addM(CUR, -2) },
        { id: 'l2', bienId: 'b2', nom: 'Paul Durand', typeBail: 'meuble', dateEntree: '2025-01-15', loyerHC: 600, charges: 50, jourPaiement: 5, revisions: [], revisable: true, suiviDepuis: addM(CUR, -2) }];
      S.paiements = [addM(CUR, -2), m1, CUR].map((m, i) => ({ id: 'pa' + i, bailId: 'l1', mois: m, montant: 750, date: m + '-04', mode: 'virement' })).concat([{ id: 'pb', bailId: 'l2', mois: addM(CUR, -2), montant: 650, date: addM(CUR, -2) + '-04', mode: 'virement' }, { id: 'pc', bailId: 'l2', mois: CUR, montant: 650, date: CUR + '-04', mode: 'virement' }]);
      save(); location.hash = 'locataires'; render(); });
    await p.waitForTimeout(600);
    ok('bouton "Pose ta question" sur l\'accueil', await p.locator('#app .pose-q').count() === 1);
    await p.click('#app .pose-q'); await p.waitForTimeout(300);
    ok('fenêtre avec exemples de questions', await p.locator('#mform .q-ex .chip').count() === 4);
    await p.locator('#mform .q-ex .chip').first().click();
    ok('un exemple remplit la question', /Qui me doit/.test(await p.inputValue('#mform [name=q]')));
    await p.click('#mform > .full.row button.primary');
    await p.waitForSelector('#q_rep .q-rep, #q_rep .note:not(:has(.spin))', { timeout: 90000 });
    const rep = await p.evaluate(() => ({ t: (document.querySelector('#q_rep') || {}).innerText || '', btns: [...document.querySelectorAll('#q_rep button')].map(x => x.getAttribute('onclick')) }));
    console.log('    Réponse :', rep.t.replace(/\s+/g, ' ').slice(0, 400)); console.log('    Boutons :', rep.btns.join(' | '));
    ok('réponse reçue', /Paul/.test(rep.t));
    ok('cite le bon montant (650 €) et pas Léa comme débitrice', /650/.test(rep.t) && !/Léa[^.]*doit/.test(rep.t));
    ok('boutons valides (pages connues)', rep.btns.every(x => /go\('(afaire|biens|docs|compta|loyers|locataires|reglages|bail-l[12]|bien-b[12])'\)/.test(x)));
    ok('envoyé : résumé des données, sans document', !!envoye && envoye.contexte && envoye.contexte.locataires.length === 2 && envoye.contexte.locataires.find(x => x.id === 'l2').doit === 650 && !/fichiers|chemin|url/.test(JSON.stringify(envoye.contexte)));
    ok('quota de questions à part', await p.evaluate(() => IA.credits && IA.credits.q_restantes != null));
    if (rep.btns.length) { await p.locator('#q_rep button').first().click(); await p.waitForTimeout(400); ok('un bouton ouvre la page et ferme la fenêtre', await p.evaluate(() => document.getElementById('overlay').hidden && location.hash !== '#locataires')); }
  } finally { await p.evaluate(async () => { await SB.from('espaces').delete().eq('id', ESPACE); }); }
  ok('aucune erreur', !errs.length); if (errs.length) console.log(errs);
  await b.close(); srv.close(); console.log(KO ? `\n${KO} échec(s)` : '\nTout est bon'); process.exit(KO ? 1 : 0);
})();

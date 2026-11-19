// Démarrage en 5 minutes (#demarrage) : vraie base, compte de test, espace temporaire ; Drive et réponse de l'IA simulés (aucun crédit).
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist'), OUT = __dirname + '/shots88'; fs.mkdirSync(OUT, { recursive: true });
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'application/javascript' : 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(8094);
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const p = await (await b.newContext({ ...devices['iPhone 13'], ignoreHTTPSErrors: true, serviceWorkers: 'block' })).newPage();
  p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
  let appelsIA = 0; p.on('request', r => { if (/functions\/v1\/ia/.test(r.url()) && r.method() === 'POST' && !/"credits"/.test(r.postData() || '')) appelsIA++; });
  await p.goto('http://localhost:8094/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test Démarrage'); await p.click('#esp_btn'); await p.waitForTimeout(3000);
  try {
    // accueil d'un nouveau venu : le Drive mène au démarrage
    await p.evaluate(() => { location.hash = 'locataires'; render(); }); await p.waitForTimeout(300);
    ok('bienvenue : "Depuis ton Google Drive" mène au démarrage', await p.evaluate(() => /go\('demarrage'\)/.test(document.querySelector('.bienvenue .suite.reco').getAttribute('onclick'))));
    await p.click('.bienvenue .suite.reco'); await p.waitForTimeout(600);
    await p.screenshot({ path: OUT + '/1-drive.png' });
    ok('étape 1 : "Partager mon dossier" (0/4)', await p.evaluate(() => location.hash === '#demarrage' && /0\/4 étapes/.test(document.body.innerText) && !!document.querySelector('.dem-e.cur button.primary') && /Partager mon dossier/.test(document.querySelector('.dem-e.cur').innerText)));
    // Drive partagé (simulé)
    await p.evaluate(() => { PARTAGE = { etat: 'pret', adresse: 'lecture@exemple.iam', racines: [{ dossier: 'D1', nom: 'Locations' }] };
      DOCS = { etat: 'pret', n: 2, fichiers: [{ id: 'fb1', titre: 'Bail Dupont signé.pdf', type: 'application/pdf', partage: true, parent: 'D2', modif: '2026-01-02' }, { id: 'fd1', titre: 'DPE Rennes.pdf', type: 'application/pdf', partage: true, parent: 'D2', modif: '2025-03-12' }],
        dossiers: { D1: { titre: 'Locations', chemin: ['Locations'] }, D2: { titre: 'Appart Rennes', chemin: ['Locations', 'Appart Rennes'], ancetres: ['D1'] } } }; IA.credits = { illimite: false, par_mois: 5, par_jour: 2, mois_restant: 5, jour_restant: 2, docs_restants: 10 }; render(); });
    await p.waitForTimeout(400);
    ok('étape 2 : bilan de l\'IA proposé (1/4)', await p.evaluate(() => /1\/4 étapes/.test(document.body.innerText) && /Qu'est-ce que tu me suggères/.test(document.querySelector('.dem-e.cur').innerText)));
    await p.screenshot({ path: OUT + '/2-bilan.png' });
    // réponse de l'IA (simulée)
    await p.evaluate(() => { S.sci.ia = { date: new Date().toISOString(), res: { resume: 'Un appartement à Rennes, loué à Jean Dupont.', biens_a_creer: [{ nom: 'Appart Rennes', adresse: '41 rue de Beauchamps, 35000 Rennes', type: 'Appartement', dossiers: ['D2'], raison: 'Dossier dédié' }], liens: [], locataires_actuels: [{ nom: 'Jean Dupont', bien_a_creer: 'Appart Rennes', raison: 'Bail signé dans le dossier' }], anciens_locataires: [], biens_sans_dossier: [] } }; IA.fait = true; render(); });
    await p.waitForTimeout(300);
    ok('étape 2 : logement à créer, modifiable', await p.evaluate(() => /Logements à créer \(1\)/.test(document.querySelector('.dem-e.cur').innerText) && document.querySelector('.dem-e.cur input[name=n0]').value === 'Appart Rennes'));
    await p.click('.dem-e.cur button:has-text("Appliquer ce qui est coché")'); await p.waitForTimeout(1500);
    await p.screenshot({ path: OUT + '/3-locataires.png' });
    ok('logement créé avec son adresse, toujours sur le démarrage', await p.evaluate(() => S.biens.length === 1 && S.biens[0].cp === '35000' && location.hash === '#demarrage'));
    ok('étape 3 : Jean Dupont, "Créer depuis son bail" (bail trouvé dans le Drive)', await p.evaluate(() => /2\/4 étapes/.test(document.body.innerText) && /Jean Dupont/.test(document.querySelector('.dem-e.cur').innerText) && /Créer depuis son bail/.test(document.querySelector('.dem-e.cur').innerText)));
    // ajout à la main : on reste sur le démarrage
    await p.evaluate(() => editBail(null, S.biens[0].id)); await p.waitForTimeout(300);
    await p.fill('#mform input[name=nom]', 'Jean Dupont'); await p.fill('#mform input[name=loyerHC]', '500');
    await p.screenshot({ path: OUT + '/3b-form.png' });
    await p.evaluate(() => document.getElementById('mform').requestSubmit()); await p.waitForTimeout(1200);
    console.log('   (hash après ajout :', await p.evaluate(() => location.hash + ' baux=' + S.baux.length + ' overlay=' + !document.getElementById('overlay').hidden + ' toast=' + ((document.getElementById('toast') || {}).textContent || '')), ')');
    ok('locataire créé, on reste sur le démarrage', await p.evaluate(() => S.baux.length === 1 && location.hash === '#demarrage'));
    await p.screenshot({ path: OUT + '/4-fin.png', fullPage: true });
    ok('fin : "C\'est prêt" + récap (1 logement, 1 locataire)', await p.evaluate(() => /C'est prêt/.test(document.body.innerText) && /4\/4 étapes/.test(document.body.innerText) && /1\s*logement/.test(document.querySelector('.dem-recap').innerText) && /1\s*locataire/.test(document.querySelector('.dem-recap').innerText)));
    // passer une étape
    await p.evaluate(() => { S.faits['dem-fiches'] = ''; S.baux = []; render(); }); await p.waitForTimeout(200);
    await p.click('.dem-e.cur button:has-text("Plus tard")'); await p.waitForTimeout(300);
    ok('"Plus tard" passe l\'étape', await p.evaluate(() => !!S.faits['dem-locataires'] && !document.querySelector('.dem-e.cur') || /fiches/.test((document.querySelector('.dem-e.cur') || {}).innerText || 'fiches')));
    ok('aucune lecture IA consommée', appelsIA === 0);
    ok('pas de défilement horizontal', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  } finally { await p.evaluate(async () => { await SB.from('espaces').delete().eq('id', ESPACE); }); }
  ok('aucune erreur JavaScript', !errs.length); if (errs.length) console.log(errs);
  await b.close(); srv.close(); console.log(KO ? `\n${KO} échec(s)` : '\nTout est bon'); process.exit(KO ? 1 : 0);
})();

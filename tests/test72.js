// Chaque opération de la banque a sa place : compteur, entrées devinées (loyer, apport d'associé, prêt, Airbnb),
// classement par groupe ou tout d'un coup, règle apprise, tâche dans À faire, rien d'écrit ailleurs que dans l'appli.
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
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test classement'); await p.click('#esp_btn'); await p.waitForTimeout(2500);
  const ESP = await p.evaluate(() => ESPACE);
  await p.evaluate(async () => {
    S.sci.associes = [{ nom: 'Paul Martin', parts: 50 }, { nom: 'Léa Roux', parts: 50 }];
    S.biens.push({ id: 'b1', nom: 'T2', adresse: '1 rue', cp: '35000', ville: 'Rennes' });
    S.baux.push({ id: 'jean', bienId: 'b1', nom: 'Jean Dupontel', typeBail: 'vide', dateEntree: '2026-09-01', suiviDepuis: '2026-11', loyerHC: '500', charges: '0', jourPaiement: '5', revisions: [] });
    save(); await chargerMembres(); await new Promise(r => setTimeout(r, 3000));
    BANQUE = { etat: 'ok', lien: { source: 'enablebanking' }, comptes: [{ nom: 'Compte', solde: 1000 }], opsTous: [], comptesTous: [], ops: [
      { tx_id: 'e1', date: '2026-10-05', montant: 500, libelle: 'VIR INST M. JEAN DUPONTEL' },
      { tx_id: 'e2', date: '2026-10-11', montant: 10000, libelle: 'VIR DE M PAUL MARTIN' },
      { tx_id: 'e3', date: '2026-10-21', montant: 48000, libelle: 'DEBLOCAGE PRET 0470058853203' },
      { tx_id: 'e4', date: '2026-08-10', montant: 200, libelle: 'VIR AIRBNB PAYMENTS LUXEMBOU' },
      { tx_id: 'e5', date: '2026-09-09', montant: 300, libelle: 'VIR SOCIETE XYZ' },
      { tx_id: 's1', date: '2026-10-12', montant: -100, libelle: 'PRLV SEPA EDF CLIENTS' }] };
    view.comptaOnglet = 'comptable'; location.hash = 'compta'; render();
  });
  await p.waitForTimeout(800);
  const c0 = await p.evaluate(() => etatClassement(2026)); console.log(JSON.stringify(c0));
  t(c0.total === 6 && c0.reste === 6 && c0.e === 5 && c0.s === 1, 'compteur : 6 opérations, 6 à classer (5 entrées, 1 dépense)');
  let txt = await p.locator('.classement').innerText(); t(/Il reste 6 opérations à classer/.test(txt) && /0 %/.test(txt), 'carte : "Il reste 6 opérations à classer", 0 %');
  const devine = await p.evaluate(() => Object.fromEntries(BANQUE.ops.filter(o => o.montant > 0).map(o => [o.tx_id, classerEntree(o)])));
  t(devine.e1.cat === "Loyer d'un locataire" && devine.e2.cat === "Apport d'un associé" && devine.e2.qui === 'Paul Martin' && devine.e3.cat === 'Déblocage de prêt' && devine.e4.cat.startsWith('Location courte') && !devine.e5.cat, 'devinés : loyer, apport de Paul Martin, prêt, Airbnb ; le virement inconnu reste à choisir');
  const tache = await p.evaluate(() => taches().find(x => /opérations? de la banque à classer/.test(x.t))); t(!tache, 'À faire reste léger : pas de tâche "opérations à classer" (la compta n\'est pas la priorité)');
  await p.locator('#entrees').scrollIntoViewIfNeeded(); await p.screenshot({ path: __dirname + '/shots72/test-entrees.png' });
  // classer un seul groupe
  const g = p.locator('#entrees details.sortie-g').filter({ has: p.locator('summary', { hasText: 'Déblocage de prêt' }) });
  await g.locator('summary').click(); await p.waitForTimeout(200);
  await g.locator('button', { hasText: 'Classer' }).click(); await p.waitForTimeout(800);
  t((await p.evaluate(() => etatClassement(2026).reste)) === 5, 'groupe "Déblocage de prêt" classé : il en reste 5');
  // le virement inconnu : on choisit "Autre recette" (la case se coche toute seule) puis "Tout classer"
  await p.selectOption('select[name="cat_e5"]', 'Autre recette'); t(await p.isChecked('input[name="ok_e5"]'), 'choisir une catégorie coche la ligne');
  await p.locator('#entrees button', { hasText: 'Tout classer' }).click(); await p.waitForTimeout(2500);
  const c1 = await p.evaluate(() => etatClassement(2026)); t(c1.e === 0 && c1.reste === 1, 'toutes les entrées classées, il reste la dépense (' + JSON.stringify(c1) + ')');
  t(!(await p.locator('#entrees').count()), 'la carte des entrées disparaît quand tout est classé');
  const meta = await p.evaluate(async () => (await SB.from('docs').select('data').eq('espace_id', ESPACE).eq('coll', 'meta').eq('doc_id', 'main').single()).data.data);
  const v = meta.banqueVus || {};
  t(v.e2 && v.e2.e === "Apport d'un associé" && v.e2.qui === 'Paul Martin' && v.e3.e === 'Déblocage de prêt' && v.e5.e === 'Autre recette', 'enregistré en ligne : ' + JSON.stringify(v));
  t(meta.sci.reglesEntrees && Object.values(meta.sci.reglesEntrees).some(r => r.cat === 'Autre recette'), 'choix corrigé retenu pour la prochaine fois');
  t((await p.evaluate(() => S.paiements.length)) === 0 && (await p.evaluate(() => S.depenses.length)) === 0, 'classer une entrée ne crée ni loyer ni dépense en double');
  // la dépense : "Pas une dépense" → tout est classé
  await p.evaluate(() => { ignorerSortie('s1'); }); await p.waitForTimeout(800);
  txt = await p.locator('.classement').innerText(); t(/Toute la banque de 2026 est classée/.test(txt) && /100 %/.test(txt), 'carte : "Toute la banque de 2026 est classée", 100 %');
  t(!(await p.evaluate(() => taches().some(x => /de la banque à classer/.test(x.t)))), 'la tâche disparaît de À faire');
  await p.locator('.classement').screenshot({ path: __dirname + '/shots72/test-fini.png' });
  t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  await p.evaluate(async esp => { await SB.from('espaces').delete().eq('id', esp); }, ESP);
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

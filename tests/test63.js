// Importer depuis un tableur (vraie IA, vraie base) : un vrai fichier Excel "fait main" (2 feuilles, totaux, ancien locataire)
// → logements et locataires actuels proposés, modifiables ; création ; suivi des loyers à partir de ce mois (pas d'impayé inventé).
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const XLSX = require('./vendor/xlsxpkg/package/xlsx.js');
const DIST = path.join(__dirname, '..', 'dist');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); }).listen(8099);
let ok = 0, ko = 0; const t = (c, m) => { c ? ok++ : ko++; console.log((c ? 'OK ' : 'KO ') + m); };
// le fichier Excel
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
  ['MES LOCATIONS 2026'], [],
  ['Appart', 'Adresse', 'Locataire', 'Mail', 'Tél', 'Loyer', 'Charges', 'Entrée', 'Statut'],
  ['T2 Lilas', '12 rue des Lilas 35000 Rennes', 'Paul MARTIN', 'paul.martin@exemple.fr', '06 11 22 33 44', 620, 40, '01/09/2024', 'en place'],
  ['Studio Gare', '3 place de la Gare 35000 Rennes', 'Léa Durand', 'lea.d@exemple.fr', '', 450, 30, '15/02/2025', 'en place'],
  ['Studio Gare', '3 place de la Gare 35000 Rennes', 'Ancien : Marc Petit', '', '', 430, 30, '01/01/2022', 'parti en 2024'],
  ['Maison Vern', '8 chemin du Bois 35770 Vern-sur-Seiche', '', '', '', 0, 0, '', 'vide, à louer'],
  ['TOTAL', '', '', '', '', 1070, 70, '', ''],
]), 'Logements');
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Mois', 'Paul', 'Léa'], ['janv.', 660, 480], ['févr.', 660, 480]]), 'Encaissements');
const FICHIER = path.join(__dirname, 'locations-test.xlsx'); XLSX.writeFile(wb, FICHIER);
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true, serviceWorkers: 'block' })).newPage();
  p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
  await p.route('**/xlsx/0.18.5/xlsx.full.min.js', r => r.fulfill({ path: __dirname + '/vendor/xlsxpkg/package/dist/xlsx.full.min.js', contentType: 'application/javascript' }));
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test import tableur'); await p.click('#esp_btn'); await p.waitForTimeout(2000);
  await p.evaluate(() => { S.biens.push({ id: 'bx', nom: 'Maison Vern', adresse: '8 chemin du Bois', cp: '35770', ville: 'Vern-sur-Seiche', type: 'Maison' }); save(); location.hash = 'biens'; render(); }); await p.waitForTimeout(400);
  t(await p.isVisible('button:has-text("Depuis un tableur")'), 'Biens : bouton "📊 Depuis un tableur"');
  await p.click('button:has-text("Depuis un tableur")'); await p.setInputFiles('#tab_f', FICHIER); const t0 = Date.now(); await p.click('#overlay button.primary');
  await p.waitForSelector('#overlay h2:has-text("Ce que l\'IA a trouvé")', { timeout: 120000 }); console.log('durée', Math.round((Date.now() - t0) / 1000), 's');
  await p.waitForTimeout(300); await p.screenshot({ path: __dirname + '/shots58/tableur.png', fullPage: true });
  const T = await p.evaluate(() => TAB); console.log(JSON.stringify({ biens: T.biens.map(x => x.nom), loc: T.locataires.map(x => [x.nom, x.bien, x.loyer_hc, x.charges, x.date_entree]), rem: T.remarques }));
  const noms = T.locataires.map(x => x.nom.toLowerCase());
  t(noms.length === 2 && noms.some(n => /paul/.test(n)) && noms.some(n => /léa|lea/.test(n)), '2 locataires actuels (l\'ancien est écarté)');
  t(!T.biens.some(x => /vern/i.test(x.nom)) || await p.evaluate(() => !document.querySelector('#overlay input[value="Maison Vern"]')), 'la maison déjà dans l\'appli n\'est pas recréée');
  const paul = T.locataires.find(x => /paul/i.test(x.nom));
  t(paul.loyer_hc === 620 && paul.charges === 40 && paul.date_entree === '2024-09-01' && /paul\.martin/.test(paul.email), 'Paul : loyer, charges, date d\'entrée (JJ/MM/AAAA lue), e-mail');
  // correction avant de créer : loyer de Léa
  const iLea = T.locataires.findIndex(x => /léa|lea/i.test(x.nom));
  await p.fill(`#overlay input[name=ll${iLea}]`, '455');
  await p.click('#overlay button.primary'); await p.waitForTimeout(2500);
  const R = await p.evaluate(() => ({ biens: S.biens.map(b => b.nom + '|' + b.cp + '|' + b.ville), baux: S.baux.map(b => ({ nom: b.nom, bien: (bien(b.bienId) || {}).nom, hc: b.loyerHC, suivi: b.suiviDepuis, retard: detteBail(b) })) }));
  console.log(JSON.stringify(R));
  t(R.biens.length === 3 && R.biens.some(x => /Lilas\|35000\|Rennes/.test(x)), 'logements créés, adresse découpée (rue, code postal, ville)');
  t(R.baux.length === 2 && R.baux.some(x => /Lilas/.test(x.bien) && /Paul/i.test(x.nom)), 'Paul rattaché au T2 Lilas');
  t(R.baux.some(x => /léa|lea/i.test(x.nom) && x.hc === '455'), 'correction faite avant création (loyer de Léa 455 €)');
  t(R.baux.every(x => x.retard === 0), 'aucun impayé inventé (suivi à partir du prochain loyer à payer)');
  t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  await p.evaluate(async () => { await SB.from('espaces').delete().eq('id', ESPACE); });
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

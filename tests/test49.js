// IA : lire un vrai bail PDF et remplir la fiche du locataire (bouton du formulaire, et depuis la carte de l'IA / Drive partagé)
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); }).listen(8099);
let ok = 0, ko = 0; const t = (c, m) => { c ? ok++ : ko++; console.log((c ? 'OK ' : 'KO ') + m); };
const BAIL = `<html><body style="font-family:serif;font-size:12pt;line-height:1.5">
<h1 style="text-align:center">CONTRAT DE LOCATION</h1><p style="text-align:center">Locaux vides à usage d'habitation – Loi n° 89-462 du 6 juillet 1989</p>
<h2>I. Désignation des parties</h2><p>Le présent contrat est conclu entre : la SCI GTP INVEST, société civile immobilière au capital de 1 000 €, dont le siège est 12 rue de la Mer, 50230 Agon-Coutainville, représentée par son gérant, ci-après « le bailleur » ;</p>
<p>Et : Monsieur Steve LEMAIRE, né le 3 mars 1994 à Rennes, demeurant actuellement 8 rue des Lilas, 35000 Rennes, téléphone 06 72 18 44 90, courriel steve.lemaire@exemple.fr, ci-après « le locataire ».</p>
<h2>II. Objet du contrat</h2><p>Le bailleur loue au locataire un appartement de type T2 de 41 m², situé au 2e étage du 43 rue de Beauchamps, 35000 Rennes, comprenant une entrée, un séjour, une chambre, une cuisine et une salle d'eau.</p>
<h2>III. Date de prise d'effet et durée</h2><p>Le contrat prend effet le 1er septembre 2025 pour une durée de trois ans, renouvelable tacitement.</p>
<h2>IV. Conditions financières</h2><p>Le loyer mensuel est fixé à six cent quarante euros (640,00 €) hors charges. Le locataire verse en outre une provision mensuelle sur charges de 35,00 €, qui fera l'objet d'une régularisation annuelle. Le loyer et les charges sont payables d'avance, le 5 de chaque mois, par virement.</p>
<p>Révision du loyer : le loyer sera révisé chaque année à la date anniversaire du contrat, selon la variation de l'indice de référence des loyers publié par l'INSEE. Indice de référence : IRL du 2e trimestre 2025, valeur 146,68.</p>
<h2 style="page-break-before:always">V. Garanties</h2><p>Dépôt de garantie : le locataire verse à la signature la somme de 640,00 € (un mois de loyer hors charges).</p>
<p>Caution solidaire : Madame Claire LEMAIRE, demeurant 2 allée des Chênes, 22000 Saint-Brieuc, téléphone 06 11 22 33 44, se porte caution solidaire du locataire pour la durée du bail.</p>
<h2>VI. Clauses particulières</h2><p>L'entretien annuel de la chaudière est à la charge du locataire, qui en fournira l'attestation chaque année. Les animaux de compagnie sont autorisés.</p>
<p>Fait à Agon-Coutainville, le 25 août 2025, en deux exemplaires.</p><p>Le bailleur &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Le locataire</p></body></html>`;
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const gen = await b.newPage(); await gen.setContent(BAIL); const pdfPath = path.join(__dirname, 'bail-test.pdf'); await gen.pdf({ path: pdfPath, format: 'A4' }); await gen.close();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true, serviceWorkers: 'block' })).newPage();
  p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
  await p.route('**/jspdf/2.5.1/**', r => r.abort());
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test bail IA'); await p.click('#esp_btn'); await p.waitForTimeout(2000);
  await p.evaluate(() => { S.biens.push({ id: 'b41', nom: '41 Beauchamps', adresse: '41 rue de Beauchamps', cp: '35000', ville: 'Rennes', meuble: 'vide' }, { id: 'b43', nom: '43 Beauchamps', adresse: '43 rue de Beauchamps', cp: '35000', ville: 'Rennes', meuble: 'vide' }); save(); go('locataires'); render(); });
  // 1. Bouton du formulaire
  await p.evaluate(() => editBail(null)); await p.waitForTimeout(300);
  t(await p.isVisible('#overlay button:has-text("Remplir depuis le bail")'), 'formulaire : bouton « 🤖 Remplir depuis le bail »');
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('#overlay button:has-text("Remplir depuis le bail")')]);
  await fc.setFiles(pdfPath); const t0 = Date.now();
  await p.waitForSelector('#bailLu .gros-msg', { timeout: 120000 }); const duree = Math.round((Date.now() - t0) / 1000);
  await p.screenshot({ path: __dirname + '/b49-form.png' });
  const v = await p.evaluate(() => { const f = document.getElementById('mform'); const g = k => f.elements[k] && f.elements[k].value; return { nom: g('nom'), email: g('email'), tel: g('tel'), adr: g('adressePrec'), bien: g('bienId'), type: g('typeBail'), date: g('dateEntree'), loyer: g('loyerHC'), ch: g('charges'), mode: g('chargesMode'), jour: g('jourPaiement'), depot: g('depot'), irl: g('irlTrimestre'), garant: g('garantNom'), gc: g('garantContact'), clauses: g('clauses'), rev: f.elements.revisable.checked, msg: document.getElementById('bailLu').innerText }; });
  console.log('durée', duree, 's', JSON.stringify(v, null, 1));
  t(/Steve/i.test(v.nom) && /Lemaire/i.test(v.nom), 'nom du locataire');
  t(v.email === 'steve.lemaire@exemple.fr' && /06 ?72/.test(v.tel), 'e-mail et téléphone');
  t(/Lilas/.test(v.adr), 'adresse avant l’entrée (pas celle du logement)');
  t(v.bien === 'b43', 'logement reconnu par son adresse : 43 Beauchamps');
  t(v.type === 'vide' && v.date === '2025-09-01', 'bail vide, entrée le 1er septembre 2025');
  t(+v.loyer === 640 && +v.ch === 35 && v.mode === 'provision', 'loyer 640 € HC, 35 € de provisions');
  t(+v.jour === 5 && +v.depot === 640, 'payé le 5, dépôt 640 €');
  t(v.irl === 'T2 2025' && v.rev, 'IRL T2 2025, révision annuelle');
  t(/Claire/.test(v.garant) && /06 ?11/.test(v.gc), 'garant et son contact');
  t(/chaudi/i.test(v.clauses), 'clause particulière reprise');
  t(/L'IA a rempli/.test(v.msg) && /vérifie/i.test(v.msg), 'message en grand : vérifie les cases');
  await p.evaluate(() => closeOverlay());
  // 2. Depuis la carte de l'IA (bail dans un dossier partagé)
  const pdfB = fs.readFileSync(pdfPath);
  await p.route('**/functions/v1/partage', async r => { const c = JSON.parse(r.request().postData() || '{}');
    if (c.action === 'fichier') return r.fulfill({ status: 200, contentType: 'application/pdf', body: pdfB });
    if (c.action === 'config') return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ pret: true, adresse: 'x@y' }) });
    return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ racines: [{ id: 'B43', nom: '43 rue de Beauchamps', dossier: true }], dossiers: { B43: { titre: '43 rue de Beauchamps', chemin: ['43 rue de Beauchamps'], ancetres: [] } }, fichiers: [{ id: 'fb', titre: 'Bail Steve Lemaire 2025.pdf', type: 'application/pdf', lien: 'x', chemin: ['43 rue de Beauchamps'], ancetres: ['B43'], racine: 'B43', partage: true }] }) }); });
  await p.evaluate(() => { DRIVEG = { etat: 'non' }; S.sci.ia = { date: new Date().toISOString(), res: { liens: [], biens_a_creer: [], anciens_locataires: [], biens_sans_dossier: [], resume: '', locataires_actuels: [{ nom: 'Steve Lemaire', bien_id: '', bien_a_creer: '43 Beauchamps', raison: 'Bail trouvé.' }] } }; save(); DOCS = { etat: 'vide', fichiers: [], dossiers: {} }; go('docs'); render(); });
  await p.waitForTimeout(2500); await p.evaluate(() => render()); await p.waitForTimeout(300);
  t(await p.isVisible('button:has-text("Créer depuis son bail")'), 'carte IA : « 🤖 Créer depuis son bail » (logement créé entre-temps)');
  await p.click('button:has-text("Créer depuis son bail")');
  await p.waitForSelector('#bailLu .gros-msg', { timeout: 120000 });
  const w = await p.evaluate(() => { const f = document.getElementById('mform'); return { nom: f.elements.nom.value, bien: f.elements.bienId.value, loyer: f.elements.loyerHC.value }; });
  console.log(JSON.stringify(w));
  t(/Lemaire/i.test(w.nom) && w.bien === 'b43' && +w.loyer === 640, 'depuis le Drive : fiche remplie, bon logement');
  await p.click('#overlay button.primary >> nth=-1'); await p.waitForTimeout(800);
  t(await p.evaluate(() => S.baux.some(x => /Lemaire/i.test(x.nom) && +x.loyerHC === 640 && x.bienId === 'b43')), 'locataire enregistré');
  t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  await p.evaluate(async () => { await SB.from('espaces').delete().eq('id', ESPACE); });
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

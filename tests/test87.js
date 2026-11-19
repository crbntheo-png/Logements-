// Compléter les fiches avec les papiers déjà rangés (vraie base, compte de test, espace temporaire supprimé à la fin).
// DPE, bail et attestation en PDF avec texte : lus par l'appli seule (aucun crédit IA). Taxe foncière : lue par la vraie IA (1 crédit).
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist'), OUT = __dirname + '/shots87'; fs.mkdirSync(OUT, { recursive: true });
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'application/javascript' : 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(8096);
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
const st = 'font:14px Arial;padding:30px';
const DOCS = {
  dpe: `<html><body style="${st}"><h1>DIAGNOSTIC DE PERFORMANCE ÉNERGÉTIQUE (logement)</h1><p>N° ADEME : 2635E1234567X</p><p>Établi le : 12/03/2025 – Valable jusqu'au : 11/03/2035</p><p>Adresse : 41 rue de Beauchamps, 35000 Rennes – Appartement T2</p><p>Surface habitable : 38,5 m²</p><p>Consommation 268 kWh/m²/an – Classe énergie : E</p><p>Émissions 8 kg CO2/m²/an – Classe climat (GES) : B</p>${'<p>Le présent diagnostic est établi conformément à la réglementation en vigueur relative au diagnostic de performance énergétique des logements.</p>'.repeat(4)}</body></html>`,
  bail: `<html><body style="${st}"><h1>CONTRAT DE LOCATION – LOGEMENT VIDE</h1><p>Entre la SCI Test, bailleur, et Monsieur Jean DUPONTEL, locataire, né le 01/02/1990.</p><p>Courriel : jean.dupontel@example.com – Téléphone : 06 12 34 56 78</p><p>Désignation : appartement de 2 pièces, surface habitable 38,5 m², 41 rue de Beauchamps 35000 Rennes.</p><p>Date de prise d'effet : 01/01/2026. Loyer mensuel hors charges : 500,00 €. Provision sur charges : 30,00 €.</p><p>Dépôt de garantie : 500,00 € (cinq cents euros).</p>${'<p>Les parties conviennent des clauses et conditions ci-après, conformément à la loi du 6 juillet 1989.</p>'.repeat(4)}</body></html>`,
  assur: `<html><body style="${st}"><h1>ATTESTATION D'ASSURANCE HABITATION</h1><p>MACIF certifie que Monsieur Jean DUPONTEL est titulaire d'un contrat Habitation garantissant les risques locatifs pour le logement situé 41 rue de Beauchamps, 35000 Rennes.</p><p>Période de validité : du 01/09/2026 au 31/08/2027.</p>${'<p>La présente attestation est délivrée pour servir et valoir ce que de droit, sous réserve du paiement des cotisations.</p>'.repeat(4)}</body></html>`,
  taxe: `<html><body style="${st}"><h1>AVIS D'IMPÔT 2026 – TAXES FONCIÈRES</h1><p>Propriétaire : SCI Test. Adresse du bien : 41 rue de Beauchamps, 35000 Rennes.</p><p>Taxe foncière sur les propriétés bâties – commune : 612 € ; intercommunalité : 98 €</p><p>Taxe d'enlèvement des ordures ménagères (TEOM) : 121 €</p><p>Frais de gestion : 41 €</p><p><b>Montant de votre impôt : 872 €</b></p></body></html>`,
};
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const gen = await b.newPage(); const pdfs = {};
  for (const [k, h] of Object.entries(DOCS)) { await gen.setContent(h); pdfs[k] = (await gen.pdf({ format: 'A4' })).toString('base64'); } await gen.close();
  const p = await (await b.newContext({ ...devices['iPhone 13'], ignoreHTTPSErrors: true, serviceWorkers: 'block' })).newPage();
  p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
  await p.route('**/pdf.js/3.11.174/pdf.min.js', r => r.fulfill({ path: __dirname + '/vendor/pdfjs/pdf.min.js', contentType: 'application/javascript' }));
  await p.route('**/pdf.js/3.11.174/pdf.worker.min.js', r => r.fulfill({ path: __dirname + '/vendor/pdfjs/pdf.worker.min.js', contentType: 'application/javascript' }));
  const appelsIA = []; p.on('request', r => { if (/functions\/v1\/ia/.test(r.url()) && r.method() === 'POST') { try { appelsIA.push(JSON.parse(r.postData() || '{}').action); } catch (e) {} } });
  await p.goto('http://localhost:8096/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test Papiers'); await p.click('#esp_btn'); await p.waitForTimeout(3000);
  await p.evaluate(async P => {
    S.biens.push({ id: 'b41', nom: '41 Beauchamps', type: 'Appartement', adresse: '41 rue de Beauchamps', cp: '35000', ville: 'Rennes', meuble: 'vide' });
    S.baux.push({ id: 'l1', bienId: 'b41', nom: 'Jean Dupontel', typeBail: 'vide', dateEntree: '2026-01-01', loyerHC: '500', charges: '30', jourPaiement: '5', revisions: [] });
    const cats = { dpe: ['Diagnostics (DPE…)', 'DPE 2025'], bail: ['Bail', 'Bail Dupontel signé'], assur: ['Locataire (pièces, garant…)', 'Attestation assurance Dupontel'], taxe: ['Taxe foncière', 'Taxe foncière 2026'] };
    for (const [k, b64] of Object.entries(P)) { const bl = new Blob([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], { type: 'application/pdf' }), ch = `${ESPACE}/b41/${uid()}.pdf`;
      await SB.storage.from('documents').upload(ch, bl, { contentType: 'application/pdf' });
      S.fichiers.push({ id: 'f-' + k, bienId: 'b41', bailId: k === 'assur' || k === 'bail' ? 'l1' : '', cat: cats[k][0], nom: cats[k][1], chemin: ch, type: 'application/pdf', taille: bl.size, date: iso(TODAY) }); }
    save(); location.hash = 'bien-b41'; render();
  }, pdfs);
  await p.waitForTimeout(1500);
  ok('fiche : "Remplis tout seul avec tes papiers" (4 documents)', await p.evaluate(() => /Remplis tout seul avec tes papiers/.test(document.body.innerText) && /4 documents déjà rangés/.test(document.body.innerText)));
  ok('fiche : e-mail et assurance du locataire dans ce qui manque', await p.evaluate(() => /L'e-mail de Jean/.test(document.querySelector('.a-completer').textContent) && /assurance habitation de Jean/.test(document.querySelector('.a-completer').textContent)));
  await p.screenshot({ path: OUT + '/1-fiche.png' });
  await p.evaluate(() => { location.hash = 'biens'; }); await p.waitForTimeout(500);
  ok('Biens : bandeau "1 fiche peut se remplir avec tes papiers"', await p.evaluate(() => /1 fiche peut se remplir avec tes papiers/.test(document.body.innerText)));
  await p.evaluate(() => { location.hash = 'afaire'; }); await p.waitForTimeout(500);
  ok('À faire : "1 fiche de logement à compléter"', await p.evaluate(() => /1 fiche de logement à compléter/.test(document.body.innerText)));
  await p.evaluate(() => { location.hash = 'bien-b41'; }); await p.waitForTimeout(500);
  await p.evaluate(() => completerAvecPapiers('b41'));
  await p.waitForFunction(() => /Trouvé dans tes papiers|Rien de sûr/.test((document.querySelector('#overlay h2') || {}).textContent || ''), null, { timeout: 180000 });
  await p.screenshot({ path: OUT + '/2-propositions.png' });
  const txt = await p.evaluate(() => document.getElementById('overlay').innerText); console.log(txt);
  ok('surface 38,5 m² (lue dans le DPE)', /Surface : 38,5 m²/.test(txt));
  ok('DPE E, valable jusqu\'au 11/03/2035', /Classe DPE : E · valable jusqu'au 11\/03\/2035/.test(txt));
  ok('e-mail, téléphone, dépôt du locataire (lus dans le bail)', /E-mail de Jean : jean\.dupontel@example\.com/.test(txt) && /Téléphone de Jean : 06 12 34 56 78/.test(txt) && /Dépôt de garantie : 500,00/.test(txt));
  ok('assurance jusqu\'au 31/08/2027', /Assurance de Jean jusqu'au : 31\/08\/2027/.test(txt));
  ok('taxe foncière 2026 : 872 € dont 121 € (vraie IA)', /Taxe foncière 2026 : 872,00\s€ dont 121,00\s€/.test(txt));
  ok('l\'IA n\'a servi qu\'à la taxe (1 lecture, les PDF texte sont lus par l\'appli)', appelsIA.filter(a => a === 'doc' || a === 'bail').length === 1);
  ok('rien enregistré avant validation', await p.evaluate(() => !bien('b41').surface && !bail('l1').email));
  // décocher le téléphone, enregistrer
  await p.evaluate(() => { const li = [...document.querySelectorAll('#overlay ul.compl li')].find(l => /Téléphone/.test(l.innerText)); li.querySelector('input').checked = false; });
  await p.click('#mform button.primary'); await p.waitForTimeout(800);
  const r = await p.evaluate(() => ({ bi: bien('b41'), b: bail('l1'), t: taxeDe('b41', 2026) }));
  ok('enregistré : surface, DPE (+ classe climat, numéro, dates)', +r.bi.surface === 38.5 && r.bi.dpe === 'E' && r.bi.dpeGes === 'B' && r.bi.dpeNumero === '2635E1234567X' && r.bi.dpeValidite === '2035-03-11' && r.bi.dpeDate === '2025-03-12');
  ok('enregistré : e-mail, dépôt, assurance ; téléphone décoché = pas enregistré', r.b.email === 'jean.dupontel@example.com' && +r.b.depot === 500 && r.b.assuranceFin === '2027-08-31' && !r.b.tel);
  ok('enregistré : taxe foncière 2026 avec ses parts', r.t && r.t.total === 872 && r.t.teom === 121 && Array.isArray(r.t.parts));
  await p.waitForTimeout(500);
  ok('papiers lus une fois : plus reproposés, bandeau parti', await p.evaluate(() => { location.hash = 'biens'; render(); return !/peut se remplir avec tes papiers/.test(document.body.innerText); }));
  ok('adresse Drive reconnue', await p.evaluate(() => idDriveFichier({ url: 'https://drive.google.com/file/d/1GGkfq3y9unCdH8XXgoH122MLtJJw5r7E/view' }) === '1GGkfq3y9unCdH8XXgoH122MLtJJw5r7E'));
  await p.evaluate(async () => { await SB.from('espaces').delete().eq('id', ESPACE); });
  ok('aucune erreur JavaScript', !errs.length); if (errs.length) console.log(errs);
  await b.close(); srv.close(); console.log(KO ? `\n${KO} échec(s)` : '\nTout est bon'); process.exit(KO ? 1 : 0);
})();

// IA : lire n'importe quel papier et le ranger au bon endroit (vraie IA, vraie base, compte de test).
// Taxe foncière → fiche taxe foncière remplie ; facture → dépense préremplie ; DPE → classes du logement ; attestation → fin d'assurance du locataire.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); }).listen(8099);
let ok = 0, ko = 0; const t = (c, m) => { c ? ok++ : ko++; console.log((c ? 'OK ' : 'KO ') + m); };
const OUT = __dirname + '/shots57'; fs.mkdirSync(OUT, { recursive: true });
const st = 'font-family:sans-serif;font-size:11pt;line-height:1.5';
const DOCS = {
  taxe: `<html><body style="${st}"><h2>DIRECTION GÉNÉRALE DES FINANCES PUBLIQUES</h2><h1>AVIS D'IMPÔT 2026 – TAXES FONCIÈRES</h1><p>Propriétaire : SCI TEST PORTAIL, 12 rue de la Mer, 50230 Agon-Coutainville</p><p>Numéro de l'avis : 26 50 4002374 12</p>
    <p>Adresse du bien imposé : 41 RUE DE BEAUCHAMPS 35000 RENNES</p><table border="1" cellpadding="4"><tr><th></th><th>Commune</th><th>Intercommunalité</th><th>TSE</th><th>Taxe ordures ménagères</th></tr><tr><td>Cotisations</td><td>612</td><td>38</td><td>7</td><td>133</td></tr></table>
    <p>Frais de gestion de la fiscalité directe locale : 41 €</p><p><b>Montant de votre impôt : 831 €</b></p><p>Date limite de paiement : 15/10/2026</p></body></html>`,
  facture: `<html><body style="${st}"><h1>FACTURE N° 2026-118</h1><p>PLOMBERIE DUVAL SARL – 4 rue du Port, 35000 Rennes – SIRET 812 345 678 00019</p><p>Client : SCI Test Portail – Chantier : 43 rue de Beauchamps, 35000 Rennes</p><p>Date : 14/10/2026</p>
    <table border="1" cellpadding="4"><tr><th>Désignation</th><th>Qté</th><th>PU HT</th><th>Total HT</th></tr><tr><td>Remplacement du chauffe-eau électrique 200 L</td><td>1</td><td>780,00</td><td>780,00</td></tr><tr><td>Main d'œuvre</td><td>3 h</td><td>55,00</td><td>165,00</td></tr></table>
    <p>Total HT : 945,00 € – TVA 10 % : 94,50 € – <b>Total TTC : 1 039,50 €</b></p></body></html>`,
  dpe: `<html><body style="${st}"><h1>DIAGNOSTIC DE PERFORMANCE ÉNERGÉTIQUE (logement)</h1><p>N° ADEME : 2635E1234567X</p><p>Établi le : 12/03/2025 – Valable jusqu'au : 11/03/2035</p><p>Adresse : 41 rue de Beauchamps, 35000 Rennes – Appartement T2, 38 m²</p>
    <p>Performance énergétique : consommation 268 kWh/m²/an – <b>Classe énergie : E</b></p><p>Émissions de gaz à effet de serre : 8 kg CO2/m²/an – <b>Classe climat (GES) : B</b></p><p>Chauffage : électrique (convecteurs). Eau chaude : ballon électrique.</p></body></html>`,
  attestation: `<html><body style="${st}"><h1>ATTESTATION D'ASSURANCE HABITATION</h1><p>MACIF certifie que Monsieur Jean DUPONTEL est titulaire d'un contrat Habitation n° 45 778 901 garantissant les risques locatifs (incendie, explosion, dégât des eaux) pour le logement situé 41 rue de Beauchamps, 35000 Rennes.</p>
    <p>Période de validité : du 01/09/2026 au 31/08/2027.</p><p>Fait à Niort, le 2 septembre 2026.</p></body></html>`,
};
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const gen = await b.newPage(); const pdfs = {};
  for (const [k, h] of Object.entries(DOCS)) { await gen.setContent(h); pdfs[k] = (await gen.pdf({ format: 'A4' })).toString('base64'); } await gen.close();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true, serviceWorkers: 'block' })).newPage();
  p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
  await p.route('**/jspdf.umd.min.js', r => r.fulfill({ path: __dirname + '/vendor/jspdfpkg/package/dist/jspdf.umd.min.js', contentType: 'application/javascript' }));
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test IA papiers'); await p.click('#esp_btn'); await p.waitForTimeout(2000);
  await p.evaluate(async P => {
    S.biens.push({ id: 'b41', nom: '41 Beauchamps', type: 'T2', adresse: '41 rue de Beauchamps', cp: '35000', ville: 'Rennes', meuble: 'vide' }, { id: 'b43', nom: '43 Beauchamps', type: 'T2', adresse: '43 rue de Beauchamps', cp: '35000', ville: 'Rennes', meuble: 'vide' });
    S.baux.push({ id: 'l1', bienId: 'b41', nom: 'Jean Dupontel', typeBail: 'vide', dateEntree: '2026-01-01', loyerHC: '500', charges: '0', jourPaiement: '5', revisions: [] });
    for (const [k, b64] of Object.entries(P)) { const bl = new Blob([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], { type: 'application/pdf' }), ch = `${ESPACE}/docs/${uid()}.pdf`;
      await SB.storage.from('documents').upload(ch, bl, { contentType: 'application/pdf' });
      S.fichiers.push({ id: 'f-' + k, bienId: k === 'facture' ? '' : (k === 'taxe' ? '' : 'b41'), cat: 'Autre', nom: k, chemin: ch, type: 'application/pdf', taille: bl.size, date: iso(TODAY) }); }
    save(); location.hash = lienDocs('b41', -1, ''); render();
  }, pdfs);
  await p.waitForTimeout(500);
  t(await p.locator('button[aria-label="Lire avec l\'IA"]').count() >= 1, 'bouton 🤖 "Lire avec l\'IA" sur les documents du logement'); await p.screenshot({ path: OUT + '/docs.png' });
  const lire = async k => { const t0 = Date.now(); await p.evaluate(k => { closeOverlay(); lireDocIA({ fichier: 'f-' + k }); }, k); await p.waitForSelector('#overlay:not([hidden]) .gros-msg', { timeout: 120000 }); return Math.round((Date.now() - t0) / 1000); };
  // 1. taxe foncière (pas de logement : l'IA le retrouve par l'adresse)
  let s1 = await lire('taxe'); await p.waitForTimeout(400); await p.screenshot({ path: OUT + '/taxe.png' });
  const tx = await p.evaluate(() => { const f = document.getElementById('mform'); return { titre: document.querySelector('#overlay h2').textContent, total: f.elements.total && f.elements.total.value, teom: f.elements.teom && f.elements.teom.value, auto: !!f.querySelector('.auto') }; });
  console.log('taxe', s1, 's', JSON.stringify(tx));
  t(/Taxe foncière 2026 — 41 Beauchamps/.test(tx.titre), 'taxe foncière : bon logement retrouvé par l\'adresse, bonne année');
  t(+tx.total === 831 && +tx.teom === 133 && tx.auto, 'taxe foncière : total 831 € et ordures ménagères 133 € remplis et surlignés');
  await p.click('#overlay button.primary'); await p.waitForTimeout(300);
  t(await p.evaluate(() => (S.taxes || []).some(x => x.bienId === 'b41' && x.annee === 2026 && x.total === 831 && x.teom === 133)), 'taxe foncière enregistrée après validation');
  // 2. facture
  let s2 = await lire('facture'); await p.waitForTimeout(300); await p.screenshot({ path: OUT + '/facture.png' });
  const fa = await p.evaluate(() => { const f = document.getElementById('mform'); const g = k => f.elements[k] && f.elements[k].value; return { date: g('date'), montant: g('montant'), cat: g('categorie'), bien: g('bienId'), lib: g('libelle') }; });
  console.log('facture', s2, 's', JSON.stringify(fa));
  t(fa.date === '2026-10-14' && Math.abs(+fa.montant - 1039.5) < 0.01, 'facture : date et total TTC');
  t(/Travaux/.test(fa.cat) && fa.bien === 'b43' && /Duval/i.test(fa.lib || ''), 'facture : catégorie travaux, logement 43 par l\'adresse du chantier, fournisseur');
  // 3. DPE
  let s3 = await lire('dpe'); await p.waitForTimeout(300); await p.screenshot({ path: OUT + '/dpe.png' });
  const dp = await p.evaluate(() => { const f = document.getElementById('mform'); const g = k => f.elements[k] && f.elements[k].value; return { dpe: g('dpe'), ges: g('dpeGes'), num: g('dpeNumero'), date: g('dpeDate'), val: g('dpeValidite') }; });
  console.log('dpe', s3, 's', JSON.stringify(dp));
  t(dp.dpe === 'E' && dp.ges === 'B' && dp.num === '2635E1234567X' && dp.date === '2025-03-12' && dp.val === '2035-03-11', 'DPE : classes, numéro et dates');
  await p.click('#overlay button.primary'); await p.waitForTimeout(300);
  t(await p.evaluate(() => { const b = bien('b41'); return b.dpe === 'E' && b.dpeGes === 'B' && b.dpeNumero === '2635E1234567X'; }), 'DPE enregistré sur le logement');
  // 4. attestation d'assurance du locataire
  let s4 = await lire('attestation'); await p.waitForTimeout(300); await p.screenshot({ path: OUT + '/attestation.png' });
  const at = await p.evaluate(() => { const f = document.getElementById('mform'); return { bail: f.elements.bailId.value, fin: f.elements.fin.value }; });
  console.log('attestation', s4, 's', JSON.stringify(at));
  t(at.bail === 'l1' && at.fin === '2027-08-31', 'attestation : bon locataire, assuré jusqu\'au 31/08/2027');
  await p.click('#overlay button.primary'); await p.waitForTimeout(300);
  t(await p.evaluate(() => bail('l1').assuranceFin === '2027-08-31'), 'fin d\'assurance enregistrée sur le locataire');
  const cr = await p.evaluate(() => IA.credits);
  t(cr && cr.docs_restants !== undefined, 'crédits mis à jour (reste ' + (cr && cr.docs_restants) + ')');
  t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  await p.evaluate(async () => { closeOverlay(); await SB.storage.from('documents').remove(S.fichiers.map(f => f.chemin).filter(Boolean)); await SB.from('espaces').delete().eq('id', ESPACE); });
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

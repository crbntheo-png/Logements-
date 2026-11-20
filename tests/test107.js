// Données publiques gratuites sur la commune (zone tendue officielle, carte des loyers 2025) — mode local, iPhone 13.
// Rennes (zone tendue), Agon-Coutainville (non), Lyon 3e (arrondissement → Lyon) ; préavis exact au départ ; loyer encadré à la relocation.
const { chromium, devices } = require('playwright'); const fs = require('fs'), path = require('path');
const src = fs.readFileSync(__dirname + '/test4.js', 'utf8');
let FAKE = fs.readFileSync(__dirname + '/test2.js', 'utf8').split('const FAKE = `')[1].split('`;')[0];
const mcpBlock = src.split("FAKE = FAKE.replace(/const mcp = \\{[\\s\\S]*?\\};\\n/, `")[1].split("`);")[0];
FAKE = FAKE.replace(/const mcp = \{[\s\S]*?\};\n/, mcpBlock);
const ZT = fs.readFileSync(path.join(__dirname, '..', 'donnees', 'zones-tendues.json'), 'utf8');
const LO = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'donnees', 'loyers-2025.json'), 'utf8'));
const LOmini = JSON.stringify({ source: LO.source, c: { '35238': LO.c['35238'], '50003': LO.c['50003'], '69383': LO.c['69383'] } });
// en mode fichier, fetch("donnees/…") ne marche pas : on sert les deux fichiers directement
const DATA = `(() => { const f0 = window.fetch; window.fetch = (u, o) => { const s = String(u);
  if (/donnees\\/zones-tendues\\.json$/.test(s)) return Promise.resolve(new Response(${JSON.stringify(ZT)}, { headers: { 'Content-Type': 'application/json' } }));
  if (/donnees\\/loyers-2025\\.json$/.test(s)) return Promise.resolve(new Response(${JSON.stringify(LOmini)}, { headers: { 'Content-Type': 'application/json' } }));
  return f0(u, o); }; })();`;
const OUT = __dirname + '/shots107'; fs.mkdirSync(OUT, { recursive: true });
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
(async () => {
  const b = await chromium.launch(), errs = [], p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage();
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(FAKE); await p.addInitScript(DATA); await p.goto('file://' + path.join(__dirname, '..', 'index.html')); await p.waitForTimeout(500);
  await p.evaluate(() => { S = demo(); S.biens = [
      { id: 'r', nom: 'T2 Rennes', type: 'Appartement', pieces: 2, surface: 45, adresse: '3 rue de la Gare', cp: '35000', ville: 'Rennes', banId: '35238_1234_00003', meuble: 'vide' },
      { id: 'a', nom: 'Maison Agon', type: 'Maison', surface: 80, adresse: '3 rue de la Mer', cp: '50230', ville: 'Agon-Coutainville', insee: '50003', meuble: 'vide' },
      { id: 'l', nom: 'T1 Lyon', type: 'Appartement', pieces: 1, adresse: '10 cours Gambetta', cp: '69003', ville: 'Lyon', banId: '69383_0001_00010' }];
    S.baux = [{ id: 'br', bienId: 'r', nom: 'Léa Martin', typeBail: 'vide', dateEntree: '2024-01-01', loyerHC: 700, charges: 50, jourPaiement: 5, revisions: [], suiviDepuis: CUR },
      { id: 'ba', bienId: 'a', nom: 'Paul Durand', typeBail: 'vide', dateEntree: '2024-01-01', loyerHC: 1200, charges: 0, jourPaiement: 5, revisions: [], suiviDepuis: CUR },
      { id: 'old', bienId: 'l', nom: 'Ancien Locataire', typeBail: 'vide', dateEntree: '2022-01-01', dateSortie: iso(addDays(TODAY, -60)), loyerHC: 520, charges: 30, jourPaiement: 5, revisions: [], suiviDepuis: '2022-01' }];
    S.paiements = []; go('bien-r'); });
  await p.waitForTimeout(800);
  await p.screenshot({ path: OUT + '/rennes.png', fullPage: true });
  const r = await p.evaluate(() => (document.querySelector('#app .commune') || {}).innerText || '');
  ok('Rennes : "Zone tendue" et préavis d\'1 mois', /Zone tendue/.test(r) && /1 mois/.test(r));
  ok(`Rennes : loyer d'annonce 17,2 €/m² (1-2 pièces), ~770 € pour 45 m², "dans la moyenne" (750 €)`, /17,2 €\/m²/.test(r) && /770/.test(r) && /dans la moyenne/.test(r));
  ok('source dite (service-public, carte des loyers 2025)', /service-public/.test(await p.evaluate(() => document.querySelector('#app .commune').textContent)));
  await p.evaluate(() => go('bien-a')); await p.waitForTimeout(800);
  const a = await p.evaluate(() => (document.querySelector('#app .commune') || {}).innerText || '');
  ok('Agon : "Pas en zone tendue", préavis 3 mois', /Pas en zone tendue/.test(a) && /3 mois/.test(a));
  ok(`Agon (maison 80 m², 7,2 €/m² → ~580 €) : loyer de 1 200 € "au-dessus"`, /7,2 €\/m²/.test(a) && /au-dessus/.test(a));
  await p.evaluate(() => go('bien-l')); await p.waitForTimeout(800);
  ok('Lyon 3e (arrondissement) : reconnu en zone tendue, loyer trouvé', /Zone tendue/.test(await p.evaluate(() => (document.querySelector('#app .commune') || {}).innerText || '')) && /€\/m²/.test(await p.evaluate(() => (document.querySelector('#app .commune') || {}).innerText || '')));
  // départ : préavis exact, date de sortie proposée
  await p.evaluate(() => finBail('br')); await p.waitForTimeout(300);
  ok('départ (Rennes) : "Préavis du locataire : 1 mois (zone tendue)"', /1 mois<\/b> \(zone tendue\)|1 mois \(zone tendue\)/.test(await p.evaluate(() => document.getElementById('overlay').innerText)));
  await p.fill('#mform [name=preavisRecu]', '2026-11-10'); await p.dispatchEvent('#mform [name=preavisRecu]', 'change'); await p.waitForTimeout(100);
  ok('préavis reçu le 10/11 → sortie proposée le 10/12', await p.inputValue('#mform [name=dateSortie]') === '2026-12-10');
  await p.evaluate(() => { closeOverlay(); finBail('ba'); }); await p.waitForTimeout(300);
  ok('départ (Agon, vide) : 3 mois', /3 mois/.test(await p.evaluate(() => document.getElementById('overlay').innerText)));
  await p.evaluate(() => closeOverlay());
  // nouveau locataire à Lyon (zone tendue), l'ancien parti il y a 2 mois : loyer encadré
  await p.evaluate(() => editBail(null, 'l')); await p.waitForTimeout(300);
  const n = await p.evaluate(() => (document.querySelector('#overlay .zt-reloc') || {}).innerText || '');
  ok(`relocation en zone tendue : "ne peut pas dépasser celui d'Ancien Locataire (520 €)"`, /ne peut pas dépasser/.test(n) && /520/.test(n));
  ok('aucune erreur', !errs.length); if (errs.length) console.log(errs);
  await b.close(); console.log(KO ? `\n${KO} échec(s)` : '\nTout est bon'); process.exit(KO ? 1 : 0);
})();

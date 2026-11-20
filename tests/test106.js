// Déclaration de revenus en nom propre : 2044 (location vide, réel ou micro-foncier) et meublé (micro-BIC) — mode local.
// Cas calculés à la main : charges, taxe foncière sans ordures ménagères, copropriété récupérable exclue, capital exclu,
// déficit (4BC jusqu'à 10 700 €, intérêts et excédent en 4BB), micro plus avantageux, plafond 15 000 €, meublé 5ND.
const { chromium, devices } = require('playwright'); const fs = require('fs');
const src = fs.readFileSync(__dirname + '/test4.js', 'utf8');
let FAKE = fs.readFileSync(__dirname + '/test2.js', 'utf8').split('const FAKE = `')[1].split('`;')[0];
const mcpBlock = src.split("FAKE = FAKE.replace(/const mcp = \\{[\\s\\S]*?\\};\\n/, `")[1].split("`);")[0];
FAKE = FAKE.replace(/const mcp = \{[\s\S]*?\};\n/, mcpBlock);
const OUT = __dirname + '/shots106'; fs.mkdirSync(OUT, { recursive: true });
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
(async () => {
  const b = await chromium.launch(), errs = [], p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage();
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(FAKE); await p.goto('file://' + require('path').join(__dirname, '..', 'index.html')); await p.waitForTimeout(500);
  // un espace en nom propre, année 2025 (déclarée en mai 2026)
  const cas = (o) => p.evaluate(o => {
    S = demo(); S.sci.forme = 'perso'; S.prets = []; S.taxes = []; S.depenses = []; S.paiements = []; S.baux = []; S.biens = [];
    const y = 2025;
    S.biens.push({ id: 'v1', nom: 'T2 vide', type: 'Appartement', meuble: 'vide' });
    S.baux.push({ id: 'l1', bienId: 'v1', nom: 'Léa', typeBail: 'vide', dateEntree: '2024-01-01', loyerHC: o.loyer, charges: 50, jourPaiement: 5, revisions: [], suiviDepuis: '2024-01' });
    for (let m = 1; m <= o.mois; m++) { const mm = y + '-' + String(m).padStart(2, '0'); S.paiements.push({ id: 'p' + m, bailId: 'l1', mois: mm, montant: o.loyer + 50, date: mm + '-05', mode: 'virement' }); }
    if (o.meuble) { S.biens.push({ id: 'm1', nom: 'Studio meublé', type: 'Studio', meuble: 'meuble' }); S.baux.push({ id: 'l2', bienId: 'm1', nom: 'Tom', typeBail: 'meuble', dateEntree: '2024-01-01', loyerHC: 600, charges: 50, jourPaiement: 5, revisions: [], suiviDepuis: '2024-01' });
      for (let m = 1; m <= 12; m++) { const mm = y + '-' + String(m).padStart(2, '0'); S.paiements.push({ id: 'q' + m, bailId: 'l2', mois: mm, montant: 650, date: mm + '-05', mode: 'virement' }); }
      S.depenses.push({ id: 'dm', date: y + '-04-01', bienId: 'm1', categorie: 'Travaux d\'entretien / réparation', montant: 300, libelle: 'peinture' }); }
    const D = (cat, m, x = {}) => S.depenses.push({ id: 'd' + S.depenses.length, date: y + '-06-01', bienId: 'v1', categorie: cat, montant: m, libelle: cat, ...x });
    S.taxes.push({ id: 't1', bienId: 'v1', annee: y, total: 1000, teom: 150, parts: [], partSci: 0 });
    if (o.tf !== false) D('Taxe foncière', 1000, { taxeId: 't1' });
    D('Assurance propriétaire (PNO)', 200);
    if (o.travaux) D('Travaux d\'entretien / réparation', o.travaux);
    if (o.copro !== false) { D('Charges de copropriété', 400); D('Charges de copropriété', 300, { recuperable: true }); }
    if (o.interets) D('Intérêts d\'emprunt', o.interets);
    D('Frais bancaires', 60); D('Remboursement capital emprunt', 5000);
    const r = calcul2044(y); return { L: r.L, L240: r.L240, L250: r.L250, L261: r.L261, c4BA: r.c4BA, c4BB: r.c4BB, c4BC: r.c4BC, conseil: r.conseil, baseMicro: r.baseMicro, recM: r.recM, microBIC: r.microBIC, aVerifier: r.aVerifier.map(d => d.categorie) };
  }, o);
  // A. réel plus avantageux : 8 400 de loyers ; 20 + 200 + 3 000 + 850 + 400 = 4 470 ; intérêts 2 500 ; 8 400 − 4 470 − 2 500 = 1 430
  let r = await cas({ loyer: 700, mois: 12, travaux: 3000, interets: 2500 });
  ok(`A. ligne 211 = 8 400 (loyers sans les charges) : ${r.L[211]}`, r.L[211] === 8400);
  ok(`A. taxe foncière sans ordures ménagères 850, copro récupérable exclue (400), forfait 20 : ${r.L[227]} / ${r.L[229]} / ${r.L[222]}`, r.L[227] === 850 && r.L[229] === 400 && r.L[222] === 20);
  ok(`A. 240 = 4 470, 250 = 2 500, 261 = 1 430 : ${r.L240} / ${r.L250} / ${r.L261}`, r.L240 === 4470 && r.L250 === 2500 && r.L261 === 1430);
  ok(`A. 4BA = 1 430 et conseil "réel" (1 430 < micro 5 880) : ${r.c4BA} · ${r.conseil}`, r.c4BA === 1430 && r.conseil === 'reel' && r.baseMicro === 5880);
  ok(`A. frais bancaires "à vérifier", capital jamais compté : ${r.aVerifier.join(', ')}`, r.aVerifier.length === 1 && r.aVerifier[0] === 'Frais bancaires');
  // B. déficit hors intérêts : travaux 12 000 → 240 = 13 470 ; 261 = 8 400 − 13 470 − 2 500 = −7 570 → 4BC 7 570
  r = await cas({ loyer: 700, mois: 12, travaux: 12000, interets: 2500 });
  ok(`B. déficit −7 570 : 4BC = 7 570, 4BB = 0 : ${r.L261} / ${r.c4BC} / ${r.c4BB}`, r.L261 === -7570 && r.c4BC === 7570 && r.c4BB === 0 && r.conseil === 'reel');
  // C. intérêts > loyers : loyers 2 000 (4 mois × 500), intérêts 2 500, travaux 15 000 → C = 16 470 ; 4BC = 10 700, 4BB = 500 + 5 770 = 6 270
  r = await cas({ loyer: 500, mois: 4, travaux: 15000, interets: 2500 });
  ok(`C. gros déficit : 4BC plafonné à 10 700, 4BB = 6 270 : ${r.c4BC} / ${r.c4BB} (261 = ${r.L261})`, r.c4BC === 10700 && r.c4BB === 6270 && r.L261 === -16970);
  // D. micro plus avantageux : peu de frais
  r = await cas({ loyer: 700, mois: 12, tf: false, copro: false });
  ok(`D. peu de frais : conseil "micro" (base 5 880 < réel ${r.L261})`, r.conseil === 'micro' && r.L261 === 8180);
  // E. plus de 15 000 € de loyers : réel obligatoire
  r = await cas({ loyer: 1400, mois: 12, tf: false, copro: false });
  ok(`E. 16 800 € de loyers : micro impossible → réel`, r.L[211] === 16800 && r.conseil === 'reel');
  // F. meublé : micro-BIC, loyers charges comprises 7 800 → 5ND, imposé sur 3 900 ; ses dépenses ne vont pas dans la 2044
  r = await cas({ loyer: 700, mois: 12, travaux: 3000, interets: 2500, meuble: true });
  ok(`F. meublé : 5ND = 7 800, base 3 900, la 2044 ne bouge pas (211 = ${r.L[211]}, 224 = ${r.L[224]})`, r.recM === 7800 && r.microBIC === 3900 && r.L[211] === 8400 && r.L[224] === 3000);
  // écran : Compta › Comptable
  await p.evaluate(() => { view.comptaAnnee = 2025; view.comptaOnglet = 'comptable'; location.hash = 'compta'; render(); }); await p.waitForTimeout(400);
  await p.evaluate(() => { const e = document.getElementById('decl2044'); if (e) e.scrollIntoView(); });
  await p.screenshot({ path: OUT + '/declaration.png', fullPage: true });
  const t = await p.evaluate(() => (document.getElementById('decl2044') || {}).innerText || '');
  ok('écran : conseil, cases 4BA et 5ND, lignes 2044, "à faire en mai 2026"', /Le régime réel/.test(t) && /4BA/.test(t) && /5ND/.test(t) && /211/.test(t) && /mai 2026/.test(t));
  ok('écran : "Copier les montants" et lien impots.gouv', /Copier les montants/.test(t) && /impots\.gouv/.test(t));
  // rappel en avril-mai pour un propriétaire en nom propre (pas l'AG ni la 2072 d'une SCI)
  const p2 = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); p2.on('pageerror', e => errs.push(e.message));
  await p2.clock.install({ time: new Date(2026, 4, 2, 10) }); await p2.addInitScript(FAKE); await p2.goto('file://' + require('path').join(__dirname, '..', 'index.html')); await p2.waitForTimeout(500);
  const rappel = await p2.evaluate(() => { S = demo(); S.sci.forme = 'perso'; const T = taches(); const x = T.find(t => t.key === 'fisc-2044-2026'); return { x: x && { t: x.t, a: x.acts[0] && x.acts[0][0] }, sci: T.some(t => /^fisc-(ag|2072)-/.test(t.key)) }; });
  ok(`rappel en mai : "${rappel.x && rappel.x.t}" · bouton "${rappel.x && rappel.x.a}", pas de tâche SCI`, rappel.x && /Déclarer tes loyers 2025/.test(rappel.x.t) && rappel.x.a === 'Voir mes montants' && !rappel.sci);
  // une SCI ne voit pas ce bloc (elle a la 2072)
  ok('SCI : pas de bloc 2044 en nom propre', await p.evaluate(() => { S.sci.forme = 'sci'; return declaration2044(2025) === ''; }));
  ok('aucune erreur', !errs.length); if (errs.length) console.log(errs);
  await b.close(); console.log(KO ? `\n${KO} échec(s)` : '\nTout est bon'); process.exit(KO ? 1 : 0);
})();

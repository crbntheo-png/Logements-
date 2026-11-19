// Bail commercial / professionnel (cas de Max : local loué à une EURL avec un bail "vide") — mode local, espace de démonstration.
// Proposition "c'est un bail commercial ?" en un geste (Annuler possible), révision avec l'ILC (pas l'IRL, pas de gel DPE),
// durée 9 ans, préavis 6 mois, "assurance du local", pas de bail type ni de lettre de congé, type proposé d'office pour un local.
const { chromium, devices } = require('playwright'); const fs = require('fs');
const src = fs.readFileSync(__dirname + '/test4.js', 'utf8');
let FAKE = fs.readFileSync(__dirname + '/test2.js', 'utf8').split('const FAKE = `')[1].split('`;')[0];
const mcpBlock = src.split("FAKE = FAKE.replace(/const mcp = \\{[\\s\\S]*?\\};\\n/, `")[1].split("`);")[0];
FAKE = FAKE.replace(/const mcp = \{[\s\S]*?\};\n/, mcpBlock);
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
(async () => {
  const b = await chromium.launch(), p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(FAKE); await p.goto('file://' + require('path').join(__dirname, '..', 'index.html')); await p.waitForTimeout(500);
  const id = await p.evaluate(() => { S = demo();
    const bi = { id: 'loc1', nom: 'Local commercial', type: 'Local', adresse: '1 rue du Port', cp: '50230', ville: 'Agon', dpe: 'G' }; S.biens.push(bi);
    // bail signé le 21/04/2025, trimestre de référence T4 2024 (dernier ILC publié), loyer 1 000 €
    const bl = { id: 'bc1', bienId: 'loc1', nom: 'EURL Velours & Végétal', typeBail: 'vide', dateEntree: '2025-' + String(TODAY.getMonth() + 1).padStart(2, '0') + '-01', loyerHC: 1000, charges: 0, jourPaiement: 5, irlTrimestre: 'T2 2024', revisions: [], revisable: true, suiviDepuis: CUR };
    S.baux.push(bl); save(); return bl.id; });
  const tache = () => p.evaluate(() => taches().find(t => t.key === 'bail-pro-bc1'));
  const t = await tache();
  ok('proposition "c\'est un bail commercial ?" dans À faire', !!t && /bail commercial/.test(t.t) && t.acts[0][1] === "passerBailPro('bc1','commercial')");
  ok('avant : révision calculée avec l\'IRL et gelée (DPE G)', await p.evaluate(() => { const r = revInfo(bail('bc1')); return r && r.statut === 'gele'; }));
  await p.evaluate(() => passerBailPro('bc1', 'commercial')); await p.waitForTimeout(200);
  ok('passé en bail commercial, toast avec Annuler', await p.evaluate(() => bail('bc1').typeBail === 'commercial') && await p.locator('#toast:not([hidden]) .toast-undo').count() === 1);
  ok('la proposition disparaît', !(await tache()));
  const rv = await p.evaluate(() => revInfo(bail('bc1')));
  ok(`révision avec l'ILC (pas de gel DPE) : ${rv && rv.idx} ${rv && rv.oldKey} → ${rv && rv.newKey}`, rv && rv.idx === 'ILC' && rv.statut === 'pret' && rv.oldKey === '2025-2' && rv.newKey === '2026-2');
  ok(`nouveau loyer = 1000 × 137,16 / 136,81 = ${rv && rv.nouveau}`, rv && rv.nouveau === Math.round(1000 * 137.16 / 136.81 * 100) / 100);
  ok('durée 9 ans', await p.evaluate(() => dureeBail(bail('bc1')).mois === 108));
  ok('À faire : "Attestation d\'assurance du local"', await p.evaluate(() => taches().some(t => t.bailId === 'bc1' && /assurance du local/.test(t.t))));
  await p.evaluate(() => go('bail-bc1')); await p.waitForTimeout(300);
  const menu = await p.evaluate(() => [...document.querySelectorAll('#app .menu-plus button')].map(x => x.textContent).join(' | '));
  ok('fiche : pas de "Générer le bail"', !/Générer le bail/.test(menu));
  ok('fiche : indice ILC affiché', await p.evaluate(() => /Indice ILC/.test(document.querySelector('#app').innerText)));
  await p.evaluate(() => congeBailleur('bc1')); await p.waitForTimeout(200);
  ok('congé : explication (commissaire de justice), pas de lettre', await p.evaluate(() => document.getElementById('overlay').hidden && /commissaire de justice/.test(document.getElementById('toast').textContent)));
  // Annuler remet le bail d'avant
  await p.evaluate(() => passerBailPro('bc1', 'vide')); ok('Annuler remet le bail d\'avant', await p.evaluate(() => bail('bc1').typeBail === 'vide'));
  // Nouveau locataire sur un local : bail commercial proposé d'office, indice ILC
  await p.evaluate(() => editBail(null, 'loc1')); await p.waitForTimeout(300);
  ok('nouveau locataire sur un local : "Bail commercial" choisi, indice ILC visible', await p.evaluate(() => { const f = document.getElementById('mform'); return f.typeBail.value === 'commercial' && f.indice.value === 'ILC' && !f.querySelector('.ch-indice').hidden; }));
  await p.evaluate(() => { const f = document.getElementById('mform'); f.typeBail.value = 'vide'; f.typeBail.dispatchEvent(new Event('change')); });
  ok('repasser en "vide" : indice IRL et choix d\'indice caché', await p.evaluate(() => { const f = document.getElementById('mform'); return f.indice.value === 'IRL' && f.querySelector('.ch-indice').hidden; }));
  await p.evaluate(() => { const f = document.getElementById('mform'); f.typeBail.value = 'commercial'; f.typeBail.dispatchEvent(new Event('change')); f.nom.value = 'SARL Test'; f.dateEntree.value = '2026-01-10'; f.loyerHC.value = '900'; f.depot.value = '2700'; f.depot.dispatchEvent(new Event('input')); });
  ok('dépôt de 3 mois accepté pour un bail commercial', await p.evaluate(() => !/trop élevé/.test(document.getElementById('depotWarn').textContent)));
  await p.evaluate(() => document.getElementById('mform').requestSubmit()); await p.waitForTimeout(400);
  ok('enregistré : bail commercial, indice ILC', await p.evaluate(() => { const x = S.baux.find(b => b.nom === 'SARL Test'); return x && x.typeBail === 'commercial' && indiceDe(x) === 'ILC'; }));
  // Un logement normal n'est pas touché
  ok('logement d\'habitation : toujours IRL', await p.evaluate(() => indiceDe(S.baux[0]) === 'IRL' && !taches().some(t => t.key === 'bail-pro-' + S.baux[0].id)));
  ok('aucune erreur', !errs.length); if (errs.length) console.log(errs);
  await b.close(); console.log(KO ? `\n${KO} échec(s)` : '\nTout est bon'); process.exit(KO ? 1 : 0);
})();

// Corrections de la relecture du code (21/11) — mode local.
// Relevé à cheval sur deux années (bonne année pour les lignes "jj/mm"), commune oubliée quand l'adresse change,
// retard de l'an dernier compté en janvier, "Pas besoin" respecté par À faire, Annuler d'un bail commercial, lien retour avec "$&".
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const src = fs.readFileSync(__dirname + '/test4.js', 'utf8');
let FAKE = fs.readFileSync(__dirname + '/test2.js', 'utf8').split('const FAKE = `')[1].split('`;')[0];
const mcpBlock = src.split("FAKE = FAKE.replace(/const mcp = \\{[\\s\\S]*?\\};\\n/, `")[1].split("`);")[0];
FAKE = FAKE.replace(/const mcp = \{[\s\S]*?\};\n/, mcpBlock);
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const gen = await b.newPage();
  const pdf = async h => { await gen.setContent(`<html><body style="font:11px Arial;padding:20px">${h}</body></html>`); return (await gen.pdf({ format: 'A4' })).toString('base64'); };
  const tab = rows => `<table style="width:100%" cellpadding="3"><tr><th align="left">Date</th><th align="left">Opération</th><th align="right">Débit</th><th align="right">Crédit</th></tr>${rows.map(([d, o, de, cr]) => `<tr><td>${d}</td><td>${o}</td><td align="right">${de || ''}</td><td align="right">${cr || ''}</td></tr>`).join('')}</table>`;
  const decembre = await pdf(`<h3>RELEVÉ DE COMPTE du 01/12/2025 au 31/12/2025</h3><p>Édité le 02/01/2026</p>${tab([['05/12', 'VIR LOYER DURAND', '', '650,00'], ['28/12', 'PRLV EDF', '45,20', '']])}`);
  const cheval = await pdf(`<h3>RELEVÉ DE COMPTE du 28/12/2025 au 27/01/2026</h3><p>Compte ouvert le 12/03/2019</p>${tab([['30/12', 'VIR LOYER MARTIN', '', '700,00'], ['05/01', 'PRLV ASSURANCE', '30,00', '']])}`);
  await gen.close();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.on('pageerror', e => errs.push(e.message));
  await p.route('**/pdf.js/3.11.174/pdf.min.js', r => r.fulfill({ path: __dirname + '/vendor/pdfjs/pdf.min.js', contentType: 'application/javascript' }));
  await p.route('**/pdf.js/3.11.174/pdf.worker.min.js', r => r.fulfill({ path: __dirname + '/vendor/pdfjs/pdf.worker.min.js', contentType: 'application/javascript' }));
  await p.addInitScript(FAKE); await p.goto('file://' + path.join(__dirname, '..', 'index.html')); await p.waitForTimeout(500);
  const lire = b64 => p.evaluate(async b64 => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return (await releveDepuisPdf(new Blob([u], { type: 'application/pdf' }))).ops.map(o => o.date + ' ' + o.montant); }, b64);
  let r = await lire(decembre);
  ok(`relevé de décembre édité en janvier : lignes en décembre 2025 (${r.join(', ')})`, r.includes('2025-12-05 650') && r.includes('2025-12-28 -45.2'));
  r = await lire(cheval);
  ok(`relevé du 28/12 au 27/01 : 30/12 → 2025, 05/01 → 2026 (${r.join(', ')})`, r.includes('2025-12-30 700') && r.includes('2026-01-05 -30'));
  // commune oubliée quand l'adresse change
  const c = await p.evaluate(() => { S = demo(); const bi = S.biens[0]; bi.insee = '35238'; COMMUNE[bi.id] = { etat: 'ok', insee: '35238', zt: true };
    editBien(bi.id); const f = document.getElementById('mform'); f.ville.value = 'Rennes'; f.cp.value = '35000'; f.requestSubmit(); return { insee: bien(bi.id).insee, cache: (COMMUNE[bi.id] || {}).insee === '35238' }; });
  ok('adresse changée : code commune et zone tendue oubliés (recalculés)', !c.insee && !c.cache);
  // Pas besoin : plus de tâche d'attestation d'assurance, ni de taxe foncière
  const t = await p.evaluate(() => { const b = S.baux.find(x => isActive(x)); delete b.assuranceFin; const avant = taches().some(x => x.key.startsWith('ass-' + b.id));
    const bi = bien(b.bienId); bi.sansBesoin = ['assurance:' + b.id]; const apres = taches().some(x => x.key.startsWith('ass-' + b.id)); return { avant, apres }; });
  ok('"Pas besoin" de l\'assurance du locataire : plus de tâche dans À faire', t.avant && !t.apres);
  // Annuler un passage en bail commercial
  await p.evaluate(() => { const b = S.baux.find(x => isActive(x)); delete b.typeBail; passerBailPro(b.id, 'commercial'); window.__b = b.id; });
  const annul = await p.evaluate(() => { const bt = [...document.querySelectorAll('#toast .toast-undo')].find(x => x.textContent === 'Annuler'); bt.click(); return { type: bail(window.__b).typeBail, toast: document.getElementById('toast').innerText }; });
  ok(`Annuler : bail remis en "vide" (pas "undefined"), message "Remis comme avant" (${annul.type})`, annul.type === 'vide' && /Remis comme avant/.test(annul.toast));
  // lien retour avec un nom contenant "$&"
  await p.evaluate(() => { const bi = S.biens[0]; bi.nom = 'Appart $& test'; save(); location.hash = 'biens'; render(); go('bien-' + bi.id); });
  await p.waitForTimeout(300); await p.evaluate(() => { const bi = S.biens[0]; go(lienDocs(bi.id, -1, '').slice(1)); }); await p.waitForTimeout(300);
  console.log('    retour :', await p.evaluate(() => document.querySelector('#app a.back').outerHTML.slice(0, 200)));
  ok('lien retour : le nom "Appart $& test" s\'affiche tel quel', await p.evaluate(() => /Appart \$& test/.test(document.querySelector('#app a.back').textContent)));
  ok('aucune erreur', !errs.length); if (errs.length) console.log(errs);
  await b.close(); console.log(KO ? `\n${KO} échec(s)` : '\nTout est bon'); process.exit(KO ? 1 : 0);
})();

// Retours de Max, point par point (ce qui n'est pas déjà dans test91 / test92) : révision IRL, ordures ménagères par an,
// départ avec sa part d'ordures ménagères (avis connu → lettre ; sinon estimation gardée sur le dépôt), alertes diagnostics/assurance.
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path');
let FAKE = fs.readFileSync(__dirname + '/test2.js', 'utf8').split('const FAKE = `')[1].split('`;')[0];
const src = fs.readFileSync(__dirname + '/test4.js', 'utf8');
FAKE = FAKE.replace(/const mcp = \{[\s\S]*?\};\n/, src.split("FAKE = FAKE.replace(/const mcp = \\{[\\s\\S]*?\\};\\n/, `")[1].split("`);")[0]);
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.route(/accounts\.google\.com/, r => r.abort()); await p.addInitScript(FAKE);
  await p.goto('file://' + path.join(__dirname, '..', 'index.html')); await p.waitForTimeout(500);
  await p.evaluate(() => { S = demo(); delete S.demo; S.taxes = []; S.depenses = S.depenses.filter(d => !d.taxeId);
    S.biens = [{ id: 'b1', nom: 'T2 Islande', adresse: '11 rue d\'Islande', cp: '50300', ville: 'Avranches', meuble: 'meuble', surface: 40 }];
    S.baux = [{ id: 'l1', bienId: 'b1', nom: 'Léo Sabine', typeBail: 'meuble', dateEntree: '2025-06-10', suiviDepuis: '2025-06', loyerHC: '440', charges: '30', jourPaiement: '5', revisable: true, irlTrimestre: 'T1 2025', irlValeur: 145.47, depot: 880, revisions: [] }];
    S.paiements = []; S.quittances = {}; save(); render(); });
  // 1. Révision IRL : date anniversaire, nouveau loyer, courrier
  const rv = await p.evaluate(() => { const r = revInfo(bail('l1')); return r ? { statut: r.statut, ancien: r.ancien, nouveau: r.nouveau, anniv: iso(r.anniv) } : null; });
  ok('IRL : date anniversaire et nouveau loyer calculés (' + JSON.stringify(rv) + ')', rv && rv.anniv === '2026-06-10' && rv.nouveau > rv.ancien);
  ok('IRL : proposé dans À faire au bon moment', await p.evaluate(() => taches().some(t => t.key.startsWith('rev-') && /980|440|Augmenter|révision|Révision/i.test(t.t + t.d))));
  await p.evaluate(() => revision('l1')); await p.waitForTimeout(300);
  ok('IRL : fenêtre "Appliquer la révision" avec le nouveau loyer', await p.evaluate(() => !document.getElementById('overlay').hidden && /IRL|indice/i.test(document.getElementById('overlay').innerText)));
  await p.click('#mform button.primary'); await p.waitForTimeout(400);
  ok('IRL : courrier de révision prêt après application', await p.evaluate(() => { const b = bail('l1'); const i = (b.revisions || []).findIndex(r => r.type !== 'avenant'); if (i < 0) return false; closeOverlay(); docRevisionOpen('l1', i); return /révision|Révision/.test(document.getElementById('overlay').innerText); }));
  await p.evaluate(() => closeOverlay());
  // 2. Ordures ménagères : par défaut une fois par an (pas chaque mois)
  await p.evaluate(() => { enregistrerTaxe('b1', 2025, 900, 146); save(); });
  const k = await p.evaluate(() => { const t = S.taxes[0], pt = t.parts.find(x => x.bailId === 'l1'); return t.id; });
  await p.evaluate(id => teomQueFaire ? teomQueFaire(id, 'l1') : null, k).catch(() => {});
  const choix = await p.evaluate(() => { const tache = taches().find(t => t.key.startsWith('teom-')); if (!tache) return 'pas de tâche'; const btn = (tache.acts || [])[0]; if (btn) eval(btn[1]); const f = document.getElementById('mform'); if (!f) return 'pas de fenêtre'; return { defaut: f.querySelector('input[name=choix]:checked').value, mensuel: f.querySelector('input[name=mensualiser]').checked }; });
  ok('ordures ménagères : par défaut "la lui demander" une fois par an, chaque mois NON coché (' + JSON.stringify(choix) + ')', choix && choix.defaut === 'demander' && choix.mensuel === false);
  await p.evaluate(() => closeOverlay());
  // 3. Départ : sa part d'ordures ménagères (avis de l'année connu)
  await p.evaluate(() => { enregistrerTaxe('b1', 2026, 950, 146); finBail('l1'); }); await p.waitForTimeout(200);
  await p.fill('#mform input[name=dateSortie]', '2026-09-30'); await p.click('#mform button.primary'); await p.waitForTimeout(300);
  const dep = await p.evaluate(() => { const e = etapesDepart(bail('l1')).find(x => x.k === 'dep-teom'); return e ? { t: e.t, btn: e.btn && e.btn[0] } : null; });
  const attendu = await p.evaluate(() => eur(r2(146 * 273 / 365)));
  ok('départ : étape "Sa part d\'ordures ménagères 2026" au prorata jusqu\'au départ (' + (dep && dep.t) + ')', dep && dep.t.includes(attendu) && dep.btn === 'Préparer la lettre');
  ok('départ : parts recalculées avec la date de sortie', await p.evaluate(() => S.taxes.find(t => t.annee === 2026).parts.find(x => x.bailId === 'l1').au === '2026-09-30'));
  ok('départ : lettre "du 01/01/2026 au 30/09/2026"', await p.evaluate(() => { const t = S.taxes.find(x => x.annee === 2026); docTeom(t.id, 'l1'); const x = document.getElementById('overlay').innerText; closeOverlay(); return /30\/09\/2026|30 septembre 2026/.test(x) && x.includes(eur(r2(146 * 273 / 365))); }));
  ok('départ : visible sur la fiche du locataire', await p.evaluate(() => { location.hash = 'bail-l1'; render(); return /Sa part d'ordures ménagères 2026/.test(document.body.innerText); }));
  // 4. Départ : avis de l'année pas encore arrivé → estimation gardée sur le dépôt
  await p.evaluate(() => { S.taxes = S.taxes.filter(t => t.annee !== 2026); S.depenses = S.depenses.filter(d => !/2026/.test(d.libelle || '')); save(); });
  const est = await p.evaluate(() => { const e = etapesDepart(bail('l1')).find(x => x.k === 'dep-teom'); return e && { t: e.t, d: e.d, btn: e.btn[0] }; });
  ok('départ sans avis 2026 : estimation d\'après 2025, à garder sur le dépôt (' + (est && est.t) + ')', est && /environ/.test(est.t) && /2025/.test(est.d) && est.btn === 'Garder sur le dépôt');
  await p.evaluate(() => { const e = etapesDepart(bail('l1')).find(x => x.k === 'dep-teom'); eval(e.btn[1]); }); await p.waitForTimeout(200);
  ok('estimation ajoutée aux retenues du dépôt', await p.evaluate(() => (bail('l1').retenues || []).some(r => /Ordures ménagères 2026/.test(r.l)) && bail('l1').depotRetenu > 0 && etapesDepart(bail('l1')).find(x => x.k === 'dep-teom').ok));
  // 5. Alertes 4 mois avant
  const al = await p.evaluate(() => { const bi = bien('b1'); bi.dpeValidite = iso(addDays(TODAY, 100)); bi.diagElecFin = iso(addDays(TODAY, 60)); bi.diagGazFin = iso(addDays(TODAY, 20)); bi.pnoEcheance = iso(addDays(TODAY, 110)); return taches().filter(t => /^(dpeValidite|diagElecFin|diagGazFin|pno-ech)/.test(t.key)).map(t => t.prio + ':' + t.key.split('-')[0]); });
  ok('alertes : DPE, électricité, gaz, assurance prévenus avant la fin (' + al.join(', ') + ')', al.length === 4 && al.includes('soon:diagGazFin'));
  ok('aucune erreur JavaScript', !errs.length); if (errs.length) console.log(errs);
  await b.close(); console.log(KO ? `\n${KO} échec(s)` : '\nTout est bon'); process.exit(KO ? 1 : 0);
})();

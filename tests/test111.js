// Corrections du 2e audit "débutant" (21/11) — mode local, espace d'exemple.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const src = fs.readFileSync(__dirname + '/test4.js', 'utf8');
let FAKE = fs.readFileSync(__dirname + '/test2.js', 'utf8').split('const FAKE = `')[1].split('`;')[0];
const mcpBlock = src.split("FAKE = FAKE.replace(/const mcp = \\{[\\s\\S]*?\\};\\n/, `")[1].split("`);")[0];
FAKE = FAKE.replace(/const mcp = \{[\s\S]*?\};\n/, mcpBlock);
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
(async () => {
  const b = await chromium.launch(), errs = [], p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(FAKE); await p.goto('file://' + path.join(__dirname, '..', 'index.html')); await p.waitForTimeout(500);
  const y0 = await p.evaluate(() => TODAY.getFullYear() - 1);
  // 1. régularisation : provisions d'avant le suivi comptées (12 mois × 40 € = 480 €)
  const rg = await p.evaluate(y => { S = demo(); const b = S.baux.find(x => isActive(x) && x.chargesMode !== 'forfait' && loyerAt(x, CUR).ch > 0); b.dateEntree = (y - 1) + '-01-01'; b.suiviDepuis = CUR; const c = calculRegul(b, y); return { prov: c.prov, ch: loyerAt(b, CUR).ch, n: c.avantSuivi, id: b.id }; }, y0);
  ok(`régularisation ${y0} : provisions d'avant le suivi comptées (${rg.prov} € = 12 × ${rg.ch} €)`, Math.abs(rg.prov - 12 * rg.ch) < 0.02 && rg.n === 12);
  // 2. "Ajuster aussi sa provision" : le décompte reste visible, l'avenant est proposé ensuite
  await p.evaluate(([id, y]) => { regulCharges(id, y); const f = document.getElementById('mform'); f.lignes.value = 'Eau ; 180\nOrdures 120'; f.ajuster.checked = true; f.dispatchEvent(new Event('input')); }, [rg.id, y0]);
  await p.waitForTimeout(150);
  ok('ligne mal écrite ("Ordures 120") signalée avant de valider', /pas comptée/.test(await p.evaluate(() => document.getElementById('rgCalc').innerText)));
  await p.evaluate(() => document.querySelector('#mform > .full.row:last-child button.primary').click()); await p.waitForTimeout(1400);
  const apres = await p.evaluate(() => ({ doc: /régularisation des charges/i.test(document.getElementById('overlay').innerText), toast: document.getElementById('toast').innerText }));
  ok('le courrier de décompte reste affiché, "Faire l\'avenant" proposé à côté', apres.doc && /Faire l'avenant/.test(apres.toast));
  await p.evaluate(() => closeOverlay());
  // 3. Bilan PDF : intérêts des tableaux de prêt comptés
  const bil = await p.evaluate(() => { const y = TODAY.getFullYear(); S.prets = [{ id: 'pr1', bienId: S.biens[0].id, banque: 'Banque', montant: 100000, taux: 3, duree: 240, debut: (y - 1) + '-01-01' }]; const it = interetsPretAnnee(S.prets[0], y); docBilanOpen(y); return { it, txt: document.getElementById('overlay').innerText }; });
  ok(`Bilan PDF : intérêts du prêt comptés (${Math.round(bil.it)} €)`, bil.it > 0 && /Intérêts d'emprunt \(tableaux de prêt\)/.test(bil.txt));
  await p.evaluate(() => closeOverlay());
  // 4. 2044 : prêt laissé sur "Général"
  const d44 = await p.evaluate(() => { const y = TODAY.getFullYear(); S.sci.forme = 'perso'; S.prets = [{ id: 'pr2', bienId: '', banque: 'Banque', montant: 100000, taux: 3, duree: 240, debut: (y - 1) + '-01-01' }]; const r = calcul2044(y); return { l250: r.L[250], it: interetsPretAnnee(S.prets[0], y), meuble: r.M.length, av: r.aVerifier.map(x => x.libelle).join(' | ') }; });
  ok(`2044 : intérêts d'un prêt "général" comptés (ou à vérifier s'il y a du meublé) : 250 = ${d44.l250}`, d44.meuble ? /prêt sans logement/.test(d44.av) : d44.l250 >= Math.round(d44.it * 100) / 100 - 0.01);
  // 5. 2072 : taxe foncière sans les ordures ménagères
  const d72 = await p.evaluate(() => { S.sci.forme = 'sci'; S.sci.regime = 'IR'; const y = TODAY.getFullYear(); const d = document.createElement('div'); d.innerHTML = aideDeclaration(y, [], { loyers: 0, charges: 0 }); return d.innerText; });
  ok('2072 : ligne "Ordures ménagères (récupérables…)" séparée de la taxe foncière', /Ordures ménagères \(récupérables/.test(d72));
  // 6. Nom propre : pas de "Part de chaque associé" dans Compta
  ok('nom propre : pas de "Part de chaque associé" dans Compta', await p.evaluate(() => { S.sci.forme = 'perso'; view.comptaOnglet = 'resume'; location.hash = 'compta'; render(); return !/Part de chaque associé/.test(document.getElementById('app').innerText); }));
  // 7-8. DPE G : tâche avec boutons et "C'est fait" ; relouer interdit dit tout de suite
  const g = await p.evaluate(() => { S.sci.forme = 'sci'; const bi = S.biens.find(x => !bailActifDuBien(x.id)) || S.biens[0]; bi.dpe = 'G'; const t = taches().find(t => t.key === 'dpeg-' + bi.id); const d = document.createElement('div'); d.innerHTML = sectionLocation(bi); return { acts: t && t.acts.map(a => a[0]), done: t && t.done, rel: d.innerText, id: bi.id }; });
  ok(`DPE G : boutons (${g.acts}) et "C'est fait"`, g.acts && g.acts.length >= 1 && g.done);
  ok('DPE G : "relouer est interdit" dans Relouer', !g.rel || /relouer est interdit/.test(g.rel));
  // 9. candidat choisi : dépôt et date repris, la liste se ferme
  const ca = await p.evaluate(() => { const bi = S.biens.find(x => !bailActifDuBien(x.id)); if (!bi) return null; bi.dpe = 'D'; bi.annonce = { hc: 500, ch: 30, dispo: iso(addDays(TODAY, 20)) }; bi.candidats = [{ id: 'c1', nom: 'Zoé Lefèvre', garantie: 'visale', garantInfo: 'V123', revenus: 2000 }];
    choisirCandidat(bi.id, 'c1'); const f = document.getElementById('mform'); const v = { depot: f.depot.value, entree: f.dateEntree.value, visale: f.visale.value }; f.requestSubmit(); const d = document.createElement('div'); d.innerHTML = sectionLocation(bi); return { ...v, rel: d.innerText }; });
  if (ca) { ok(`candidat choisi : dépôt ${ca.depot} €, entrée ${ca.entree}, Visale ${ca.visale}`, +ca.depot === 500 && !!ca.entree && ca.visale === 'V123');
    ok('après le bail créé : "✅ Zoé Lefèvre entre le…", plus de liste de candidats', /Zoé Lefèvre/.test(ca.rel) && /entre le/.test(ca.rel) && !/Choisir/.test(ca.rel)); }
  await p.evaluate(() => closeOverlay());
  // 10. retenues : une ligne sans montant n'est pas retenue
  const ret = await p.evaluate(() => { const b = S.baux.find(x => isActive(x)); b.depot = 600; comparerEdl(b.id); const f = document.getElementById('mform'); if (!f || !f.ret) return null; f.ret.value = 'Séjour : trou ; '; f.dispatchEvent(new Event('input')); const w = document.getElementById('retCalc').innerText; f.requestSubmit(); return { w, r: bail(b.id).retenues, tot: bail(b.id).depotRetenu }; });
  if (ret) ok(`retenue sans montant : signalée et pas retenue (${JSON.stringify(ret.r)})`, /sans montant/.test(ret.w) && (ret.r || []).length === 0 && !ret.tot);
  await p.evaluate(() => closeOverlay());
  // 11. associés : parts non numériques refusées
  ok('associés : "Marie ; dix" refusé avec un message', await p.evaluate(() => { S.sci.forme = 'sci'; const f = document.createElement('form'); f.innerHTML = '<textarea name="associes">Paul ; 50\nMarie ; dix</textarea>'; const avant = JSON.stringify(S.sci.associes); const r = saveSci(f); return r === false && JSON.stringify(S.sci.associes) === avant && /écris un nombre entier/.test(document.getElementById('toast').innerText); }));
  ok('aucune erreur', !errs.length); if (errs.length) console.log(errs);
  await b.close(); console.log(KO ? `\n${KO} échec(s)` : '\nTout est bon'); process.exit(KO ? 1 : 0);
})();

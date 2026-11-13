// Paiement partiel étalé, ordures ménagères (tous les choix) et avenant au bail — téléphone 390 × 844
const { chromium } = require('playwright');
const fs = require('fs');
const out = __dirname + '/shots29';
fs.mkdirSync(out, { recursive: true });
const src = fs.readFileSync(__dirname + '/test4.js', 'utf8');
let FAKE = fs.readFileSync(__dirname + '/test2.js', 'utf8').split('const FAKE = `')[1].split('`;')[0];
const mcpBlock = src.split("FAKE = FAKE.replace(/const mcp = \\{[\\s\\S]*?\\};\\n/, `")[1].split("`);")[0];
FAKE = FAKE.replace(/const mcp = \{[\s\S]*?\};\n/, mcpBlock);
const ok = [], ko = [];
const check = (c, msg) => (c ? ok : ko).push(msg);
(async () => {
  const b = await chromium.launch();
  const errs = [];
  for (const [name, scheme] of [['m', 'light'], ['md', 'dark']]) {
    const vp = { width: 390, height: 844 };
    const p = await b.newPage({ viewport: vp, colorScheme: scheme });
    p.on('pageerror', e => errs.push(name + ':' + e.message)); p.on('console', m => m.type() === 'error' && errs.push(name + ':' + m.text()));
    await p.addInitScript(FAKE);
    await p.route('**/jspdf.umd.min.js', r => r.fulfill({ path: __dirname + '/vendor/jspdfpkg/package/dist/jspdf.umd.min.js', contentType: 'application/javascript' }));
    await p.goto('file://' + require('path').join(__dirname, '..', 'index.html')); await p.waitForTimeout(500);
    await p.evaluate(() => { S = demo(); save(); render(); }); await p.waitForTimeout(300);
    const shot = async (n, full = false) => { await p.waitForTimeout(250); await p.screenshot({ path: `${out}/${name}-${n}.png`, fullPage: full }); const sw = await p.evaluate(() => Math.max(document.documentElement.scrollWidth, ...[...document.querySelectorAll('.modal')].map(m => m.scrollWidth - m.clientWidth + 390))); if (sw > vp.width) errs.push(`${name}-${n} overflow ${sw}`); };

    // 1. Un locataire paie une partie seulement : 200 € sur son loyer, on étale le reste à 50 €/mois
    const id = await p.evaluate(() => { const b = S.baux.find(x => isActive(x) && !planEtat(x) && echeance(x, CUR)); S.paiements = S.paiements.filter(x => !(x.bailId === b.id && x.mois === CUR)); b.jourPaiement = 1; delete b.plan; save(); render(); return b.id; });
    await p.evaluate(id => verserSomme(id), id);
    await p.fill('#f_montant', '200'); await p.waitForTimeout(150);
    check(await p.isVisible('#etaler'), name + ' : le bloc "étaler le reste" apparaît quand il manque de l\'argent');
    await p.check('#f_etaler'); await p.fill('#f_mens', '50'); await p.waitForTimeout(150);
    const calc = await p.textContent('#etCalc'); check(/pendant/.test(calc), name + ' : le calcul s\'affiche (' + calc.trim() + ')');
    await shot('1-verser-etaler');
    await p.click('#mform button.primary'); await p.waitForTimeout(300);
    const r1 = await p.evaluate(id => { const b = bail(id), e = echeance(b, CUR), pl = planEtat(b); return { statut: e.statut, plan: b.plan, ok: pl && pl.ok, taches: taches().filter(t => t.bailId === id).map(t => t.key) }; }, id);
    check(r1.statut === 'etale', name + ' : le mois passe en "Étalé" (et pas "En retard") — ' + r1.statut);
    check(r1.plan && r1.plan.mensualite === 50 && r1.plan.dette > 0, name + ' : accord enregistré ' + JSON.stringify(r1.plan));
    check(r1.ok && !r1.taches.some(k => k.startsWith('imp-')), name + ' : pas de relance proposée tant qu\'il suit l\'accord');
    await p.evaluate(() => location.hash = 'accueil'); await shot('2-accueil-etale', true);
    await p.evaluate(id => location.hash = 'bail-' + id, id); await shot('3-fiche-etale', true);
    await p.evaluate(id => editPlan(id), id); await shot('4-modifier-etalement'); await p.evaluate(() => closeOverlay());

    // 2. Ordures ménagères : écran "Que faire ?"
    const tx = await p.evaluate(() => { const t = S.taxes[0]; const pt = t.parts.find(x => x.montant > 0); return { t: t.id, b: pt.bailId, annee: t.annee }; });
    await p.evaluate(x => teomChoix(x.t, x.b), tx); await shot('5-teom-choix');
    await p.check('input[name=choix][value=paye]'); await p.check('input[name=mensualiser]'); await p.waitForTimeout(150);
    check(await p.isVisible('#tqMens'), name + ' : les champs "chaque mois" apparaissent');
    await shot('6-teom-paye-mensuel');
    await p.click('#mform button.primary'); await p.waitForTimeout(400);
    check(await p.evaluate(() => !!document.querySelector('#overlay #f_motif')), name + ' : l\'avenant s\'ouvre tout seul ensuite');
    await shot('7-avenant-teom');
    await p.click('#mform button.primary'); await p.waitForTimeout(500);
    await shot('8-avenant-doc');
    const r2 = await p.evaluate(x => { const t = S.taxes.find(y => y.id === x.t), pt = t.parts.find(y => y.bailId === x.b), b = bail(x.b), av = (b.revisions || []).find(r => r.type === 'avenant'), next = String(x.annee + 1) + '-01';
      return { payeLe: pt.payeLe, teomMensuel: b.teomMensuel, av, chAvant: loyerAt(b, String(x.annee) + '-12').ch, chApres: loyerAt(b, next).ch, tache: taches().some(k => k.key.startsWith('teom-' + x.t + x.b)), doc: document.getElementById('paper') && document.getElementById('paper').innerText }; }, tx);
    check(!!r2.payeLe && !r2.tache, name + ' : part de l\'année marquée payée, plus de tâche');
    check(r2.teomMensuel && r2.chApres > r2.chAvant, name + ` : charges ${r2.chAvant} → ${r2.chApres} à partir de janvier`);
    check(r2.doc && /Avenant n° 1/i.test(r2.doc) && /ordures ménagères/i.test(r2.doc) && /lu et approuvé/i.test(r2.doc), name + ' : le document d\'avenant est complet');
    check(r2.doc && !/[«»“”]/.test(r2.doc), name + ' : guillemets droits seulement dans l\'avenant');
    await p.evaluate(() => closeOverlay());

    // 3. "Je ne la demande pas" fait disparaître la tâche
    await p.evaluate(() => { const t = S.taxes[0]; t.parts.forEach(x => { delete x.payeLe; }); const b = bail(t.parts[0].bailId); delete b.teomMensuel; save(); render(); });
    await p.evaluate(x => teomChoix(x.t, x.b), tx); await p.check('input[name=choix][value=renonce]'); await p.click('#mform button.primary'); await p.waitForTimeout(300);
    check(await p.evaluate(x => !taches().some(k => k.key.startsWith('teom-' + x.t + x.b)), tx), name + ' : "je ne la demande pas" retire la tâche');

    // 4. Avenant libre depuis la fiche (nouveau loyer convenu)
    await p.evaluate(id => location.hash = 'bail-' + id, id); await p.waitForTimeout(200);
    await p.click('details.menu-plus summary'); await p.click('text=✍️ Avenant au bail'); await p.waitForTimeout(200);
    await p.selectOption('#f_motif', 'loyer'); await p.fill('#f_loyerHC', '999'); await p.waitForTimeout(100);
    check(/999/.test(await p.textContent('#avCalc')) || /→/.test(await p.textContent('#avCalc')), name + ' : le total avant/après s\'affiche');
    await shot('9-avenant-libre');
    await p.click('#mform button.primary'); await p.waitForTimeout(400);
    check(await p.evaluate(id => loyerAt(bail(id), addM(CUR, 1)).hc === 999 && loyerAt(bail(id), CUR).hc !== 999, id), name + ' : nouveau loyer seulement à partir du mois prochain');
    await p.evaluate(() => closeOverlay());
    await p.evaluate(id => location.hash = 'bail-' + id, id); await shot('10-fiche-avenants', true);
  }
  console.log('OK', ok.length); ok.forEach(x => console.log('  ✓', x));
  console.log('KO', ko.length); ko.forEach(x => console.log('  ✗', x));
  console.log('ERRORS', errs);
  await b.close();
  process.exit(ko.length || errs.length ? 1 : 0);
})();

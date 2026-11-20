// Corrections de l'audit "débutant" du 20/11 — mode local, espace d'exemple, 360 px.
// Pastille de la liste Biens = le plus vieux loyer en retard ; "d'octobre" (élision) ; "Voir l'autre" ; dépôt "pas noté" ;
// noms entiers dans les listes ; déclaration d'occupation avec "C'est fait" sur l'accueil.
const { chromium } = require('playwright'); const fs = require('fs');
const src = fs.readFileSync(__dirname + '/test4.js', 'utf8');
let FAKE = fs.readFileSync(__dirname + '/test2.js', 'utf8').split('const FAKE = `')[1].split('`;')[0];
const mcpBlock = src.split("FAKE = FAKE.replace(/const mcp = \\{[\\s\\S]*?\\};\\n/, `")[1].split("`);")[0];
FAKE = FAKE.replace(/const mcp = \{[\s\S]*?\};\n/, mcpBlock);
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 360, height: 780 } }), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(FAKE); await p.goto('file://' + require('path').join(__dirname, '..', 'index.html')); await p.waitForTimeout(500);
  // un locataire qui doit un vieux mois mais a payé le mois en cours
  const x = await p.evaluate(() => { S = demo(); const b = S.baux.find(b => isActive(b));
    b.suiviDepuis = addM(CUR, -2); S.paiements = S.paiements.filter(p => p.bailId !== b.id);
    const e1 = echeance(b, addM(CUR, -1)), e0 = echeance(b, CUR);
    S.paiements.push({ id: 'p0', bailId: b.id, mois: addM(CUR, -2), montant: echeance(b, addM(CUR, -2)).du, date: iso(TODAY), mode: 'virement' }, { id: 'p1', bailId: b.id, mois: CUR, montant: e0.du, date: iso(TODAY), mode: 'virement' });
    save(); location.hash = 'biens'; render(); return { bien: b.bienId, bail: b.id }; });
  await p.waitForTimeout(300);
  const pill = await p.evaluate(id => { const li = [...document.querySelectorAll('#app .lr')].find(l => l.querySelector(`[onclick*="${id}"]`) || l.innerHTML.includes(id)); return li ? li.querySelector('.lr-r').innerText : ''; }, x.bien);
  ok(`Biens : mois en cours payé mais le mois d'avant en retard → "${pill.trim()}"`, /retard/i.test(pill) && !/Payé/.test(pill));
  ok('élision : "d\'octobre", "d\'avril", "d\'août", "de novembre"', await p.evaluate(() => deM('2026-10') === "d'octobre 2026" && deM('2026-04') === "d'avril 2026" && deM('2026-08') === "d'août 2026" && deM('2026-11') === 'de novembre 2026'));
  ok('aucun "de octobre" / "de avril" / "de août" dans le code des textes', !/\bde \$\{fm\(/.test(fs.readFileSync(__dirname + '/../index.html', 'utf8')));
  const ellipse = await p.evaluate(() => [...document.querySelectorAll('#app .lr-main .tx b')].some(el => el.scrollWidth > el.clientWidth + 1));
  ok('Biens à 360 px : noms entiers (pas coupés en "Appart Ago…")', !ellipse);
  await p.evaluate(id => { const bi = bien(id); delete bi.dpe; delete bi.surface; delete bi.pnoEcheance; delete bi.risquesVerifies; delete bi.prixAchat; delete bi.cp; go('bien-' + id); }, x.bien); await p.waitForTimeout(300);
  const autres = await p.evaluate(() => { const s = document.querySelector('#app .a-completer summary'); return s ? s.textContent : ''; });
  ok(`carte à compléter : pas de "Voir les 1 autres" (${autres})`, !/les 1 autres/.test(autres));
  await p.evaluate(id => { bail(id).depot = ''; go('bail-' + id); }, x.bail); await p.waitForTimeout(300);
  ok('dépôt non rempli : "pas noté" (pas 0,00 €)', await p.evaluate(() => /Dépôt de garantie[\s\S]{0,20}pas noté/.test(document.querySelector('#app').textContent)));
  const g = await p.evaluate(() => { const t = tacheGmbi(); return t && t.acts.map(a => a[0]); });
  ok('déclaration d\'occupation : "C\'est fait" proposé (si la tâche existe)', !g || g.some(a => /C'est fait/.test(a)));
  ok('aucune erreur', !errs.length); if (errs.length) console.log(errs);
  await b.close(); console.log(KO ? `\n${KO} échec(s)` : '\nTout est bon'); process.exit(KO ? 1 : 0);
})();

// Meublé au régime réel (LMNP) — mode local. Amortissements (logement sans terrain sur 30 ans, meubles sur 7 ans),
// plafond (jamais de perte par l'amortissement, report), perte de charges reportée, comparaison micro-BIC, dossier comptable.
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
  const r = await p.evaluate(() => {
    S = demo(); S.sci.forme = 'perso'; const Y = TODAY.getFullYear();
    const ba = S.baux.find(x => isActive(x)), bi = bien(ba.bienId);
    S.baux.forEach(x => { x.typeBail = 'vide'; }); ba.typeBail = 'meuble'; ba.dateEntree = (Y - 1) + '-01-01';
    S.biens.forEach(x => { delete x.prixAchat; delete x.lmnp; }); bi.prixAchat = 150000; bi.lmnp = { terrain: 15, meubles: 7000 };
    S.prets = []; S.depenses = S.depenses.filter(d => d.bienId !== bi.id);
    S.depenses.push({ id: 'd1', bienId: bi.id, categorie: 'Assurance propriétaire (PNO)', montant: 200, date: Y + '-03-01' }, { id: 'd2', bienId: bi.id, categorie: 'Taxe foncière', montant: 800, date: Y + '-10-15' });
    const am = amortLMNP(bi, Y), A = calculLMNP(Y);
    bi.lmnp.meubles = 50000; const B = calculLMNP(Y);
    bi.lmnp.meubles = 7000; S.depenses.push({ id: 'd3', bienId: bi.id, categorie: "Travaux d'entretien / réparation", montant: A.recettes + 3000, date: Y + '-06-01' }); const C = calculLMNP(Y);
    S.depenses = S.depenses.filter(d => d.id !== 'd3'); const N = calculLMNP(Y + 1);
    bi.lmnp.meubles = 7000; view.comptaOnglet = 'comptable'; location.hash = 'compta'; render();
    const d = document.createElement('div'); d.innerHTML = declaration2044(Y);
    return { am, A, B, C, N, ecran: d.innerText, micro: r2(A.recettes * .5), id: bi.id, Y };
  });
  const A = r.A;
  ok(`amortissements : logement ${r.am.bati} € (150 000 × 85 % ÷ 30 = 4 250), meubles ${r.am.meubles} € (7 000 ÷ 7)`, r.am.bati === 4250 && r.am.meubles === 1000);
  ok(`charges ${A.charges} € (PNO 200 + taxe 800), recettes ${A.recettes} €`, A.charges === 1000 && A.recettes > 0);
  const att = Math.max(0, Math.round((A.recettes - 1000 - Math.min(5250, A.recettes - 1000)) * 100) / 100);
  ok(`résultat au réel ${A.resultat} € (attendu ${att}) ; micro-BIC ${A.micro} €`, Math.abs(A.resultat - att) < 0.02 && A.micro === r.micro);
  ok(`gros amortissement : jamais de perte (résultat ${r.B.resultat}), le reste est reporté (${r.B.reportAmort} €)`, r.B.resultat === 0 && r.B.reportAmort > 0 && !r.B.deficitAn);
  ok(`charges plus grandes que les loyers : perte de ${r.C.deficitAn} € reportable, amortissement reporté (${r.C.reportAmort} €)`, Math.abs(r.C.deficitAn - 4000) < 0.02 && r.C.reportAmort >= 5250);
  ok(`l'année suivante reprend les reports (amortissement reporté de l'an passé : ${r.N.reportAmort} € ou utilisé)`, r.N && typeof r.N.reportAmort === 'number');
  ok('écran : duel micro-BIC / réel, verdict, réglages du logement, dossier comptable', /Micro-BIC/.test(r.ecran) && /Réel/.test(r.ecran) && /(réel te ferait payer moins|micro-BIC reste)/.test(r.ecran) && /Dossier pour le comptable/.test(r.ecran));
  ok('le réel est conseillé ici (moins imposé), avec l\'économie en euros', /réel te ferait payer moins/.test(r.ecran) && /d'impôts en moins/.test(r.ecran));
  // réglages : prix, terrain, meubles
  await p.evaluate(id => reglerLMNP(id), r.id); await p.waitForTimeout(200);
  await p.fill('#mform [name=terrain]', '20'); await p.fill('#mform [name=meubles]', '14000');
  await p.evaluate(() => document.getElementById('mform').requestSubmit()); await p.waitForTimeout(300);
  const g = await p.evaluate(([id, Y]) => ({ c: bien(id).lmnp, a: amortLMNP(bien(id), Y) }), [r.id, r.Y]);
  ok(`réglages enregistrés : terrain 20 %, meubles 14 000 € → logement ${g.a.bati} €, meubles ${g.a.meubles} €`, g.c.terrain === 20 && g.c.meubles === 14000 && g.a.bati === 4000 && g.a.meubles === 2000);
  await p.evaluate(Y => dossierLMNP(Y), r.Y); await p.waitForTimeout(400);
  const doss = await p.evaluate(() => document.getElementById('overlay').innerText); if (!/liasse/.test(doss)) console.log(await p.evaluate(() => document.getElementById('paper').innerHTML.slice(0, 300)));
  ok('dossier pour le comptable : par logement, charges, résultat, reports', /liasse 2031/i.test(doss) && /Amortissements reportés/i.test(doss) && /Charges par catégorie/i.test(doss));
  ok('"Prochaines sorties" : le meublé au réel n\'y est plus', await p.evaluate(() => !BIENTOT.some(x => x[0] === 'lmnp-reel')));
  ok('aucune erreur', !errs.length); if (errs.length) console.log(errs);
  await b.close(); console.log(KO ? `\n${KO} échec(s)` : '\nTout est bon'); process.exit(KO ? 1 : 0);
})();

// Trésorerie des 12 prochains mois : solde saisi, loyers attendus, prêts (tableau), taxe foncière en octobre,
// dépenses courantes moyennes ; message en grand ; seuil d'alerte → tâche dans À faire. Mode local, clair et sombre.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = __dirname + '/shots58'; fs.mkdirSync(OUT, { recursive: true });
const src = fs.readFileSync(__dirname + '/test4.js', 'utf8');
let FAKE = fs.readFileSync(__dirname + '/test2.js', 'utf8').split('const FAKE = `')[1].split('`;')[0];
const mcpBlock = src.split("FAKE = FAKE.replace(/const mcp = \\{[\\s\\S]*?\\};\\n/, `")[1].split("`);")[0];
FAKE = FAKE.replace(/const mcp = \{[\s\S]*?\};\n/, mcpBlock);
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const scheme of ['light', 'dark']) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
    p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
    await p.addInitScript(FAKE);
    await p.goto('file://' + path.join(__dirname, '..', 'index.html')); await p.waitForTimeout(600);
    // données simples : 1 logement, 1 bail 600 €/mois, dépenses courantes 1 200 € sur 12 mois (100 €/mois), taxe foncière 900 €
    await p.evaluate(() => { S = blank(); S.sci.nom = 'SCI Test'; S.biens = [{ id: 'b1', nom: 'Studio', adresse: '1 rue', cp: '35000', ville: 'Rennes' }];
      S.baux = [{ id: 'l1', bienId: 'b1', nom: 'Jean', typeBail: 'vide', dateEntree: addM(CUR, -14) + '-01', loyerHC: '550', charges: '50', jourPaiement: '5', revisions: [] }];
      for (let k = 1; k <= 12; k++) S.depenses.push({ id: 'd' + k, date: addM(CUR, -k) + '-10', montant: 100, categorie: "Charges de copropriété", bienId: 'b1' });
      S.depenses.push({ id: 'dt', date: addM(CUR, -3) + '-15', montant: 5000, categorie: "Travaux d'amélioration", bienId: 'b1' }); // ponctuel : pas compté
      S.taxes = [{ id: 't1', bienId: 'b1', annee: TODAY.getFullYear() - 1, total: 900, teom: 100, parts: [] }];
      save(); view.comptaOnglet = 'banque'; location.hash = 'compta'; render(); });
    await p.waitForTimeout(300);
    ok(`${scheme} : sans solde, on demande le solde du compte`, await p.isVisible('#treso_solde'));
    await p.fill('#treso_solde', '2000'); await p.click('text=Voir ma trésorerie'); await p.waitForTimeout(300);
    const T = await p.evaluate(() => { const t = tresorerie(); return { n: t.mois.length, cour: t.courantes, tf: t.tf, oct: t.mois.find(x => x.m.endsWith('-10')), m1: t.mois[1], dernier: t.mois[11].solde, prets: t.pretsMoyen }; });
    console.log(JSON.stringify(T));
    ok(`${scheme} : 12 mois, dépenses courantes 100 €/mois (travaux d'amélioration exclus)`, T.n === 12 && T.cour === 100);
    ok(`${scheme} : mois plein = +600 loyer −100 courantes`, T.m1.entrees === 600 && T.m1.courantes === 100 && T.m1.sorties === 100);
    ok(`${scheme} : taxe foncière 900 € en octobre`, T.oct && T.oct.taxe === 900);
    ok(`${scheme} : graphique de 12 barres + message en grand`, (await p.locator('.treso svg rect').count()) === 12 && await p.isVisible('.treso .gros-msg'));
    ok(`${scheme} : "Pas de trou prévu"`, /Pas de trou prévu/.test(await p.locator('.treso').innerText()));
    await p.locator('.treso').scrollIntoViewIfNeeded(); await p.screenshot({ path: `${OUT}/${scheme}-ok.png` });
    // seuil élevé : alerte + tâche
    await p.click('.treso-d summary'); await p.fill('#treso_seuil', '4000'); await p.click('.treso-d button:has-text("OK")'); await p.waitForTimeout(300);
    const txt = await p.locator('.treso').innerText();
    ok(`${scheme} : seuil 4 000 € → "pourrait passer sous 4 000,00 €"`, /pourrait passer sous 4\s?000,00/.test(txt));
    await p.locator('.treso').scrollIntoViewIfNeeded(); await p.screenshot({ path: `${OUT}/${scheme}-alerte.png` });
    await p.evaluate(() => { location.hash = 'afaire'; }); await p.waitForTimeout(300);
    ok(`${scheme} : tâche "Trésorerie" dans À faire`, /Trésorerie : ton compte pourrait passer sous/.test(await p.locator('#app').innerText()));
    // prêt avec tableau : remplace la moyenne
    const P2 = await p.evaluate(() => { S.prets = [{ id: 'p1', banque: 'CA', bienId: 'b1', montant: 100000, taux: 3, duree: 240, premiere: addM(CUR, -24) + '-05', assurance: 10, differe: 0 }]; save(); const t = tresorerie(); return { prets: t.mois[1].prets, mens: mensualitePret(S.prets[0]) }; });
    ok(`${scheme} : prêt saisi → mensualité du tableau chaque mois (${P2.prets} €)`, Math.abs(P2.prets - P2.mens) < 0.01 && P2.prets > 500);
    const perf = await p.evaluate(() => { const t0 = performance.now(); for (let i = 0; i < 20; i++) { taches(); } return (performance.now() - t0) / 20; });
    ok(`${scheme} : rapide (${perf.toFixed(1)} ms pour À faire)`, perf < 60);
    await p.close();
  }
  ok('aucune erreur JS (' + errs.join(' | ') + ')', !errs.length);
  await b.close(); console.log(KO ? `\n${KO} KO` : '\nTout OK'); process.exit(KO ? 1 : 0);
})();

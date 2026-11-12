// Mesure le temps d'affichage de chaque page, avec les données de démo puis 10 ans d'historique sur 25 locataires
const { chromium } = require('playwright');
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/test4.js', 'utf8');
let FAKE = fs.readFileSync(__dirname + '/test2.js', 'utf8').split('const FAKE = `')[1].split('`;')[0];
const mcpBlock = src.split("FAKE = FAKE.replace(/const mcp = \\{[\\s\\S]*?\\};\\n/, `")[1].split("`);")[0];
FAKE = FAKE.replace(/const mcp = \{[\s\S]*?\};\n/, mcpBlock);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(FAKE);
  await p.route('**/jspdf.umd.min.js', r => r.fulfill({ path: __dirname + '/vendor/jspdfpkg/package/dist/jspdf.umd.min.js', contentType: 'application/javascript' }));
  await p.goto('file://' + require('path').join(__dirname, '..', 'index.html')); await p.waitForTimeout(500);
  const mesure = async (titre, gros) => {
    const r = await p.evaluate(async ([gros, K, AN]) => {
      S = demo();
      if (gros) {
        const b0 = S.baux.slice(), bi0 = S.biens.slice();
        for (let k = 0; k < K; k++) bi0.forEach(x => S.biens.push({ ...x, id: x.id + 'k' + k, nom: x.nom + ' ' + k }));
        for (let k = 0; k < K; k++) b0.forEach(x => S.baux.push({ ...x, id: x.id + 'k' + k, bienId: x.bienId + 'k' + k, nom: x.nom + ' ' + k, dateEntree: AN + '-01-01', suiviDepuis: AN + '-01' }));
        S.baux.forEach(x => { x.dateEntree = AN + '-01-01'; x.suiviDepuis = AN + '-01'; });
        S.paiements = [];
        S.baux.forEach(x => { for (let m = AN + '-01'; m < CUR; m = addM(m, 1)) S.paiements.push({ id: x.id + m, bailId: x.id, mois: m, montant: (+x.loyer || 0) + (+x.charges || 0), date: m + '-03', mode: 'virement' }); });
        for (let i = 0; i < 150 * K; i++) S.depenses.push({ id: 'dp' + i, date: (+AN + i % 10) + '-0' + (1 + i % 9) + '-10', montant: 50 + i % 200, categorie: 'Entretien', bienId: S.biens[i % S.biens.length].id, libelle: 'Dépense ' + i });
      }
      save();
      const t = {}; const pages = ['', 'afaire', 'loyers', 'biens', 'docs', 'compta', 'reglages'];
      for (const h of pages) { location.hash = h; await new Promise(r => setTimeout(r, 50)); const t0 = performance.now(); render(); document.body.offsetHeight; t[h || 'accueil'] = Math.round(performance.now() - t0); }
      location.hash = 'bail-' + S.baux[0].id; await new Promise(r => setTimeout(r, 50)); let t0 = performance.now(); render(); t.fiche = Math.round(performance.now() - t0);
      return { t, baux: S.baux.length, paiements: S.paiements.length, depenses: S.depenses.length };
    }, [gros, +(process.env.K||6), process.env.AN||'2016']);
    console.log(titre, JSON.stringify(r));
  };
  await mesure('demo', false);
  let c; if (process.argv[2] === 'profil') { c = await p.context().newCDPSession(p); await c.send('Profiler.enable'); await c.send('Profiler.start'); }
  await mesure('gros', true);
  if (c) {
    const { profile } = await c.send('Profiler.stop');
    const self = {}; const dt = profile.timeDeltas; const byId = {}; profile.nodes.forEach(n => byId[n.id] = n);
    profile.samples.forEach((s, i) => { const n = byId[s]; const k = n.callFrame.functionName + ':' + n.callFrame.lineNumber; self[k] = (self[k] || 0) + (dt[i] || 0); });
    console.log(Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => k + ' ' + Math.round(v / 1000) + 'ms').join('\n'));
  }
  console.log('ERREURS', errs);
  await b.close();
})();

// Rangement automatique sans IA : 50 noms de fichiers réalistes (tests/corpus-rangement.json) devinés d'après le nom et le dossier.
// Les lignes marquées "pasAuto" sont douteuses : l'appli doit les proposer, pas les ranger toute seule.
// Mode local (espace de démonstration). Échec si un document serait rangé TOUT SEUL au mauvais endroit, ou si trop de mauvaises devinettes.
const { chromium } = require('playwright'); const fs = require('fs');
const src = fs.readFileSync(__dirname + '/test4.js', 'utf8');
let FAKE = fs.readFileSync(__dirname + '/test2.js', 'utf8').split('const FAKE = `')[1].split('`;')[0];
const mcpBlock = src.split("FAKE = FAKE.replace(/const mcp = \\{[\\s\\S]*?\\};\\n/, `")[1].split("`);")[0];
FAKE = FAKE.replace(/const mcp = \{[\s\S]*?\};\n/, mcpBlock);
const CORPUS = JSON.parse(fs.readFileSync(__dirname + '/corpus-rangement.json', 'utf8'));
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
(async () => {
  const b = await chromium.launch(), p = await b.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(FAKE); await p.goto('file://' + require('path').join(__dirname, '..', 'index.html')); await p.waitForTimeout(500);
  const res = await p.evaluate(C => { S = demo(); return C.map(([dossier, titre, cat, bienNom, pasAuto], i) => {
    const ch = dossier.split('/'), anc = ch.map((x, k) => 'D' + ch.slice(0, k + 1).join('/'));
    const g = deviner({ id: 'f' + i, titre, type: /\.jpg$/.test(titre) ? 'image/jpeg' : 'application/pdf', chemin: ch, ancetres: anc });
    return { dossier, titre, cat, bienNom, pasAuto, gCat: g.cat, gBien: g.bienId ? bien(g.bienId).nom : null, sur: g.sur };
  }); }, CORPUS);
  let bonCat = 0, bonBien = 0, surFaux = [];
  res.forEach(r => {
    const cOk = r.cat ? r.cat.split('|').includes(r.gCat) : !r.gCat, bOk = r.bienNom === r.gBien || (!r.bienNom && !r.gBien);
    if (cOk) bonCat++; if (bOk) bonBien++;
    if (r.sur && (!cOk || r.bienNom !== r.gBien || r.pasAuto)) surFaux.push(r);
    if (!cOk || !bOk) console.log(`   · ${r.dossier} › ${r.titre} : ${cOk ? '' : `type ${r.gCat || '?'} (attendu ${r.cat || 'rien'}) `}${bOk ? '' : `logement ${r.gBien || '?'} (attendu ${r.bienNom || 'rien'})`}`);
  });
  const n = res.length, auto = res.filter(r => r.sur).length;
  console.log(`   Type juste : ${bonCat}/${n} · logement juste : ${bonBien}/${n} · rangés tout seuls : ${auto}/${n}`);
  surFaux.forEach(r => console.log(`   ⚠ rangé tout seul au mauvais endroit : ${r.titre} → ${r.gBien} · ${r.gCat}`));
  ok('aucun document rangé tout seul au mauvais endroit', !surFaux.length);
  ok('type juste pour au moins 90 %', bonCat >= n * 0.9);
  ok('logement juste pour au moins 90 %', bonBien >= n * 0.9);
  ok('aucune erreur', !errs.length);
  await b.close(); console.log(KO ? `\n${KO} échec(s)` : '\nTout est bon'); process.exit(KO ? 1 : 0);
})();

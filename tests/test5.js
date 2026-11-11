const { chromium } = require('playwright');
const fs = require('fs');
const out = __dirname + '/shots5';
fs.mkdirSync(out, { recursive: true });
const src = fs.readFileSync(__dirname + '/test4.js', 'utf8');
let FAKE = fs.readFileSync(__dirname + '/test2.js', 'utf8').split('const FAKE = `')[1].split('`;')[0];
const mcpBlock = src.split("FAKE = FAKE.replace(/const mcp = \\{[\\s\\S]*?\\};\\n/, `")[1].split("`);")[0];
FAKE = FAKE.replace(/const mcp = \{[\s\S]*?\};\n/, mcpBlock);
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const route = r => r.fulfill({ path: __dirname + '/vendor/jspdfpkg/package/dist/jspdf.umd.min.js', contentType: 'application/javascript' });
  for (const [name, vp, scheme] of [['m', { width: 390, height: 844 }, 'light'], ['md', { width: 390, height: 844 }, 'dark'], ['d', { width: 1280, height: 860 }, 'light']]) {
    const p = await b.newPage({ viewport: vp, colorScheme: scheme });
    p.on('pageerror', e => errs.push(name + ':' + e.message)); p.on('console', m => m.type() === 'error' && errs.push(name + ':' + m.text()));
    await p.addInitScript(FAKE); await p.route('**/jspdf.umd.min.js', route);
    await p.goto('file://' + require('path').join(__dirname, '..', 'index.html') + ''); await p.waitForTimeout(500);
    await p.screenshot({ path: `${out}/${name}-0-bienvenue.png` });
    await p.evaluate(() => { S = demo(); S.baux[0].email = 'camille@test.fr'; save(); render(); }); await p.waitForTimeout(300);
    const shot = async (n, full = true) => { await p.waitForTimeout(250); await p.screenshot({ path: `${out}/${name}-${n}.png`, fullPage: full }); const sw = await p.evaluate(() => document.documentElement.scrollWidth); if (sw > vp.width) errs.push(`${name}-${n} overflow ${sw}`); };
    await shot('1-accueil');
    for (const h of ['afaire', 'biens', 'docs', 'compta', 'reglages', 'loyers']) { await p.evaluate(h => location.hash = h, h); await p.waitForTimeout(h === 'docs' ? 700 : 200); await shot('2-' + h); }
    const id = await p.evaluate(() => S.baux[3].id);
    await p.evaluate(id => location.hash = 'bail-' + id, id); await shot('3-fiche');
    if (name !== 'd') {
      await p.evaluate(() => editBail()); await shot('4-formbail', false);
      await p.evaluate(() => closeOverlay());
      await p.evaluate(id => revision(id), id); await shot('5-revision', false); await p.evaluate(() => closeOverlay());
      await p.evaluate(id => quittance(id, addM(CUR, -2)), id); await shot('6-quittance', false); await p.evaluate(() => closeOverlay());
      await p.evaluate(() => importerReleve()); await shot('7-releve', false); await p.evaluate(() => closeOverlay());
      await p.evaluate(id => documentsPour(id), id); await shot('8-docs-loc', false); await p.evaluate(() => closeOverlay());
      await p.evaluate(() => taxeFonciere(S.biens[2].id)); await shot('9-taxe', false); await p.evaluate(() => closeOverlay());
    }
  }
  console.log('ERRORS', errs);
  await b.close();
})();

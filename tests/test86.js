// Fermer une fenêtre en touchant à côté (2 fois si on a commencé à remplir) ; plus de bandeau de nouveautés sur l'accueil.
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path');
let FAKE = fs.readFileSync(__dirname + '/test2.js', 'utf8').split('const FAKE = `')[1].split('`;')[0];
const src = fs.readFileSync(__dirname + '/test4.js', 'utf8');
FAKE = FAKE.replace(/const mcp = \{[\s\S]*?\};\n/, src.split("FAKE = FAKE.replace(/const mcp = \\{[\\s\\S]*?\\};\\n/, `")[1].split("`);")[0]);
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const dev of ['iPhone 13', 'Desktop Chrome']) {
    const c = await b.newContext({ ...devices[dev] }); const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.route(/accounts\.google\.com/, r => r.abort()); await p.addInitScript(FAKE);
    await p.goto('file://' + path.join(__dirname, '..', 'index.html')); await p.waitForTimeout(500);
    await p.evaluate(() => { S = demo(); save(); location.hash = 'locataires'; render(); }); await p.waitForTimeout(300);
    const ouverte = () => p.evaluate(() => !document.getElementById('overlay').hidden);
    const aCote = async () => { const box = await p.evaluate(() => { const m = document.querySelector('#overlay > *').getBoundingClientRect(); return { x: 8, y: Math.max(8, m.top - 20) }; }); await p.mouse.click(box.x, box.y); await p.waitForTimeout(250); };
    // fenêtre simple
    await p.evaluate(() => editRappel()); await p.waitForTimeout(250);
    await aCote(); ok(dev + ' : toucher à côté ferme la fenêtre', !(await ouverte()));
    // fenêtre commencée
    await p.evaluate(() => editRappel()); await p.waitForTimeout(250);
    await p.fill('#mform input[name=titre]', 'Appeler le syndic');
    await aCote(); ok(dev + ' : formulaire commencé : 1er toucher à côté ne ferme pas', await ouverte());
    ok(dev + ' : et le dit', await p.evaluate(() => /touche encore à côté/.test((document.getElementById('toast') || {}).textContent || '')));
    await aCote(); ok(dev + ' : 2e toucher à côté ferme', !(await ouverte()));
    ok(dev + ' : rien enregistré', await p.evaluate(() => !S.rappels.some(r => r.titre === 'Appeler le syndic')));
    // toucher dans la fenêtre ne ferme pas ; glisser de l'intérieur vers l'extérieur non plus
    await p.evaluate(() => editRappel()); await p.waitForTimeout(250);
    await p.click('#overlay .modal h2'); await p.waitForTimeout(200); ok(dev + ' : toucher dans la fenêtre ne ferme pas', await ouverte());
    const m = await p.evaluate(() => { const r = document.querySelector('#overlay .modal h2').getBoundingClientRect(); return { x: r.left + 5, y: r.top + 5 }; });
    await p.mouse.move(m.x, m.y); await p.mouse.down(); await p.mouse.move(5, 5); await p.mouse.up(); await p.waitForTimeout(200);
    ok(dev + ' : glisser depuis la fenêtre ne ferme pas', await ouverte());
    await p.evaluate(() => closeOverlay());
    // confirmation : toucher à côté = annuler
    let oui = false; await p.exposeFunction('__oui' + dev.replace(/\W/g, ''), () => { oui = true; });
    await p.evaluate(n => confirmer('Supprimer ?', () => window[n]()), '__oui' + dev.replace(/\W/g, '')); await p.waitForTimeout(200);
    await aCote(); ok(dev + ' : confirmation fermée à côté = rien fait', !(await ouverte()) && !oui);
    // accueil : pas de bandeau de nouveautés
    ok(dev + ' : pas de bandeau nouveautés sur l\'accueil', await p.evaluate(() => !document.querySelector('.nv-bandeau')));
    await c.close();
  }
  ok('aucune erreur JavaScript', !errs.length); if (errs.length) console.log(errs);
  await b.close(); console.log(KO ? `\n${KO} échec(s)` : '\nTout est bon'); process.exit(KO ? 1 : 0);
})();

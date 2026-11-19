// Fluidité : bouton retour = fermer la fenêtre ; pas de redessin inutile ; blocs ouverts gardés ouverts ; pas de "Lecture de ton Drive" sans Drive.
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path');
let FAKE = fs.readFileSync(__dirname + '/test2.js', 'utf8').split('const FAKE = `')[1].split('`;')[0];
const src = fs.readFileSync(__dirname + '/test4.js', 'utf8');
FAKE = FAKE.replace(/const mcp = \{[\s\S]*?\};\n/, src.split("FAKE = FAKE.replace(/const mcp = \\{[\\s\\S]*?\\};\\n/, `")[1].split("`);")[0]);
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const dev of ['iPhone 13', 'Pixel 7']) {
    const c = await b.newContext({ ...devices[dev] }); const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.route(/accounts\.google\.com/, r => r.abort()); await p.addInitScript(FAKE);
    await p.goto('file://' + path.join(__dirname, '..', 'index.html') + '#locataires'); await p.waitForTimeout(500);
    await p.evaluate(() => { S = demo(); save(); render(); }); await p.waitForTimeout(200);
    await p.evaluate(() => { location.hash = 'biens'; }); await p.waitForTimeout(300);
    const id = await p.evaluate(() => S.biens[0].id);
    await p.evaluate(id => { location.hash = 'bien-' + id; }, id); await p.waitForTimeout(300);
    await p.evaluate(() => editRappel()); await p.waitForTimeout(300);
    await p.goBack(); await p.waitForTimeout(400);
    ok(dev + ' : retour avec une fenêtre ouverte = la fenêtre se ferme, on reste sur la page', await p.evaluate(id => document.getElementById('overlay').hidden && location.hash === '#bien-' + id, id));
    // deux fenêtres à la suite, puis retour
    await p.evaluate(() => editRappel()); await p.waitForTimeout(200); await p.evaluate(() => closeOverlay()); await p.evaluate(() => editBien()); await p.waitForTimeout(300);
    await p.goBack(); await p.waitForTimeout(400);
    ok(dev + ' : 2e fenêtre aussi fermée par retour', await p.evaluate(() => document.getElementById('overlay').hidden));
    await p.goBack(); await p.waitForTimeout(400);
    ok(dev + ' : sans fenêtre, retour = page précédente (Biens)', await p.evaluate(() => location.hash === '#biens'));
    // pas de redessin si rien ne change
    await p.evaluate(() => { location.hash = 'afaire'; }); await p.waitForTimeout(300);
    const n = await p.evaluate(() => { let k = 0; const mo = new MutationObserver(() => k++); mo.observe(document.getElementById('app'), { childList: true }); render(); render(); render(); return new Promise(r => setTimeout(() => { mo.disconnect(); r(k); }, 100)); });
    ok(dev + ' : 3 render() sans changement = 0 redessin', n === 0);
    // un bloc ouvert reste ouvert après une mise à jour qui change la page
    const ouvert = await p.evaluate(() => { const d = document.querySelector('details.grp-t, details.surv'); if (!d) return 'aucun bloc'; d.open = true; S.rappels.push({ id: 'zz', titre: 'Test fluidité', date: iso(TODAY), fait: false }); render(); const k = x => x.querySelector('summary').textContent.replace(/[^A-Za-zÀ-ÿ]+/g, ' ').trim().slice(0, 30), avant = k(d); const d2 = [...document.querySelectorAll('details.grp-t, details.surv')].find(x => k(x) === avant); return d2 ? d2.open : 'disparu'; });
    ok(dev + ' : bloc ouvert gardé ouvert après mise à jour (' + ouvert + ')', ouvert === true);
    // changer de page referme bien les blocs (pas d'ouverture fantôme)
    await p.evaluate(() => { location.hash = 'biens'; }); await p.waitForTimeout(300); await p.evaluate(() => { location.hash = 'afaire'; }); await p.waitForTimeout(300);
    ok(dev + ' : en revenant sur la page, les blocs sont repliés', await p.evaluate(() => ![...document.querySelectorAll('details.grp-t')].some(d => d.open)));
    // toucher : pas de zoom sur double toucher
    ok(dev + ' : boutons sans zoom au double toucher', await p.evaluate(() => getComputedStyle(document.querySelector('button')).touchAction === 'manipulation'));
    await c.close();
  }
  ok('aucune erreur JavaScript', !errs.length); if (errs.length) console.log(errs);
  await b.close(); console.log(KO ? `\n${KO} échec(s)` : '\nTout est bon'); process.exit(KO ? 1 : 0);
})();

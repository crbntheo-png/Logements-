// Signature au doigt : bouton Signer sur le bail, dessin au doigt (souris simulée), 2 signataires,
// signature visible dans le document et dans le PDF (image), refus sans dessin / sans nom, Échap ferme seulement la zone. Mode local.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = __dirname + '/shots53'; fs.mkdirSync(OUT, { recursive: true });
const src = fs.readFileSync(__dirname + '/test4.js', 'utf8');
let FAKE = fs.readFileSync(__dirname + '/test2.js', 'utf8').split('const FAKE = `')[1].split('`;')[0];
const mcpBlock = src.split("FAKE = FAKE.replace(/const mcp = \\{[\\s\\S]*?\\};\\n/, `")[1].split("`);")[0];
FAKE = FAKE.replace(/const mcp = \{[\s\S]*?\};\n/, mcpBlock);
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
async function dessiner(p) {
  const bx = await p.locator('#sigZone').boundingBox();
  await p.mouse.move(bx.x + 30, bx.y + 120); await p.mouse.down();
  for (let i = 1; i <= 20; i++) await p.mouse.move(bx.x + 30 + i * 12, bx.y + 120 - Math.sin(i / 2) * 50);
  await p.mouse.up();
}
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const scheme of ['light', 'dark']) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
    p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
    await p.addInitScript(FAKE);
    await p.route('**/jspdf.umd.min.js', r => r.fulfill({ path: __dirname + '/vendor/jspdfpkg/package/dist/jspdf.umd.min.js', contentType: 'application/javascript' }));
    await p.goto('file://' + path.join(__dirname, '..', 'index.html')); await p.waitForTimeout(600);
    const bid = await p.evaluate(() => { S = demo(); save(); render(); const b = S.baux[0]; docBailOpen(b.id); return b.id; });
    await p.waitForTimeout(300);
    ok(`${scheme} : bouton Signer sur le bail`, await p.locator('#dsigner').isVisible());
    // pas de bouton sur une quittance (pas de bloc de signature)
    await p.locator('#dsigner').click(); await p.waitForTimeout(200);
    const roles = await p.$$eval('.sig-liste li b', l => l.map(x => x.textContent));
    ok(`${scheme} : 2 signataires (${roles.join(' / ')})`, roles.length === 2 && /bailleur/i.test(roles[0]) && /locataire/i.test(roles[1]));
    await p.locator('.sig-liste li').nth(0).locator('button').click(); await p.waitForTimeout(200);
    await p.locator('#sigOk').click(); await p.waitForTimeout(150);
    ok(`${scheme} : refus sans dessin`, await p.locator('#sigZone').isVisible());
    await dessiner(p);
    await p.screenshot({ path: `${OUT}/${scheme}-dessin.png` });
    await p.locator('#sigOk').click(); await p.waitForTimeout(200);
    ok(`${scheme} : bailleur signé`, (await p.locator('.sig-liste li').nth(0).innerText()).includes('signé par'));
    await p.locator('.sig-liste li').nth(1).locator('button').click(); await p.waitForTimeout(200);
    const nomLoc = await p.inputValue('#sigNom');
    ok(`${scheme} : nom du locataire prérempli (${nomLoc})`, nomLoc.length > 1);
    await p.fill('#sigNom', ''); await dessiner(p); await p.locator('#sigOk').click(); await p.waitForTimeout(150);
    ok(`${scheme} : refus sans nom`, await p.locator('#sigZone').isVisible());
    await p.fill('#sigNom', nomLoc); await p.locator('#sigOk').click(); await p.waitForTimeout(200);
    const txt = await p.locator('#sigpad').innerText();
    ok(`${scheme} : "Tout le monde a signé"`, /Tout le monde a signé/.test(txt));
    ok(`${scheme} : mode local = télécharger (pas de rangement)`, /Télécharge ou partage/.test(txt));
    await p.screenshot({ path: `${OUT}/${scheme}-panneau.png` });
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    ok(`${scheme} : Échap ferme la zone, le document reste`, !(await p.locator('#sigpad').count()) && await p.locator('#paper').isVisible());
    const r = await p.evaluate(() => ({ imgs: document.querySelectorAll('#paper img.sig-img').length, lu: /Lu et approuvé\. Signé sur écran par/.test(document.getElementById('paper').innerText), bouton: document.getElementById('dsigner').innerText }));
    ok(`${scheme} : 2 signatures dans le document, "lu et approuvé"`, r.imgs === 2 && r.lu);
    ok(`${scheme} : bouton devient "Signé (2)"`, /Signé \(2\)/.test(r.bouton));
    await p.locator('#paper .sign').scrollIntoViewIfNeeded(); await p.screenshot({ path: `${OUT}/${scheme}-document.png` });
    const pdf = await p.evaluate(() => { const d = fairePdf(CURDOC.html, []); const s = d.output(); return { images: (s.match(/\/Subtype \/Image/g) || []).length, texte: /Sign/.test(s), pages: d.getNumberOfPages() }; });
    ok(`${scheme} : PDF avec les 2 images de signature (${pdf.images} images, ${pdf.pages} pages)`, pdf.images >= 2);
    const pdf0 = await p.evaluate(() => { const d = fairePdf(CURDOC.base, []); return (d.output().match(/\/Subtype \/Image/g) || []).length; });
    ok(`${scheme} : PDF non signé sans image`, pdf0 === 0);
    // quittance : pas de bouton Signer
    await p.evaluate(() => { closeOverlay(); const b = S.baux[0]; const d = docQuittance(b.id, CUR) || docQuittance(b.id, S.paiements[0] && S.paiements[0].mois); if (d) showDoc(d.html, d.o); }); await p.waitForTimeout(200);
    ok(`${scheme} : pas de bouton Signer sur une quittance`, (await p.locator('#dsigner').count()) === 0);
    // état des lieux et avenant ont aussi le bouton
    const autres = await p.evaluate(() => { const r = {}; closeOverlay(); const b0 = S.baux[0]; nouvelEdl(b0.id, 'sortie'); const e = S.edl[S.edl.length - 1]; closeOverlay(); if (e) { docEdl(e.id); r.edl = !!document.getElementById('dsigner'); closeOverlay(); } const bp = S.baux.find(b => planEtat(b)); if (bp) { docPlan(bp.id); r.plan = !!document.getElementById('dsigner'); closeOverlay(); } else r.plan = 'absent'; return r; });
    ok(`${scheme} : bouton aussi sur état des lieux (${autres.edl}) et plan d'apurement (${autres.plan})`, autres.plan !== false && autres.edl !== false);
    await p.close();
  }
  ok('aucune erreur JS (' + errs.join(' | ') + ')', !errs.length);
  await b.close(); console.log(KO ? `\n${KO} KO` : '\nTout OK'); process.exit(KO ? 1 : 0);
})();

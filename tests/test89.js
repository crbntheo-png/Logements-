// Un papier qui arrive dans un logement est lu tout de suite (texte du PDF, sans IA) et propose de remplir la fiche.
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist');
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'application/javascript' : 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(8093);
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
const DPE = `<html><body style="font:14px Arial;padding:30px"><h1>DIAGNOSTIC DE PERFORMANCE ÉNERGÉTIQUE</h1><p>N° ADEME : 2635E7654321Y</p><p>Établi le : 02/05/2024</p><p>Surface habitable : 52 m²</p><p>Classe énergie : C</p><p>Classe climat (GES) : A</p>${'<p>Diagnostic établi conformément à la réglementation en vigueur relative aux logements mis en location.</p>'.repeat(5)}</body></html>`;
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const gen = await b.newPage(); await gen.setContent(DPE); const pdf = (await gen.pdf({ format: 'A4' })).toString('base64'); await gen.close();
  const p = await (await b.newContext({ ...devices['iPhone 13'], ignoreHTTPSErrors: true, serviceWorkers: 'block' })).newPage();
  p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
  await p.route('**/pdf.js/3.11.174/pdf.min.js', r => r.fulfill({ path: __dirname + '/vendor/pdfjs/pdf.min.js', contentType: 'application/javascript' }));
  await p.route('**/pdf.js/3.11.174/pdf.worker.min.js', r => r.fulfill({ path: __dirname + '/vendor/pdfjs/pdf.worker.min.js', contentType: 'application/javascript' }));
  let ia = 0; p.on('request', r => { if (/functions\/v1\/ia/.test(r.url()) && r.method() === 'POST' && !/"credits"/.test(r.postData() || '')) ia++; });
  await p.goto('http://localhost:8093/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test Arrivée'); await p.click('#esp_btn'); await p.waitForTimeout(3000);
  try {
    await p.evaluate(() => { S.biens.push({ id: 'b1', nom: 'Appart Test', type: 'Appartement', meuble: 'vide' }); save(); location.hash = 'bien-b1'; render(); }); await p.waitForTimeout(800);
    await p.evaluate(async b64 => { const f = new File([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], 'DPE appart.pdf', { type: 'application/pdf' }); await envoyerDocument('b1', { cat: 'Diagnostics (DPE…)', nom: '', bailId: '' }, f); }, pdf);
    await p.waitForFunction(() => /Ton nouveau papier peut remplir la fiche/.test((document.querySelector('#overlay h2') || {}).textContent || ''), null, { timeout: 60000 }).catch(() => {});
    const t = await p.evaluate(() => document.getElementById('overlay').innerText);
    ok('proposition toute seule après l\'ajout', /Ton nouveau papier peut remplir la fiche/.test(t));
    ok('surface 52 m² et DPE C proposés', /Surface : 52 m²/.test(t) && /Classe DPE : C/.test(t));
    ok('sans IA', ia === 0);
    await p.click('#mform button.primary'); await p.waitForTimeout(600);
    ok('enregistré', await p.evaluate(() => +bien('b1').surface === 52 && bien('b1').dpe === 'C' && bien('b1').dpeGes === 'A'));
  } finally { await p.evaluate(async () => { await SB.from('espaces').delete().eq('id', ESPACE); }); }
  ok('aucune erreur JavaScript', !errs.length); if (errs.length) console.log(errs);
  await b.close(); srv.close(); console.log(KO ? `\n${KO} échec(s)` : '\nTout est bon'); process.exit(KO ? 1 : 0);
})();

// Vraie IA : un DPE donné dans "Nouveau logement" remplit adresse, surface, pièces et DPE (compte de test, aucun espace créé).
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist');
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'application/javascript' : 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(8099);
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
const DPE = `<html><body style="font:14px Arial;padding:30px"><h1>DIAGNOSTIC DE PERFORMANCE ÉNERGÉTIQUE (logement)</h1><p>N° ADEME : 2635E1234567X</p><p>Établi le : 12/03/2025 – Valable jusqu'au : 11/03/2035</p><p>Adresse : 41 rue de Beauchamps, 35000 Rennes – Appartement T2 (2 pièces), surface habitable 38 m²</p><p><b>Classe énergie : E</b> – <b>Classe climat (GES) : B</b></p></body></html>`;
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const gen = await b.newPage(); await gen.setContent(DPE); const pdf = (await gen.pdf({ format: 'A4' })).toString('base64'); await gen.close();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true, serviceWorkers: 'block' })).newPage();
  p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(3000);
  ok('connecté dans un espace dont il est propriétaire', await p.evaluate(() => !!ESPACE && estProprio()));
  console.log(await p.evaluate(() => ({ sb: !!SB, mcp: typeof MCP !== 'undefined' ? MCP : 'undef', prop: estProprio(), lect: LECTURE })));
  await p.evaluate(b64 => { window.__f = new File([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], 'dpe.pdf', { type: 'application/pdf' }); choisirFichier = async () => window.__f; editBien(); }, pdf);
  await p.waitForTimeout(300);
  ok('bouton "Remplir avec un document" visible', await p.evaluate(() => /Remplir avec un document/.test((document.querySelector('#overlay .auto-aide button') || {}).textContent || '')));
  await p.click('#overlay .auto-aide button');
  await p.waitForFunction(() => /Rempli|pas trouvé|impossible|IA/.test(document.getElementById('bienLu').textContent) && !/lit le document/.test(document.getElementById('bienLu').textContent), null, { timeout: 120000 });
  const r = await p.evaluate(() => { const f = document.getElementById('mform'); return { msg: document.getElementById('bienLu').textContent, adr: f.adresse.value, cp: f.cp.value, ville: f.ville.value, surf: f.surface.value, pieces: f.pieces.value, dpe: f.dpe.value, num: f.dpeNumero.value, nom: f.nom.value }; });
  console.log(r);
  ok('adresse lue', /Beauchamps/i.test(r.adr) && r.cp === '35000');
  ok('surface 38 m² lue', +r.surf === 38); ok('2 pièces', +r.pieces === 2); ok('DPE E, numéro', r.dpe === 'E' && r.num === '2635E1234567X'); ok('nom proposé', /Rennes/.test(r.nom));
  await p.evaluate(() => closeOverlay()); // rien enregistré
  ok('aucune erreur JavaScript', !errs.length); if (errs.length) console.log(errs);
  await b.close(); srv.close(); console.log(KO ? `\n${KO} échec(s)` : '\nTout est bon'); process.exit(KO ? 1 : 0);
})();

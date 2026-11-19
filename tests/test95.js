// Rangement automatique d'après le CONTENU (sans IA) : des PDF au nom muet ("Scan0001.pdf") sont lus et rangés dans le bon logement.
// Vraie base, compte de test, espace temporaire ; Drive simulé (les PDF sont fabriqués par le test). Aucune lecture IA.
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist');
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'application/javascript' : 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(8095);
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
const page = corps => `<html><body style="font:14px Arial;padding:30px">${corps}</body></html>`;
const PDFS = {
  s1: page(`<p>SCI TEST · 12 rue des Lilas, 75011 Paris</p><h1>CONTRAT DE LOCATION</h1><p>Logement nu à usage d'habitation principale</p><p>Entre le bailleur : SCI TEST, 12 rue des Lilas 75011 Paris</p><p>Et le locataire : Camille MARTIN</p><p>Désignation : appartement situé 3 rue de la Mer, 50230 Agon-Coutainville, 2e étage.</p><p>Loyer mensuel : 520 euros.</p>`),
  s2: page(`<p>PLOMBERIE DUPONT · 4 rue des Artisans 95250 Beauchamp</p><h1>FACTURE N° 2026-118</h1><p>Client : SCI TEST, 12 rue des Lilas 75011 Paris</p><p>Chantier : 5 allée des Tilleuls, 95250 Beauchamp</p><p>Remplacement chauffe-eau</p><p>TOTAL TTC 660,00 €</p>`),
  s3: page(`<p>ÉLEC SERVICES · 9 avenue Foch 75016 Paris</p><h1>FACTURE N° 77</h1><p>Client : SCI TEST, 12 rue des Lilas 75011 Paris</p><p>Contrôle annuel</p><p>TOTAL TTC 90,00 €</p>`),
  s4: page(`<h1>Notes diverses</h1><p>Penser à rappeler la banque mardi.</p>`)
};
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const B64 = {}; const gen = await b.newPage(); for (const [k, h] of Object.entries(PDFS)) { await gen.setContent(h); B64[k] = (await gen.pdf({ format: 'A4' })).toString('base64'); } await gen.close();
  const p = await (await b.newContext({ ...devices['iPhone 13'], ignoreHTTPSErrors: true, serviceWorkers: 'block' })).newPage();
  p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
  await p.route('**/pdf.js/3.11.174/pdf.min.js', r => r.fulfill({ path: __dirname + '/vendor/pdfjs/pdf.min.js', contentType: 'application/javascript' }));
  await p.route('**/pdf.js/3.11.174/pdf.worker.min.js', r => r.fulfill({ path: __dirname + '/vendor/pdfjs/pdf.worker.min.js', contentType: 'application/javascript' }));
  let ia = 0; p.on('request', r => { if (/functions\/v1\/ia/.test(r.url()) && r.method() === 'POST' && !/"credits"/.test(r.postData() || '')) ia++; });
  await p.goto('http://localhost:8095/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test Contenu'); await p.click('#esp_btn'); await p.waitForTimeout(3000);
  try {
    await p.evaluate(B64 => {
      S.sci.siege = '12 rue des Lilas, 75011 Paris';
      S.biens.push({ id: 'b1', nom: 'Appart Agon 1', type: 'Appartement', adresse: '3 rue de la Mer', cp: '50230', ville: 'Agon-Coutainville' }, { id: 'b2', nom: 'Maison Beauchamp', type: 'Maison', adresse: '5 allée des Tilleuls', cp: '95250', ville: 'Beauchamp' }, { id: 'b3', nom: 'Studio Lilas', type: 'Studio', adresse: '12 rue des Lilas', cp: '75011', ville: 'Paris' });
      S.baux.push({ id: 'l1', bienId: 'b1', nom: 'Camille Martin', dateEntree: '2025-01-01', loyerHC: 520, charges: 0 });
      save();
      const f = (id, titre) => ({ id, titre, type: 'application/pdf', partage: true, lien: 'https://drive.google.com/file/d/' + id + '/view', modif: '2026-11-01', chemin: ['Papiers'], ancetres: ['R1'], racine: 'R1', taille: 30000 });
      PARTAGE = { etat: 'pret', adresse: 'lecture@exemple.iam', racines: [{ dossier: 'R1', nom: 'Papiers' }] };
      DOCS = { etat: 'pret', n: 5, dossiers: { R1: { titre: 'Papiers', chemin: ['Papiers'], ancetres: [] } }, fichiers: [f('ID_S1_aaaaaaaaaaaaaaaaaaaaaaaaa', 'Scan0001.pdf'), f('ID_S2_aaaaaaaaaaaaaaaaaaaaaaaaa', 'Document (3).pdf'), f('ID_S3_aaaaaaaaaaaaaaaaaaaaaaaaa', 'Scan0003.pdf'), f('ID_S4_aaaaaaaaaaaaaaaaaaaaaaaaa', 'Scan0004.pdf'), f('ID_OK_aaaaaaaaaaaaaaaaaaaaaaaaa', 'Bail Camille Martin.pdf')] };
      window.TELECH = [];
      blobDrive = async x => { TELECH.push(x.id); const k = 's' + x.id[4]; return new Blob([Uint8Array.from(atob(B64[k]), c => c.charCodeAt(0))], { type: 'application/pdf' }); };
      location.hash = 'docs'; render();
    }, B64);
    await p.waitForTimeout(500);
    const n0 = await p.evaluate(() => rangerAuto('test'));
    ok('par le nom : "Bail Camille Martin.pdf" rangé tout seul', n0 === 1 && await p.evaluate(() => S.fichiers.some(f => f.titreDrive === 'Bail Camille Martin.pdf' && f.bienId === 'b1' && f.bailId === 'l1')));
    await p.evaluate(() => { window.MANUEL = 0; window.PARAPPLI = 0; const s0 = save; save = function () { if (AUTO) PARAPPLI++; else MANUEL++; return s0.apply(this, arguments); }; });
    const n = await p.evaluate(() => lireContenusDrive());
    ok('enregistré comme "🤖 L\'appli" (saveAuto), jamais comme une action de l\'utilisateur', await p.evaluate(() => PARAPPLI >= 1 && MANUEL === 0));
    const tele = await p.evaluate(() => TELECH);
    ok('seuls les 4 PDF au nom muet sont ouverts', n === 4 && tele.length === 4 && !tele.includes('ID_OK_aaaaaaaaaaaaaaaaaaaaaaaaa'));
    const F = await p.evaluate(() => S.fichiers.map(f => ({ t: f.titreDrive, bien: f.bienId, cat: f.cat, bail: f.bailId, auto: f.auto })));
    const de = t => F.find(f => f.t === t) || {};
    ok('Scan0001 (un bail) → Appart Agon 1, Bail, Camille Martin', de('Scan0001.pdf').bien === 'b1' && de('Scan0001.pdf').cat === 'Bail' && de('Scan0001.pdf').bail === 'l1' && de('Scan0001.pdf').auto);
    ok('Document (3) (facture, chantier 5 allée des Tilleuls) → Maison Beauchamp, Factures', de('Document (3).pdf').bien === 'b2' && de('Document (3).pdf').cat === 'Factures et travaux');
    ok('Scan0003 (facture avec seulement l\'adresse de la SCI) : PAS rangé dans Studio Lilas', !de('Scan0003.pdf').bien);
    ok('Scan0004 (rien de reconnaissable) : pas rangé', !de('Scan0004.pdf').bien);
    ok('toast "rangés automatiquement" avec Annuler', await p.evaluate(() => /rangés? automatiquement/.test(document.getElementById('toast').innerText) && /Annuler/.test(document.getElementById('toast').innerText)));
    const n2 = await p.evaluate(() => lireContenusDrive());
    ok('2e passage : rien n\'est relu (gardé sur l\'appareil)', n2 === 0 && (await p.evaluate(() => TELECH.length)) === 4);
    await p.evaluate(() => { location.hash = 'docs'; view.docVue = ''; render(); }); await p.waitForTimeout(400);
    await p.screenshot({ path: __dirname + '/shots95-docs.png', fullPage: true });
    // annuler le rangement automatique : les documents restent proposés, plus jamais rangés tout seuls
    await p.evaluate(() => annulerLot(S.sci.driveLots[0].id)); await p.waitForTimeout(300);
    ok('Annuler retire les documents rangés par le contenu', await p.evaluate(() => !S.fichiers.some(f => /^Scan0001|^Document/.test(f.titreDrive || ''))));
    ok('… et ils ne sont pas rangés de nouveau tout seuls', (await p.evaluate(() => rangerAuto('test'))) === 0);
    ok('… mais restent proposés (avec "d\'après ce qui est écrit dedans")', await p.evaluate(() => { render(); return /écrit dedans/.test(document.body.innerText); }));
    ok('le texte lu est effacé à la déconnexion', await p.evaluate(() => { const k = 'gestion-drive-contenu-' + ESPACE; const avant = !!localStorage.getItem(k); oublierCache(); return avant && !localStorage.getItem(k); }));
    ok('sans IA', ia === 0);
  } finally { await p.evaluate(async () => { await SB.from('espaces').delete().eq('id', ESPACE); }); }
  ok('aucune erreur JavaScript', !errs.length); if (errs.length) console.log(errs);
  await b.close(); srv.close(); console.log(KO ? `\n${KO} échec(s)` : '\nTout est bon'); process.exit(KO ? 1 : 0);
})();

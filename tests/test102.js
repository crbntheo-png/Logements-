// Relevé de banque en PDF (lu sans IA) ou en photo (lu par l'IA, simulée ici) — mode local, espace d'exemple, iPhone 13.
// Relevé PDF fabriqué comme celui d'une banque : colonnes Date / Date valeur / Opération / Débit / Crédit, libellés sur 2 lignes,
// ancien et nouveau solde (à ignorer). Vérifie : opérations trouvées, signes justes (colonne), libellé complet, loyer reconnu, soldes ignorés.
const { chromium, devices } = require('playwright'); const fs = require('fs'), path = require('path');
const src = fs.readFileSync(__dirname + '/test4.js', 'utf8');
let FAKE = fs.readFileSync(__dirname + '/test2.js', 'utf8').split('const FAKE = `')[1].split('`;')[0];
const mcpBlock = src.split("FAKE = FAKE.replace(/const mcp = \\{[\\s\\S]*?\\};\\n/, `")[1].split("`);")[0];
FAKE = FAKE.replace(/const mcp = \{[\s\S]*?\};\n/, mcpBlock);
const OUT = __dirname + '/shots102'; fs.mkdirSync(OUT, { recursive: true });
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(FAKE); await p.goto('file://' + path.join(__dirname, '..', 'index.html')); await p.waitForTimeout(500);
  await p.route('**/pdf.js/3.11.174/pdf.min.js', r => r.fulfill({ path: __dirname + '/vendor/pdfjs/pdf.min.js', contentType: 'application/javascript' }));
  await p.route('**/pdf.js/3.11.174/pdf.worker.min.js', r => r.fulfill({ path: __dirname + '/vendor/pdfjs/pdf.worker.min.js', contentType: 'application/javascript' }));
  // un locataire de l'exemple qui doit un loyer : le relevé contient son virement
  const due = await p.evaluate(() => { S = demo(); render(); const e = toutesEcheances(CUR).filter(e => e.statut !== 'paye' && e.reste > 0).sort((a, b) => a.m.localeCompare(b.m))[0]; return { nom: e.b.nom, reste: e.reste, m: e.m, id: e.b.id }; });
  const fr = v => v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const [y, mo] = due.m.split('-'), d = j => `${String(j).padStart(2, '0')}/${mo}/${y}`;
  const nomMaj = due.nom.toUpperCase();
  const gen = await b.newPage();
  await gen.setContent(`<html><body style="font:11px Arial;padding:20px"><h3>CIC — RELEVÉ DE COMPTE COURANT du 01/${mo}/${y} au 30/${mo}/${y}</h3>
    <table style="width:100%;border-collapse:collapse" cellpadding="3"><tr><th style="text-align:left">Date</th><th style="text-align:left">Date valeur</th><th style="text-align:left;width:50%">Opération</th><th style="text-align:right">Débit</th><th style="text-align:right">Crédit</th></tr>
    <tr><td></td><td></td><td>ANCIEN SOLDE CREDITEUR AU 30/09/${y}</td><td></td><td style="text-align:right">2 450,10</td></tr>
    <tr><td>${d(3)}</td><td>${d(3)}</td><td>PRLV SEPA EDF CLIENTS PARTICULIERS</td><td style="text-align:right">45,20</td><td></td></tr>
    <tr><td>${d(5)}</td><td>${d(5)}</td><td>VIR SEPA RECU /DE ${nomMaj}</td><td></td><td style="text-align:right">${fr(due.reste)}</td></tr>
    <tr><td></td><td></td><td>/MOTIF LOYER ${mo}/${y}</td><td></td><td></td></tr>
    <tr><td>${d(12)}</td><td>${d(12)}</td><td>VIR SEPA DUPONT ARTISAN FACTURE 2211</td><td style="text-align:right">1 280,00</td><td></td></tr>
    <tr><td>${d(18)}</td><td>${d(18)}</td><td>REMBOURSEMENT ASSURANCE MAIF</td><td></td><td style="text-align:right">310,55</td></tr>
    <tr><td></td><td></td><td><b>TOTAL DES OPÉRATIONS</b></td><td style="text-align:right">1 325,20</td><td style="text-align:right">${fr(due.reste + 310.55)}</td></tr>
    <tr><td></td><td></td><td>NOUVEAU SOLDE CREDITEUR AU ${d(30)}</td><td></td><td style="text-align:right">3 000,00</td></tr></table></body></html>`);
  fs.writeFileSync(OUT + '/releve.pdf', await gen.pdf({ format: 'A4' })); await gen.close();
  // 1. lecture directe
  const ops = await p.evaluate(async () => { const r = await fetch('data:application/pdf;base64,' + window.__pdf).catch(() => null); return null; });
  const res = await p.evaluate(async b64 => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); const r = await releveDepuisPdf(new Blob([u], { type: 'application/pdf' })); return r.ops; }, fs.readFileSync(OUT + '/releve.pdf').toString('base64'));
  console.log('    ' + res.map(o => `${o.date} ${o.montant} ${o.lib.slice(0, 50)}`).join('\n    '));
  ok('4 opérations trouvées (soldes et total ignorés)', res.length === 4);
  ok('EDF et artisan en débit, loyer et remboursement en crédit', res.find(o => /EDF/.test(o.lib))?.montant === -45.2 && res.find(o => /DUPONT/.test(o.lib))?.montant === -1280 && res.find(o => /MAIF/.test(o.lib))?.montant === 310.55 && res.find(o => /VIR SEPA RECU/.test(o.lib))?.montant === due.reste);
  ok('libellé sur 2 lignes recollé (motif du virement)', /MOTIF LOYER/.test(res.find(o => /VIR SEPA RECU/.test(o.lib))?.lib || ''));
  ok('dates justes', res.find(o => /EDF/.test(o.lib))?.date === `${y}-${mo}-03`);
  // 2. parcours : Compta › Banque › Importer mon relevé › choisir le PDF
  await p.evaluate(() => importerReleve()); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/1-import.png' });
  ok('fenêtre : un seul bouton principal "Choisir le relevé"', await p.locator('#overlay button.primary').count() === 1 && /Choisir le relevé/.test(await p.locator('#overlay button.primary').innerText()));
  await p.evaluate(() => { document.querySelector('#overlay details:last-of-type').open = true; document.getElementById('f_txt').value = '03/10/2026 PRLV EDF -12,00'; [...document.querySelectorAll('#overlay button')].find(x => /Analyser ces lignes/.test(x.textContent)).click(); }); await p.waitForTimeout(300);
  ok('lignes collées : analysées en un geste', /Dépenses \(1\)/.test(await p.evaluate(() => document.getElementById('overlay').innerText)));
  await p.evaluate(() => importerReleve()); await p.waitForTimeout(200);
  await p.setInputFiles('#relfile', OUT + '/releve.pdf'); await p.waitForTimeout(2500);
  await p.screenshot({ path: OUT + '/2-revue.png', fullPage: true });
  const revue = await p.evaluate(() => document.getElementById('overlay').innerText);
  ok('revue : le loyer est reconnu et rattaché au bon locataire', /Loyers reconnus \(1\)/.test(revue) && await p.evaluate(id => [...document.querySelectorAll('#overlay select[name^=m]')].some(s => s.value.startsWith(id + '|')), due.id));
  ok('revue : 2 dépenses proposées', /Dépenses \(2\)/.test(revue));
  await p.evaluate(() => document.querySelector('#overlay button.primary').click()); await p.waitForTimeout(500);
  ok('après Valider : le loyer est payé', await p.evaluate(x => echeance(bail(x.id), x.m).statut === 'paye', due));
  // 3. le même relevé une 2e fois : rien de nouveau
  await p.evaluate(() => importerReleve()); await p.waitForTimeout(200); await p.setInputFiles('#relfile', OUT + '/releve.pdf'); await p.waitForTimeout(2500);
  ok('2e import du même relevé : rien en double', await p.evaluate(() => !/Loyers reconnus \(1\)/.test(document.getElementById('overlay').innerText || '')));
  await p.evaluate(() => closeOverlay());
  // 4. une photo de relevé, ici sans IA possible (mode local) : message clair + bouton pour essayer un autre fichier
  const png = await (await b.newPage()).screenshot(); fs.writeFileSync(OUT + '/photo.png', png);
  await p.evaluate(() => importerReleve()); await p.waitForTimeout(200); await p.setInputFiles('#relfile', OUT + '/photo.png'); await p.waitForTimeout(800);
  ok('photo sans IA possible : explication + "Choisir un autre fichier"', await p.evaluate(() => /PDF ou le CSV/.test(document.getElementById('overlay').innerText) && /Choisir un autre fichier/.test(document.querySelector("#overlay button.primary").textContent)));
  await p.evaluate(() => closeOverlay());
  // 5. photo lue par l'IA (simulée)
  await p.evaluate(() => { MCP = null; SB = { auth: {} }; SB_USER = { id: 'u1' }; MEMBRES = { membres: [{ user_id: 'u1', role: 'proprietaire' }] }; ESPACE = 'e1';
    window.fnIA = async c => { window.__ia = c; return { releve: { operations: [{ date: '2026-10-21', libelle: 'VIR SEPA LOCATAIRE TEST', montant: 123.45 }, { date: '2026-10-22', libelle: 'CB BRICO', montant: -19.9 }] } }; }; });
  const viaIA = await p.evaluate(async b64 => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return opsReleveFichier(new File([u], 'photo.png', { type: 'image/png' })); }, png.toString('base64'));
  ok('photo : envoyée à l\'IA (action "releve") et opérations reprises', (await p.evaluate(() => window.__ia && window.__ia.action)) === 'releve' && viaIA.length === 2 && viaIA[1].montant === -19.9);
  // 6. relevé arrivé dans la boîte à documents (e-mail ou photo) : reconnu, "Cocher les loyers" en un geste
  await p.evaluate(async b64 => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    window.blobFichier = async () => ({ bl: new Blob([u], { type: 'application/pdf' }), type: 'application/pdf' });
    S.fichiers.push({ id: 'r1', boite: true, nom: 'document-banque.pdf', type: 'application/pdf', bienId: '', date: iso(TODAY) });
    // le loyer de l'étape 2 est déjà payé : on le retire pour que le relevé ait quelque chose à cocher
    S.paiements = S.paiements.filter(x => !(x.banque && /VIR SEPA RECU/.test(x.banque))); S.banqueVus = {};
  }, fs.readFileSync(OUT + '/releve.pdf').toString('base64'));
  await p.evaluate(() => { location.hash = 'compta'; }); await p.waitForTimeout(200);
  await p.evaluate(() => lireRecus()); await p.waitForTimeout(1500);
  ok('boîte : le relevé est reconnu, pas rangé dans un logement', await p.evaluate(() => LU_RECUS.r1 && LU_RECUS.r1.releve && !S.fichiers.find(f => f.id === 'r1').bienId) && /relevé de banque est arrivé/.test(await p.evaluate(() => document.getElementById('toast').textContent)));
  await p.evaluate(() => releveRecu('r1')); await p.waitForTimeout(2500);
  console.log('    revue boîte :', (await p.evaluate(() => (document.getElementById('overlay').innerText || '') + ' | toast: ' + document.getElementById('toast').textContent)).replace(/\s+/g, ' ').slice(0, 300));
  ok('boîte : "Cocher les loyers" ouvre la revue avec le loyer reconnu', /Loyers reconnus \(1\)/.test(await p.evaluate(() => document.getElementById('overlay').innerText)) && await p.evaluate(() => !!S.fichiers.find(f => f.id === 'r1').releveLu));
  ok('aucune erreur', !errs.length); if (errs.length) console.log(errs);
  await b.close(); console.log(KO ? `\n${KO} échec(s)` : '\nTout est bon'); process.exit(KO ? 1 : 0);
})();

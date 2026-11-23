// Factures (comme Pennylane) : chaque paiement a sa facture. Compte de test réel (Supabase), banque simulée.
// Assistant une question à la fois, photo jointe (rangée + reliée), "Pas de facture", "Comment l'obtenir ?", message tout prêt,
// commentaires, facture reçue reliée au paiement (pas de doublon), boîte à documents, À faire, pack comptable (.zip).
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); }).listen(8099);
const JSZIP = fs.existsSync(__dirname + '/vendor/jszip/jszip.min.js') ? __dirname + '/vendor/jszip/jszip.min.js' : '/opt/node-tools/node_modules/jszip/dist/jszip.min.js';
let ok = 0, ko = 0; const t = (c, m) => { c ? ok++ : ko++; console.log((c ? 'OK ' : 'KO ') + m); };
// un vrai PDF d'une page avec du texte (lu par pdf.js dans l'appli)
function pdf(lignes) {
  const txt = lignes.map((l, i) => `BT /F1 12 Tf 50 ${780 - i * 18} Td (${l.replace(/[()\\]/g, '')}) Tj ET`).join('\n');
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>', `<< /Length ${Buffer.byteLength(txt, 'latin1')} >>\nstream\n${txt}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'];
  let out = '%PDF-1.4\n', off = []; objs.forEach((o, i) => { off.push(Buffer.byteLength(out, 'latin1')); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = Buffer.byteLength(out, 'latin1'); out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + off.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`;
  return Buffer.from(out, 'latin1');
}
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const ctx = await b.newContext({ ...devices['iPhone 13'], ignoreHTTPSErrors: true, serviceWorkers: 'block', acceptDownloads: true }); const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
  await p.route('**/pdf.js/3.11.174/pdf.min.js', r => r.fulfill({ path: __dirname + '/vendor/pdfjs/pdf.min.js', contentType: 'application/javascript' }));
  await p.route('**/pdf.js/3.11.174/pdf.worker.min.js', r => r.fulfill({ path: __dirname + '/vendor/pdfjs/pdf.worker.min.js', contentType: 'application/javascript' }));
  await p.route('**/jszip/3.10.1/jszip.min.js', r => r.fulfill({ path: JSZIP, contentType: 'application/javascript' }));
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test factures'); await p.click('#esp_btn'); await p.waitForTimeout(2000);
  const ESP = await p.evaluate(() => ESPACE);
  try {
    const Y = await p.evaluate(async () => { await chargerMembres(); const Y = TODAY.getFullYear(), m = String(TODAY.getMonth() + 1).padStart(2, '0'), j = n => `${Y}-${m}-${String(n).padStart(2, '0')}`;
      S.sci.nom = 'SCI Les Tests'; S.sci.siege = '1 rue du Test, 75001 Paris'; S.sci.gerant = 'Camille Test';
      S.biens.push({ id: 'b1', nom: 'Appart Centre', adresse: '3 rue de la Paix', cp: '75002', ville: 'Paris', type: 'Appartement', surface: 30 });
      S.depenses.push({ id: 'dPlomb', date: j(2), montant: 120, categorie: "Travaux d'entretien / réparation", bienId: 'b1', libelle: 'Plombier Durand fuite' },
        { id: 'dInt', date: j(3), montant: 80, categorie: "Intérêts d'emprunt", bienId: '', libelle: 'Prêt' });
      BANQUE = { etat: 'ok', lien: { source: 'enablebanking', derniere_synchro: new Date().toISOString() }, comptes: [{ nom: 'Compte SCI', solde: 1000 }],
        ops: [{ tx_id: 't1', date: j(1), montant: -47, libelle: 'CB LEROY MERLIN PARIS' }, { tx_id: 't2', date: j(1), montant: -6.5, libelle: 'FRAIS TENUE DE COMPTE' }, { tx_id: 't3', date: j(1), montant: -230.4, libelle: 'PRLV AXA FRANCE IARD' }, { tx_id: 't4', date: j(1), montant: -89.99, libelle: 'PRLV EDF CLIENTS' }] };
      save(); return Y; });
    let E = await p.evaluate(Y => { const E = listeFactures(Y); return { total: E.total, n: E.manque.length, k: E.manque.map(x => x.k) }; }, Y);
    t(E.n === 4 && E.k.includes('dPlomb'.replace(/^/, 'd')) && E.k.includes('ot1') && !E.k.includes('ot2') && !E.k.includes('ddInt'), `4 factures demandées (plombier + Leroy Merlin + AXA + EDF), pas pour les frais bancaires ni les intérêts : ${E.k.join(', ')}`);
    await p.evaluate(() => { view.comptaOnglet = 'depenses'; go('compta'); render(); }); await p.waitForTimeout(400);
    let txt = await p.locator('#app').innerText();
    t(/4 factures à retrouver/.test(txt) && /Ajouter les factures/.test(txt) && /Pack pour le comptable/.test(txt), 'Compta › Dépenses : "4 factures à retrouver" + gros bouton "📎 Ajouter les factures" + pack');
    if (process.env.DBG) console.log(await p.evaluate(() => [...document.querySelectorAll('.lr-list li')].map(l => l.innerText.replace(/\n/g, ' | ')).join('\n')));
    t(await p.locator('.lr-r .fact-b.manque').count() >= 1, 'la dépense du plombier porte le badge "❓ facture"');
    await p.screenshot({ path: __dirname + '/shots115/compta.png' }).catch(() => {});
    // l'assistant : une question à la fois
    await p.locator('button:has-text("Ajouter les factures")').first().click(); await p.waitForTimeout(400);
    let ov = await p.locator('#overlay').innerText();
    t(/Facture 1 sur 4/.test(ov) && /Prendre en photo/.test(ov) && /Choisir le fichier/.test(ov) && /Pas de facture/.test(ov) && /Plus tard/.test(ov), 'assistant : "Facture 1 sur 4", 📸 photo, 📄 fichier, 🚫 pas de facture, Plus tard');
    await p.screenshot({ path: __dirname + '/shots115/assistant.png' }).catch(() => {});
    const premier = await p.evaluate(() => FACT && listeFactures(FACT.y).manque[0].k);
    // "Plus tard" passe à la suivante
    await p.evaluate(() => document.getElementById('mform').requestSubmit()); await p.waitForTimeout(400);
    ov = await p.locator('#overlay').innerText();
    t(/Facture 2 sur 4/.test(ov), '"Plus tard ›" passe à la facture suivante (2 sur 4)');
    await p.evaluate(() => closeOverlay());
    // Leroy Merlin : guide + photo jointe → la sortie de la banque devient une dépense avec sa facture
    await p.evaluate(Y => assistantFactures(Y, 'ot1'), Y); await p.waitForTimeout(300);
    await p.locator('#overlay .fact-guide summary').click(); await p.waitForTimeout(150);
    ov = await p.locator('#overlay').innerText();
    t(/Mes achats/.test(ov) && /au nom de SCI Les Tests/.test(ov) && /Demander la facture/.test(ov), '"Comment l\'obtenir ?" pour Leroy Merlin : Mes achats, au nom de la SCI, bouton "Demander la facture"');
    await p.locator('#overlay button:has-text("Demander la facture")').click(); await p.waitForTimeout(250);
    const msg = await p.evaluate(() => document.getElementById('msgFact').value);
    t(/facture de mon paiement de 47,00/.test(msg) && /au nom de SCI Les Tests, 1 rue du Test/.test(msg) && /Camille Test/.test(msg), 'message tout prêt : montant, date, au nom de la SCI avec son adresse, signé');
    await p.evaluate(Y => { closeOverlay(); assistantFactures(Y, 'ot1'); }, Y); await p.waitForTimeout(300);
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    await p.setInputFiles('#overlay label:has-text("Prendre en photo") input', { name: 'ticket.png', mimeType: 'image/png', buffer: png }); await p.waitForTimeout(3500);
    let r = await p.evaluate(() => { const d = S.depenses.find(x => x.banqueTx === 't1'), f = d && factureDe(d); return { d, f, cat: d && d.categorie }; });
    t(r.d && r.f && r.f.chemin && r.f.depenseId === r.d.id && /Leroy|LEROY/.test(r.f.nom), `photo jointe : la sortie Leroy Merlin est rangée (${r.cat}) avec sa facture stockée (${r.f && r.f.nom})`);
    const dl = await p.evaluate(async c => { const x = await SB.storage.from('documents').download(c); return x.data ? x.data.size : -1; }, r.f && r.f.chemin);
    t(dl > 0, `la photo est bien dans le stockage de l'appli (${dl} octets)`);
    // "Pas de facture" pour EDF
    await p.evaluate(() => pasDeFacture('ot4')); await p.waitForTimeout(250);
    await p.locator('#overlay input[name=r][value="0"]').check(); await p.evaluate(() => document.getElementById('mform').requestSubmit()); await p.waitForTimeout(600);
    r = await p.evaluate(() => S.depenses.find(x => x.banqueTx === 't4'));
    t(r && /relevé de banque suffit/.test(r.sansFacture), '"Pas de facture" : la raison est notée (EDF, le relevé suffit)');
    // une facture PDF arrive (photo d'une facture) avec le même montant qu'AXA : l'appli propose de la relier, pas de doublon
    const nAvant = await p.evaluate(() => S.depenses.length);
    const PAD = ['Conditions generales disponibles sur simple demande aupres de votre conseiller.', 'Document a conserver : il sert de justificatif pour votre comptabilite.', 'Merci de votre confiance, nous restons a votre disposition pour toute question.'];
    const axa = pdf([...PAD, 'AXA France IARD', 'Avis d echeance', 'Total TTC : 230,40 EUR', `Date : 05/${String(new Date().getMonth() + 1).padStart(2, '0')}/${Y}`]);
    await p.evaluate(async b64 => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); const file = new File([u], 'axa.pdf', { type: 'application/pdf' });
      const r = lireFacture(await lireTextePdf(file)); window.__r = r; proposerPaiementFacture({ montant: r.montant, date: r.date, fichier: file, pre: Object.assign({ fichier: file }, r) }); }, axa.toString('base64'));
    await p.waitForTimeout(600); ov = await p.locator('#overlay').innerText();
    t(/C'est la facture de ce paiement/.test(ov) && /230,40/.test(ov) && /Oui, relier/.test(ov) && /Non, c'est une autre dépense/.test(ov), 'facture AXA lue (230,40 €) : "C\'est la facture de ce paiement ?" Oui, relier / Non');
    await p.evaluate(() => document.getElementById('mform').requestSubmit()); await p.waitForTimeout(3500);
    r = await p.evaluate(n => { const d = S.depenses.find(x => x.banqueTx === 't3'); return { lie: !!(d && factureDe(d)), cat: d && d.categorie, n: S.depenses.length - n }; }, nAvant);
    t(r.lie && r.n === 1 && /Assurance/.test(r.cat), `facture AXA reliée au prélèvement de la banque (une seule dépense ajoutée, catégorie ${r.cat})`);
    // commentaires
    await p.evaluate(() => editDepense('dPlomb')); await p.waitForTimeout(250);
    ov = await p.locator('#overlay').innerText();
    t(/Pas encore de facture/.test(ov) && /Ajouter la facture/.test(ov) && /Commentaires/.test(ov), 'fiche de la dépense : "Pas encore de facture" + "📎 Ajouter la facture" + commentaires');
    await p.fill('#note_txt', 'Facture demandée au plombier le 20'); await p.locator('#overlay .fn-ajout button').click(); await p.waitForTimeout(250);
    r = await p.evaluate(() => ({ n: S.depenses.find(x => x.id === 'dPlomb').notes, ecran: document.getElementById('notes_l').innerText }));
    t(r.n && r.n.length === 1 && /Camille Test/.test(r.n[0].qui) && /plombier/.test(r.ecran), 'commentaire ajouté, avec son auteur, visible tout de suite');
    await p.evaluate(() => closeOverlay());
    // boîte à documents : la facture du plombier arrive (PDF) → proposée pour le bon paiement
     const plomb = pdf([...PAD, 'Plomberie Durand', 'FACTURE n 2026-118', 'Reparation fuite cuisine', 'Total TTC : 120,00 EUR', `Date : 02/${String(new Date().getMonth() + 1).padStart(2, '0')}/${Y}`]);
    const fid = await p.evaluate(async b64 => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      await deposerDansBoite([new File([u], 'facture-durand.pdf', { type: 'application/pdf' })], 'test'); const f = S.fichiers.filter(x => x.boite).pop(); for (let i = 0; i < 60 && !LU_RECUS[f.id]; i++) { await new Promise(r => setTimeout(r, 250)); if (!LECTURE_RECUS) await lireRecus(); } return f.id; }, plomb.toString('base64'));
    await p.waitForTimeout(800);
    r = await p.evaluate(id => ({ g: LU_RECUS[id], toast: document.body.innerText }), fid);
    if (process.env.DBG) console.log(await p.evaluate(async id => { const f = S.fichiers.find(x => x.id === id); return JSON.stringify({ f, boite: recusBoite().map(x => x.id), lu: Object.keys(LU_RECUS), LECTURE_RECUS, LECTURE, MCP: !!MCP, pro: estProprio(), nb: S.biens.length, n: await lireRecus() }); }, fid));
    if (process.env.DBG) console.log(JSON.stringify(r.g), await p.evaluate(async id => { const f = S.fichiers.find(x => x.id === id); const t = await texteSeulPdf((await blobFichier(f)).bl); const r = lireFacture(t); return [t.slice(0, 300), JSON.stringify(r), JSON.stringify(paiementPourFacture(r.montant, r.date) && paiementPourFacture(r.montant, r.date).k)]; }, fid));
    t(r.g && r.g.fact === 'ddPlomb' && /La facture de 120,00/.test(r.toast), 'boîte à documents : la facture du plombier est reconnue (120 €) et proposée "Relier au paiement"');
    await p.evaluate(id => relierRecuFacture(id), fid); await p.waitForTimeout(400);
    r = await p.evaluate(id => { const d = S.depenses.find(x => x.id === 'dPlomb'), f = S.fichiers.find(x => x.id === id); return { lie: d.factureId === id, bien: f.bienId, boite: !!f.boite }; }, fid);
    t(r.lie && r.bien === 'b1' && !r.boite, 'reliée : la facture quitte la boîte et va dans le logement (Appart Centre)');
    E = await p.evaluate(Y => { const E = listeFactures(Y); return { n: E.manque.length, pct: E.pct }; }, Y);
    t(E.n === 0 && E.pct === 100, 'toutes les factures sont là : 100 %');
    await p.evaluate(() => { view.comptaOnglet = 'depenses'; render(); }); await p.waitForTimeout(300);
    txt = await p.locator('#app').innerText();
    t(/Toutes les factures de \d{4} sont là/.test(txt) && /📎 facture/.test(txt), 'Compta : "✅ Toutes les factures sont là", badges "📎 facture"');
    // nouveau paiement à la banque → "tu as la facture ?" + tâche À faire
    await p.evaluate(Y => { localStorage.setItem('factVu-' + ESPACE, `${Y}-01-01`); BANQUE.ops.push({ tx_id: 't9', date: iso(TODAY), montant: -59, libelle: 'CB CASTORAMA' }); demanderFacturesNouvelles(); }, Y);
    await p.waitForTimeout(5000);
    txt = await p.evaluate(() => document.body.innerText);
    if (process.env.DBG) console.log(txt.slice(-600));
    t(/59,00.€ · Castorama : tu as la facture/.test(txt), 'nouveau paiement vu à la banque : "59,00 € · Castorama : tu as la facture ?" avec 📎 Ajouter');
    const tache = await p.evaluate(() => taches().find(x => x.key.startsWith('fact-')));
    t(tache && /1 facture à retrouver/.test(tache.t), `À faire : "${tache && tache.t}"`);
    // pack comptable
    const [dlz] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }), p.evaluate(Y => packComptable(Y), Y)]);
    const zp = await dlz.path(), JSZip = require(JSZIP.replace(/jszip\.min\.js$/, 'jszip.min.js')); const z = await JSZip.loadAsync(fs.readFileSync(zp));
    const noms = Object.keys(z.files), csv = await z.file(noms.find(n => /\.csv$/.test(n))).async('string');
    t(noms.some(n => /FEC\d{4}1231\.txt$/.test(n)) && noms.filter(n => /^Factures\/.+\.(png|jpg|pdf)$/.test(n)).length === 3 && noms.includes('Lisez-moi.txt'), `pack .zip : FEC + 3 factures + liste + lisez-moi (${noms.length} fichiers)`);
    t(/Pas de facture : Le relevé de banque suffit/.test(csv) && /MANQUANTE \(paiement vu à la banque\)/.test(csv) && /Facture demandée au plombier/.test(csv) && /Pas nécessaire/.test(csv), 'liste du pack : raison "pas de facture", paiement manquant (Castorama), commentaire, intérêts "pas nécessaire"');
    t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  } finally { await p.evaluate(async esp => { const { data: l } = await SB.storage.from('documents').list(esp + '/factures'); for (const d of ['factures', 'b1', 'partages']) { const { data } = await SB.storage.from('documents').list(esp + '/' + d); if (data && data.length) await SB.storage.from('documents').remove(data.map(f => esp + '/' + d + '/' + f.name)); } await SB.from('espaces').delete().eq('id', esp); }, ESP).catch(e => console.log('nettoyage', e.message)); }
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

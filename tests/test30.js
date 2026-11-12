// Toutes les nouveautés du 12/11 (après-midi) : téléphone 390 × 844, clair et sombre
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const out = __dirname + '/shots30'; fs.mkdirSync(out, { recursive: true });
const src = fs.readFileSync(__dirname + '/test4.js', 'utf8');
let FAKE = fs.readFileSync(__dirname + '/test2.js', 'utf8').split('const FAKE = `')[1].split('`;')[0];
const mcpBlock = src.split("FAKE = FAKE.replace(/const mcp = \\{[\\s\\S]*?\\};\\n/, `")[1].split("`);")[0];
FAKE = FAKE.replace(/const mcp = \{[\s\S]*?\};\n/, mcpBlock);
const ok = [], ko = []; const check = (c, m) => (c ? ok : ko).push(m);
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [name, scheme] of [['m', 'light'], ['md', 'dark']]) {
    const vp = { width: 390, height: 844 }, ctx = await b.newContext({ viewport: vp, colorScheme: scheme, acceptDownloads: true }), p = await ctx.newPage();
    p.on('pageerror', e => errs.push(name + ':' + e.message)); p.on('console', m => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errs.push(name + ':' + m.text()));
    await p.addInitScript(FAKE);
    await p.route('**/jspdf.umd.min.js', r => r.fulfill({ path: __dirname + '/vendor/jspdfpkg/package/dist/jspdf.umd.min.js', contentType: 'application/javascript' }));
    await p.goto('file://' + path.join(__dirname, '..', 'index.html')); await p.waitForTimeout(500);
    await p.evaluate(() => { S = demo(); save(); render(); }); await p.waitForTimeout(300);
    const shot = async (n, full = false) => { await p.waitForTimeout(250); await p.screenshot({ path: `${out}/${name}-${n}.png`, fullPage: full }); const sw = await p.evaluate(() => document.documentElement.scrollWidth); if (sw > vp.width) errs.push(`${name}-${n} overflow ${sw}`); };
    // Accueil : "À faire" avant le résumé des loyers, guide sur une ligne
    const ordre = await p.evaluate(() => { const a = [...document.querySelectorAll('#app h2.sec, #app .hero')].map(x => x.classList.contains('hero') ? 'hero' : x.textContent.trim().split(' ')[0]); return a; });
    check(ordre.indexOf('À') < ordre.indexOf('hero'), name + ' : "À faire" avant les loyers ' + ordre.join('>'));
    await shot('01-accueil', true);
    // Annuler
    const id = await p.evaluate(() => S.baux.find(x => isActive(x) && echeance(x, CUR) && echeance(x, CUR).statut !== 'paye').id);
    const avant = await p.evaluate(id => S.paiements.length, id);
    await p.evaluate(id => encaisser(id, CUR), id); await p.waitForTimeout(200);
    check(await p.isVisible('.toast-undo'), name + ' : bouton Annuler après "A payé"'); await shot('02-annuler');
    await p.click('.toast-undo'); await p.waitForTimeout(200);
    check(await p.evaluate(() => S.paiements.length) === avant, name + ' : Annuler retire le paiement');
    // Lexique et Pourquoi
    await p.evaluate(id => location.hash = 'bail-' + id, id); await p.waitForTimeout(300);
    await p.click('.cq >> nth=0'); await p.waitForTimeout(150); check(await p.isVisible('#bulle .cq-box'), name + ' : bulle "C\'est quoi ?"'); await shot('03-bulle');
    await p.evaluate(() => document.getElementById('bulle').hidden = true);
    check(await p.evaluate(() => !!document.querySelector('.task details.pq') || !!document.querySelector('#app details.pli')), name + ' : "Pourquoi ?" ou 12 mois présents');
    await shot('04-fiche', true);
    // 12 prochains mois
    check(await p.evaluate(() => !!document.querySelector('#app details.pli h2') && [...document.querySelectorAll('#app details.pli h2')].some(h => /12 prochains mois/.test(h.textContent))), name + ' : 12 prochains mois sur la fiche');
    // Relance : tons
    const ret = await p.evaluate(() => { const e = toutesEcheances().find(x => x.statut === 'retard'); return e ? [e.b.id, e.m] : null; });
    if (ret) { await p.evaluate(([i, m]) => relance(i, m), ret); await p.waitForTimeout(300); check(await p.isVisible('.tons'), name + ' : choix du ton de la relance'); await p.click('.tons button >> nth=0'); check(/Petit message/.test(await p.inputValue('#mailtxt')), name + ' : ton gentil appliqué'); await shot('05-relance-tons'); await p.evaluate(() => closeOverlay()); }
    // Régularisation
    await p.evaluate(() => { const b = S.baux.find(x => isActive(x) && +x.charges > 0); S.depenses.push({ id: 'dtest', date: (TODAY.getFullYear() - 1) + '-06-01', montant: 120, categorie: 'Eau / électricité / gaz', bienId: b.bienId, libelle: 'Eau', recuperable: true }); window.__rb = b.id; save(); });
    await p.evaluate(() => regulCharges(window.__rb, TODAY.getFullYear() - 1)); await p.waitForTimeout(250);
    check(/Charges réelles/.test(await p.textContent('#rgCalc')), name + ' : calcul de régularisation'); await shot('06-regul');
    await p.click('#mform button.primary'); await p.waitForTimeout(400);
    check(await p.evaluate(() => (bail(window.__rb).reguls || []).length === 1 && !!document.getElementById('paper')), name + ' : décompte de charges prêt'); await p.evaluate(() => closeOverlay());
    // FEC
    await p.evaluate(() => { window.download = (n, c) => { window.__dl = { n, c }; }; });
    const fec = await p.evaluate(() => { exportFEC(TODAY.getFullYear()); return window.__dl.c; }); check(/^JournalCode\tJournalLib/.test(fec) && fec.split('\r\n').length > 3, name + ' : fichier FEC (' + (fec.split('\r\n').length - 1) + ' lignes)');
    // Compta : aide déclaration
    await p.evaluate(() => location.hash = 'compta'); await p.waitForTimeout(300); check(await p.evaluate(() => /Pour ta déclaration/.test(document.body.innerText)), name + ' : aide à la déclaration'); await shot('07-compta', true);
    // Départ + comparaison
    await p.evaluate(() => { const b = S.baux.find(x => isActive(x)); window.__dep = b.id; b.dateSortie = iso(addDays(TODAY, 20)); save(); });
    await p.evaluate(() => { nouvelEdl(window.__dep, 'entree'); }); await p.waitForTimeout(200);
    await p.evaluate(() => { const e = edlsDuBail(window.__dep).find(x => x.type === 'entree'); e.pieces.forEach(x => x.etat = 'bon'); nouvelEdl(window.__dep, 'sortie'); const z = edlsDuBail(window.__dep).find(x => x.type === 'sortie'); z.pieces.forEach(x => x.etat = 'bon'); z.pieces[0].etat = 'mauvais'; z.pieces[0].commentaire = 'Trou dans le mur'; save(); location.hash = 'bail-' + window.__dep; });
    await p.waitForTimeout(300); check(await p.evaluate(() => /Le départ/.test(document.body.innerText)), name + ' : parcours de départ'); await shot('08-depart', true);
    await p.evaluate(() => comparerEdl(window.__dep)); await p.waitForTimeout(200); check(await p.evaluate(() => !!document.querySelector('tr.pire')), name + ' : dégât repéré entre entrée et sortie'); await shot('09-comparer');
    await p.fill('textarea[name=ret]', 'Trou dans le mur ; 80'); await p.click('#mform button.primary'); await p.waitForTimeout(300);
    check(await p.evaluate(() => bail(window.__dep).depotRetenu === 80), name + ' : retenue enregistrée'); await p.evaluate(() => closeOverlay());
    // Annonce + candidats + travaux
    const bi = await p.evaluate(() => S.biens[0].id);
    await p.evaluate(bi => annonce(bi), bi); await p.click('#mform button.primary'); await p.waitForTimeout(300);
    check(await p.evaluate(() => /Dépôt de garantie/.test(document.getElementById('paper').innerText)), name + ' : annonce avec mentions'); await shot('10-annonce'); await p.evaluate(() => closeOverlay());
    await p.evaluate(bi => editCandidat(bi), bi); await p.fill('#f_nom', 'Alex Test'); await p.fill('#f_revenus', '3000'); await p.waitForTimeout(100);
    check(/Taux d'effort/.test(await p.textContent('#candCalc')), name + ' : taux d\'effort'); await shot('11-candidat'); await p.click('#mform button.primary'); await p.waitForTimeout(200);
    await p.evaluate(bi => editTravaux(bi), bi); await p.fill('#f_titre', 'Chauffe-eau'); await p.fill('#f_facture', '660'); await p.click('#mform button.primary'); await p.waitForTimeout(200);
    check(await p.evaluate(() => S.depenses.some(d => d.travauxId && d.montant === 660)), name + ' : facture de travaux dans la compta');
    await p.evaluate(bi => location.hash = 'bien-' + bi, bi); await shot('12-bien', true);
    // Lecture d'un bail et d'une facture (texte)
    const lb = await p.evaluate(() => lireBail("CONTRAT DE LOCATION. Le locataire : Camille Durand, camille.d@exemple.fr, 06 12 34 56 78. Le contrat prend effet le 1er septembre 2025. Loyer mensuel hors charges : 640,00 euros. Provision sur charges : 40 €. Dépôt de garantie : 640 €. Le loyer est payable le 5 de chaque mois."));
    check(lb.loyerHC === 640 && lb.charges === 40 && lb.depot === 640 && lb.dateEntree === '2025-09-01' && lb.jourPaiement === 5 && lb.email === 'camille.d@exemple.fr' && lb.nom === 'Camille Durand', name + ' : lecture du bail ' + JSON.stringify(lb));
    // Photo de facture (OCR, réseau)
    if (name === 'm') { const r = await p.evaluate(async src => { try { const t = await lireTexteImage(src); return lireFacture(t); } catch (e) { return { err: e.message }; } }, 'data:image/png;base64,' + fs.readFileSync(__dirname + '/facture-test.png').toString('base64'));
      check(r.montant === 660 && r.date === '2026-11-03' && r.categorie === "Travaux d'entretien / réparation", name + ' : photo de facture lue ' + JSON.stringify(r)); }
    // Import tableur
    await p.evaluate(async () => { const X = await libXlsx(); const ws = X.utils.aoa_to_sheet([COLS_IMPORT.map(c => c[1]), ['Studio Gare', '1 rue de la Gare', '75010', 'Paris', 'Studio', 20, 'oui', 'Lou Test', 'lou@test.fr', '0611223344', '01/03/2025', 700, 50, 1400, 5], ['Parking', '1 rue de la Gare', '75010', 'Paris', 'Parking / garage', '', 'non', '', '', '', '', '', '', '', '']]); const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, 'a'); window.__xlsx = X.write(wb, { type: 'array', bookType: 'xlsx' }); });
    await p.evaluate(() => { window.choisirFichier = () => Promise.resolve(new File([window.__xlsx], 'a.xlsx')); importTableur(); }); await p.waitForTimeout(200); await p.evaluate(() => lireTableur()); await p.waitForTimeout(800);
    await shot('13-import'); const nb0 = await p.evaluate(() => [S.biens.length, S.baux.length]);
    await p.click('text=Tout créer'); await p.waitForTimeout(300); const nb1 = await p.evaluate(() => [S.biens.length, S.baux.length, (S.baux.find(x => x.nom === 'Lou Test') || {}).dateEntree]);
    check(nb1[0] === nb0[0] + 2 && nb1[1] === nb0[1] + 1 && nb1[2] === '2025-03-01', name + ' : import Excel ' + JSON.stringify([nb0, nb1]));
    // Agenda
    const ics = await p.evaluate(() => { exportAgenda(); return window.__dl.c; });
    check(/BEGIN:VCALENDAR/.test(ics) && (ics.match(/BEGIN:VEVENT/g) || []).length > 10, name + ' : agenda .ics (' + (ics.match(/BEGIN:VEVENT/g) || []).length + ' dates)');
    // Mentions légales, ajout contextuel
    await p.evaluate(() => location.hash = 'legal'); await p.waitForTimeout(200); check(await p.evaluate(() => /Tes droits/.test(document.body.innerText)), name + ' : page confidentialité'); await shot('14-legal', true);
    await p.evaluate(bi => { location.hash = 'bien-' + bi; }, bi); await p.waitForTimeout(200); await p.evaluate(() => ajoutRapide()); check(await p.evaluate(() => /Des travaux/.test(document.getElementById('overlay').innerText)), name + ' : bouton + adapté à la page'); await shot('15-plus'); await p.evaluate(() => closeOverlay());
    // Lecture seule (simulée)
    await p.evaluate(() => { LECTURE = true; document.body.classList.add('lecture'); location.hash = 'locataires'; render(); }); await p.waitForTimeout(200);
    check(await p.evaluate(() => /Lecture seule/.test(document.body.innerText) && ![...document.querySelectorAll('.tile .row button')].some(x => x.offsetParent)), name + ' : lecture seule sans boutons'); await shot('16-lecture', true);
    await ctx.close();
  }
  console.log('OK', ok.length); ok.forEach(x => console.log('  ✓', x)); console.log('KO', ko.length); ko.forEach(x => console.log('  ✗', x)); console.log('ERRORS', errs);
  await b.close(); process.exit(ko.length || errs.length ? 1 : 0);
})();

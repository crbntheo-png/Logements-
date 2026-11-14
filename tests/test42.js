// Prêts (tableau calculé ou importé), ventilation des échéances (proposée, jamais automatique), intérêts en compta et 2072,
// rentabilité nette et cash-flow, avances des associés. Mode local.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = __dirname + '/shots42'; fs.mkdirSync(OUT, { recursive: true });
const src = fs.readFileSync(__dirname + '/test4.js', 'utf8');
let FAKE = fs.readFileSync(__dirname + '/test2.js', 'utf8').split('const FAKE = `')[1].split('`;')[0];
const mcpBlock = src.split("FAKE = FAKE.replace(/const mcp = \\{[\\s\\S]*?\\};\\n/, `")[1].split("`);")[0];
FAKE = FAKE.replace(/const mcp = \{[\s\S]*?\};\n/, mcpBlock);
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const scheme of ['light', 'dark']) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
    p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(FAKE);
    await p.goto('file://' + path.join(__dirname, '..', 'index.html')); await p.waitForTimeout(500);
    await p.evaluate(() => { S = demo(); S.faits = { guideMasque: 1 }; S.depenses = []; S.prets = []; S.sci.forme = 'sci'; S.sci.associes = [{ nom: 'Pierre', parts: 50 }, { nom: 'Gabriel', parts: 50 }]; save(); render(); });
    const bid = await p.evaluate(() => S.biens[0].id);
    // 1. Tableau calculé
    const t1 = await p.evaluate(() => { const L = tableauPret({ montant: 100000, taux: 3, duree: 240, premiere: '2025-01-05', assurance: 20 }); return { n: L.length, m: r2(L[1].interets + L[1].capital), cap: r2(L.reduce((s, x) => s + x.capital, 0)), fin: L[L.length - 1].crd, i1: L[0].interets }; });
    ok(scheme + ' : 100 000 € à 3 % sur 20 ans = 554,60 €/mois', t1.n === 240 && Math.abs(t1.m - 554.6) < 0.02 && t1.i1 === 250);
    ok(scheme + ' : tout le capital remboursé, reste dû 0', Math.abs(t1.cap - 100000) < 0.01 && t1.fin === 0);
    const t2 = await p.evaluate(() => { const L = tableauPret({ montant: 100000, taux: 3, duree: 240, premiere: '2025-01-05', differe: 6, differeType: 'partiel' }); return [L.slice(0, 6).every(x => x.interets === 250 && x.capital === 0), L[6].capital > 0, L.length]; });
    ok(scheme + ' : différé partiel de 6 mois (intérêts seuls)', t2[0] && t2[1] && t2[2] === 240);
    // 2. "+ Prêt" par la fenêtre
    await p.evaluate(() => { location.hash = 'compta'; }); await p.waitForTimeout(300);
    await p.evaluate(() => editPret()); await p.waitForTimeout(200);
    await p.fill('#mform input[name=banque]', 'Banque Test'); await p.selectOption('#mform select[name=bienId]', bid);
    await p.fill('#mform input[name=montant]', '120000'); await p.fill('#mform input[name=taux]', '3,5'.replace(',', '.')); await p.fill('#mform input[name=duree]', '240');
    await p.fill('#mform input[name=premiere]', iso2(-24)); await p.fill('#mform input[name=assurance]', '25'); await p.waitForTimeout(200);
    ok(scheme + ' : la mensualité s\'affiche pendant la saisie', await p.evaluate(() => /Mensualité/.test(document.getElementById('pret_calc').innerText)));
    await p.screenshot({ path: OUT + `/1-pret-${scheme}.png` });
    await p.click('#mform button.primary'); await p.waitForTimeout(300);
    const pr = await p.evaluate(() => { const x = S.prets[0]; return x && { bienId: x.bienId, m: mensualitePret(x) }; });
    ok(scheme + ' : prêt enregistré (' + (pr && pr.m) + ' €/mois avec assurance)', pr && pr.bienId === bid && pr.m > 600 && pr.m < 750);
    // 3. Import CSV de la banque
    const csv = 'Date;Échéance;Intérêts;Capital amorti;Assurance;Capital restant dû\n05/01/2026;1 000,00;400,50;579,50;20,00;99 420,50\n05/02/2026;1 000,00;398,57;581,43;20,00;98 839,07';
    const L = await p.evaluate(t => lireTableauPret(t), csv);
    ok(scheme + ' : CSV de la banque lu (2 échéances, nombres français)', L.length === 2 && L[0].date === '2026-01-05' && L[0].interets === 400.5 && L[0].capital === 579.5 && L[1].crd === 98839.07);
    // 4. Ventilation : une échéance "à ventiler" + une échéance complète classée en intérêts
    const v = await p.evaluate(bid => { const pr = S.prets[0], T = tableauPret(pr), e1 = T[3], e2 = T[4];
      S.depenses.push({ id: 'd1', date: e1.date, montant: totalEch(e1), categorie: "Échéance de prêt (capital + intérêts, à ventiler)", bienId: '', libelle: 'ECH PRET CAP+IN 0001', banqueTx: 't1' });
      S.depenses.push({ id: 'd2', date: iso(addDays(P(e2.date), 2)), montant: totalEch(e2), categorie: "Intérêts d'emprunt", bienId: '', libelle: 'ECH PRET INT 0001', banqueTx: 't2' });
      S.depenses.push({ id: 'd3', date: e2.date, montant: 12.34, categorie: "Intérêts d'emprunt", bienId: '', libelle: 'autre chose' });
      save(); render(); return { n: propositionsVentilation().length, e1, e2 }; }, bid);
    ok(scheme + ' : 2 échéances proposées (dont celle classée en intérêts)', v.n === 2);
    await p.evaluate(() => { location.hash = 'compta'; view.pretsOuverts = true; render(); }); await p.waitForTimeout(300);
    ok(scheme + ' : Compta : "2 échéances de prêt à ventiler"', await p.evaluate(() => /2 échéances de prêt à ventiler/.test(document.body.innerText)));
    await p.evaluate(() => ventilerEcheances()); await p.waitForTimeout(300);
    await p.screenshot({ path: OUT + `/2-ventiler-${scheme}.png` });
    ok(scheme + ' : rien changé avant "Oui, ventiler les 2"', await p.evaluate(() => S.depenses.length === 3 && document.querySelector('#mform button.primary').textContent.trim() === 'Oui, ventiler les 2'));
    await p.click('#mform button.primary'); await p.waitForTimeout(300);
    const r4 = await p.evaluate(() => { const D = S.depenses; return { n: D.length, i: D.filter(d => d.categorie === "Intérêts d'emprunt" && d.pretId).length, c: D.filter(d => d.categorie === 'Remboursement capital emprunt').length, a: D.filter(d => d.categorie === 'Assurance emprunteur').length, tx: D.filter(d => d.banqueTx === 't1').length, somme: r2(D.filter(d => d.ventileDe === 'd1').reduce((s, d) => s + d.montant, 0)) }; });
    ok(scheme + ' : ventilées en intérêts + capital + assurance (lien banque gardé)', r4.i === 2 && r4.c === 2 && r4.a === 2 && r4.tx === 3 && Math.abs(r4.somme - totalE(v.e1)) < 0.01);
    ok(scheme + ' : plus rien à ventiler', await p.evaluate(() => propositionsVentilation().length === 0));
    // 5. Compta et 2072 : intérêts de l'année d'après le tableau, pas comptés deux fois
    const r5 = await p.evaluate(bid => { const y = TODAY.getFullYear(), it = interetsTableaux(y, bid), html = aideDeclaration(y, [], { loyers: 0, charges: 0 }); return { it, note: /d'après tes tableaux de prêt/.test(html), couv: depensesCouvertes().size }; }, bid);
    ok(scheme + ' : intérêts de l\'année tirés du tableau (' + r5.it + ' €) + note 2072', r5.it > 0 && r5.note);
    // 6. Rentabilité nette et cash-flow
    const r6 = await p.evaluate(bid => { const bi = bien(bid); bi.prixAchat = 150000; S.depenses.push({ id: 'pno', date: iso(addDays(TODAY, -30)), montant: 200, categorie: 'Assurance propriétaire (PNO)', bienId: bid }, { id: 'ent', date: iso(addDays(TODAY, -60)), montant: 300, categorie: "Travaux d'entretien / réparation", bienId: bid });
      S.taxes = [{ id: 'tx', bienId: bid, annee: TODAY.getFullYear(), total: 900, teom: 100, parts: [] }]; save(); const n = rentaNette(bi); return n; }, bid);
    const att = (r6.loyers - 300 - 800 - 200 - r6.interets) / 150000 * 100;
    ok(scheme + ` : rentabilité nette ${r6.net.toFixed(2)} % (calcul attendu ${att.toFixed(2)} %)`, Math.abs(r6.net - att) < 0.001 && r6.tf === 800 && r6.assur === 200 && r6.autres === 300);
    ok(scheme + ' : cash-flow = (loyers − charges − taxe − assurances) ÷ 12 − mensualité', Math.abs(r6.cash - ((r6.loyers - 300 - 800 - 200) / 12 - r6.mensualites)) < 0.01);
    await p.evaluate(bid => { location.hash = 'bien-' + bid; }, bid); await p.waitForTimeout(300);
    ok(scheme + ' : fiche : "Rentabilité nette" + "Cash-flow" + "Pourquoi ?"', await p.evaluate(() => /Rentabilité nette/.test(document.body.innerText) && /Cash-flow/.test(document.body.innerText) && /Comment c'est calculé/.test(document.body.innerText)));
    await p.screenshot({ path: OUT + `/3-fiche-${scheme}.png`, fullPage: true });
    // 7. Avances des associés
    await p.evaluate(() => { location.hash = 'compta'; }); await p.waitForTimeout(200);
    await p.evaluate(() => avanceAssocie()); await p.waitForTimeout(200);
    await p.selectOption('#mform select[name=qui]', 'Gabriel'); await p.fill('#mform input[name=montant]', '180'); await p.fill('#mform input[name=libelle]', 'Facture plombier');
    await p.click('#mform button.primary'); await p.waitForTimeout(300);
    ok(scheme + ' : dépense comptée pour la SCI', await p.evaluate(() => S.depenses.some(d => d.avancePar === 'Gabriel' && d.montant === 180 && !d.rembourseLe)));
    ok(scheme + ' : "La SCI lui doit 180,00 €"', await p.evaluate(() => /La SCI lui doit 180,00\s€/.test(document.body.innerText.replace(/ | /g, ' '))));
    await p.screenshot({ path: OUT + `/4-avances-${scheme}.png`, fullPage: true });
    await p.evaluate(() => avanceRemboursee('Gabriel')); await p.waitForTimeout(200); await p.click('#mform button.primary'); await p.waitForTimeout(300);
    ok(scheme + ' : "Remboursé" -> à jour', await p.evaluate(() => S.depenses.filter(d => d.avancePar === 'Gabriel').every(d => d.rembourseLe) && /Tout est remboursé|à jour/.test(document.body.innerText)));
    await p.evaluate(() => { S.sci.forme = 'perso'; render(); }); await p.waitForTimeout(200);
    ok(scheme + ' : en nom propre : pas d\'avances d\'associés', await p.evaluate(() => !/Avances des associés/.test(document.body.innerText) && !/payé de sa poche/.test(document.body.innerText)));
    const sw = await p.evaluate(() => document.documentElement.scrollWidth); ok(scheme + ' : pas de débordement (' + sw + ')', sw <= 390);
    await p.close();
  }
  console.log('ERREURS', errs); console.log('KO', KO); await b.close();
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });
function iso2(mois) { const d = new Date(); d.setMonth(d.getMonth() + mois); d.setDate(5); return d.toISOString().slice(0, 10); }
function totalE(e) { return Math.round(((+e.interets || 0) + (+e.capital || 0) + (+e.assurance || 0)) * 100) / 100; }

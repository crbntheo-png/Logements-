// Congé donné par le bailleur : dates (6 mois vide, 3 mois meublé), lettre vente avec offre au locataire, reprise refusée
// pour une SCI non familiale, motif légitime, bail mobilité sans congé, action depuis À faire. Hors ligne (aucun envoi).
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); }).listen(8099);
let ok = 0, ko = 0; const t = (c, m) => { c ? ok++ : ko++; console.log((c ? 'OK ' : 'KO ') + m); };
const OUT = __dirname + '/shots73';
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true, serviceWorkers: 'block' })).newPage();
  p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort()); await p.route(/supabase\.co/, r => r.abort());
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(1500);
  await p.evaluate(() => { SB = null; MODE = 'local'; S = blank(); S.sci = Object.assign(S.sci, { nom: 'SCI Test', gerant: 'Théo Test', siege: '1 place', ville: 'Rennes', familiale: false });
    // fin de bail dans ~7 mois (vide, 6 ans) : il est encore temps
    const e1 = addMonthsDate(addMonthsDate(TODAY, 7), -72), e2 = addMonthsDate(addMonthsDate(TODAY, 2), -12);
    S.biens.push({ id: 'b1', nom: 'T2', adresse: '1 rue des Lilas', cp: '35000', ville: 'Rennes' }, { id: 'b2', nom: 'Studio', adresse: '2 rue', cp: '35000', ville: 'Rennes', meuble: 'meuble' }, { id: 'b3', nom: 'T1', adresse: '3 rue', cp: '35000', ville: 'Rennes' });
    S.baux.push({ id: 'l1', bienId: 'b1', nom: 'Jean Dupontel', typeBail: 'vide', dateEntree: iso(e1), loyerHC: '500', charges: '0', jourPaiement: '5', revisions: [] },
      { id: 'l2', bienId: 'b2', nom: 'Léa Roux', typeBail: 'meuble', dateEntree: iso(e2), loyerHC: '450', charges: '0', jourPaiement: '5', revisions: [] },
      { id: 'l3', bienId: 'b3', nom: 'Max Mobil', typeBail: 'mobilite', dateEntree: iso(addMonthsDate(TODAY, -2)), dateFin: iso(addMonthsDate(TODAY, 4)), loyerHC: '400', charges: '0', jourPaiement: '5', revisions: [] });
    render(); });
  const c1 = await p.evaluate(() => { const c = infoConge(bail('l1')); return { ech: iso(c.ech), lim: iso(c.lim), p: c.preavis, rate: !!c.rate }; });
  const att = await p.evaluate(() => ({ ech: iso(addMonthsDate(addMonthsDate(addMonthsDate(TODAY, 7), -72), 72)) }));
  t(c1.p === 6 && c1.ech === att.ech && !c1.rate, 'vide : fin du bail ' + c1.ech + ', préavis 6 mois, limite ' + c1.lim);
  const c2 = await p.evaluate(() => { const c = infoConge(bail('l2')); return { p: c.preavis, rate: !!c.rate, ech: iso(c.ech) }; });
  t(c2.p === 3 && c2.rate, 'meublé : préavis 3 mois ; fin dans 2 mois = trop tard, c\'est la fin suivante (' + c2.ech + ')');
  // mobilité : pas de congé
  await p.evaluate(() => congeBailleur('l3')); await p.waitForTimeout(200);
  t(/bail mobilité se termine tout seul/.test(await p.evaluate(() => (document.getElementById('toast') || {}).innerText || '')), 'bail mobilité : "se termine tout seul, pas de congé"');
  // vente
  await p.evaluate(() => congeBailleur('l1')); await p.waitForTimeout(300);
  let o = await p.locator('#overlay').innerText();
  t(/Fin du bail le/.test(o) && /avant le/.test(o) && /recommandée/.test(o), 'fenêtre : fin du bail, date limite, envoi en recommandé');
  t(await p.isVisible('#overlay [name=prix]') && !(await p.isVisible('#overlay [name=justif]')), 'vente : seul le prix est demandé (les autres champs sont cachés)');
  await p.screenshot({ path: OUT + '/conge.png' });
  await p.locator('#overlay button.primary').click(); await p.waitForTimeout(300);
  t(await p.isVisible('#overlay [name=prix]'), 'sans prix : la lettre n\'est pas faite (le prix est obligatoire)');
  await p.fill('#overlay [name=prix]', '185000'); await p.locator('#overlay button.primary').click(); await p.waitForTimeout(800);
  let doc = await p.locator('#paper').innerText().catch(() => '');
  t(/congé pour vente/.test(doc) && /article 15/.test(doc) && /185\s?000,00\s€/.test(doc) && /deux premiers mois/.test(doc) && /notice d'information/.test(doc), 'lettre vente : article 15, offre au locataire à 185 000 €, notice jointe');
  t(await p.evaluate(() => bail('l1').conge && bail('l1').conge.motif === 'vente'), 'congé noté sur la fiche du locataire');
  await p.screenshot({ path: OUT + '/conge-lettre.png', fullPage: true });
  await p.evaluate(() => fermerDoc()); await p.waitForTimeout(200);
  // reprise refusée pour une SCI non familiale
  await p.evaluate(() => congeBailleur('l1')); await p.waitForTimeout(300); await p.selectOption('#overlay [name=motif]', 'reprise');
  t(/SCI qui n'est pas familiale ne peut pas reprendre/.test(await p.locator('#overlay').innerText()), 'reprise + SCI non familiale : avertissement clair');
  await p.fill('#overlay [name=benef]', 'Paul'); await p.fill('#overlay [name=justif]', 'x'); await p.locator('#overlay button.primary').click(); await p.waitForTimeout(300);
  t(await p.isVisible('#overlay [name=benef]'), 'reprise refusée pour une SCI non familiale');
  // motif légitime, meublé
  await p.evaluate(() => { closeOverlay(); congeBailleur('l2'); }); await p.waitForTimeout(300); await p.selectOption('#overlay [name=motif]', 'motif');
  await p.fill('#overlay [name=motifTxt]', 'Loyers impayés de mars à juin 2026.'); await p.locator('#overlay button.primary').click(); await p.waitForTimeout(800);
  doc = await p.locator('#paper').innerText().catch(() => '');
  t(/motif légitime et sérieux/.test(doc) && /article 25-8/.test(doc) && /Loyers impayés de mars/.test(doc) && !/notice d'information/.test(doc), 'lettre meublé motif légitime : article 25-8, pas de notice');
  await p.evaluate(() => fermerDoc());
  // SCI familiale : la reprise passe
  await p.evaluate(() => { S.sci.familiale = true; congeBailleur('l1'); }); await p.waitForTimeout(300); await p.selectOption('#overlay [name=motif]', 'reprise');
  await p.fill('#overlay [name=benef]', 'Paul Test'); await p.selectOption('#overlay [name=lien]', 'enfant'); await p.fill('#overlay [name=justif]', 'Il commence ses études à Rennes en septembre.');
  await p.locator('#overlay button.primary').click(); await p.waitForTimeout(800);
  doc = await p.locator('#paper').innerText().catch(() => '');
  t(/congé pour reprise/.test(doc) && /Paul Test/.test(doc) && /enfant d'un associé/.test(doc) && /réelle et sérieuse : Il commence/.test(doc), 'SCI familiale : lettre de reprise au bénéfice de Paul Test, justifiée');
  await p.evaluate(() => fermerDoc());
  // menu de la fiche
  await p.evaluate(() => { go('bail-l1'); render(); }); await p.waitForTimeout(300);
  t((await p.locator('#app').innerHTML()).includes("congeBailleur('l1')"), 'fiche du locataire › Plus : "📤 Lui donner congé"');
  t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

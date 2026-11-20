// Rangement en un toucher + relevé "quel document précisément" (retour de Théo, 20/11) — mode local, espace d'exemple, iPhone 13.
const { chromium, devices } = require('playwright'); const fs = require('fs'), path = require('path');
const src = fs.readFileSync(__dirname + '/test4.js', 'utf8');
let FAKE = fs.readFileSync(__dirname + '/test2.js', 'utf8').split('const FAKE = `')[1].split('`;')[0];
const mcpBlock = src.split("FAKE = FAKE.replace(/const mcp = \\{[\\s\\S]*?\\};\\n/, `")[1].split("`);")[0];
FAKE = FAKE.replace(/const mcp = \{[\s\S]*?\};\n/, mcpBlock);
const OUT = __dirname + '/shots105'; fs.mkdirSync(OUT, { recursive: true });
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const gen = await b.newPage(); const pdf = async h => { await gen.setContent(`<html><body style="font:14px Arial;padding:30px">${h}</body></html>`); return gen.pdf({ format: 'A4' }); };
  fs.writeFileSync(OUT + '/rib.pdf', await pdf('<h1>RELEVÉ D\'IDENTITÉ BANCAIRE</h1><p>Titulaire : SCI EXEMPLE</p><p>IBAN FR76 3000 4000 0500 0000 0000 000 · BIC CMCIFRPP</p><p>Domiciliation : CIC RENNES</p>' + '<p>Ce relevé est destiné à être remis à vos créanciers ou débiteurs pour les virements et prélèvements.</p>'.repeat(3)));
  fs.writeFileSync(OUT + '/facture.pdf', await pdf('<h1>FACTURE N° 2211</h1><p>Plomberie Dupont · Intervention fuite cuisine</p><p>TOTAL TTC 1 280,00 €</p>' + '<p>Conditions de paiement : à réception. Pénalités de retard : 3 fois le taux d\'intérêt légal.</p>'.repeat(3)));
  await gen.close();
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.route('**/pdf.js/3.11.174/pdf.min.js', r => r.fulfill({ path: __dirname + '/vendor/pdfjs/pdf.min.js', contentType: 'application/javascript' }));
  await p.route('**/pdf.js/3.11.174/pdf.worker.min.js', r => r.fulfill({ path: __dirname + '/vendor/pdfjs/pdf.worker.min.js', contentType: 'application/javascript' }));
  await p.addInitScript(FAKE); await p.goto('file://' + path.join(__dirname, '..', 'index.html')); await p.waitForTimeout(500);
  const toastTxt = () => p.evaluate(() => { const t = document.getElementById('toast'); return t && !t.hidden ? t.innerText : ''; });
  // ---- Relevé : le bon document, montré ----
  await p.evaluate(() => { S = demo(); render(); importerReleve(); }); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/1-releve.png' });
  const g = await p.evaluate(() => document.getElementById('overlay').innerText);
  const moisAvant = await p.evaluate(() => deM(addM(CUR, -1)));
  ok(`dit précisément quel document : "relevé de compte ${moisAvant}"`, g.includes('relevé de compte ' + moisAvant));
  ok('exemple de relevé montré (Date, Opération, Débit, Crédit, ligne du loyer)', /RELEVÉ DE COMPTE/.test(g) && /Débit/i.test(g) && /Crédit/i.test(g) && /la ligne du loyer/.test(g));
  ok('ce qui marche et ce qui ne marche pas (RIB, capture, avis)', /arrivent les loyers/.test(g) && /Un mois entier/.test(g) && /Pas un RIB/.test(g));
  ok('où le trouver, replié, avec les mots de la banque (Relevés, e-Documents)', await p.evaluate(() => { const d = [...document.querySelectorAll('#overlay details')].find(x => /Où le trouver/.test(x.textContent)); return d && !d.open && /e-Documents/.test(d.textContent); }));
  ok('un seul bouton principal "Choisir le relevé"', await p.locator('#overlay button.primary').count() === 1);
  // mauvais documents : messages précis
  await p.setInputFiles('#relfile', OUT + '/rib.pdf'); await p.waitForTimeout(2500);
  const m1 = await p.evaluate(() => document.getElementById('overlay').innerText);
  await p.screenshot({ path: OUT + '/2-rib.png' });
  ok('un RIB : "C\'est un RIB…" + le bon document montré + "Choisir un autre fichier"', /C'est un RIB/.test(m1) && /RELEVÉ DE COMPTE/.test(m1) && /Choisir un autre fichier/.test(m1) && await p.locator('#overlay #relfile').count() === 1);
  await p.setInputFiles('#overlay #relfile', OUT + '/facture.pdf'); await p.waitForTimeout(2500);
  ok('une facture : "range-le dans Docs, et donne ici le relevé"', /n'est pas un relevé de banque/.test(await p.evaluate(() => document.getElementById('overlay').innerText)));
  await p.evaluate(() => closeOverlay());
  ok('tâche du mois : "Donner ton relevé de banque <mois>"', await p.evaluate(() => { const t = taches().find(t => /^rel-/.test(t.key)); return !t || (/Donner ton relevé de banque/.test(t.t) && t.acts.length === 1); }));
  // ---- Ranger un papier reçu en un toucher ----
  const ids = await p.evaluate(() => { const bi = S.biens.filter(b => !b.immeuble);
    S.fichiers.push({ id: 'r1', boite: true, nom: 'Facture plombier Agon', type: 'application/pdf', date: iso(TODAY), bienId: '' }, { id: 'r2', boite: true, nom: 'scan_0042', type: 'image/jpeg', date: iso(TODAY), bienId: '' }, { id: 'r3', boite: true, nom: 'Attestation assurance', type: 'application/pdf', date: iso(TODAY), bienId: '' });
    LU_RECUS.r1 = { bienId: bi[0].id, cat: 'Factures et travaux' }; LU_RECUS.r3 = { bienId: bi[1].id, cat: 'Assurance' }; return { b0: bi[0].id, b1: bi[1].id, nb: S.biens.length }; });
  await p.evaluate(() => rangerRecu('r2')); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/3-ou-ranger.png' });
  ok(`"Où va ce papier ?" : un gros bouton par logement (${ids.nb})`, await p.locator('#overlay .ou-ranger button').count() === ids.nb);
  ok('"Ouvrir pour vérifier" au même endroit', /Ouvrir pour vérifier/.test(await p.evaluate(() => document.getElementById('overlay').innerText)));
  await p.locator('#overlay .ou-ranger button').nth(1).click(); await p.waitForTimeout(300);
  const t1 = await toastTxt();
  ok(`un toucher et c'est rangé, avec "Modifier" et "Annuler" (${t1.replace(/\s+/g, ' ')})`, /Rangé dans/.test(t1) && /Modifier/.test(t1) && /Annuler/.test(t1) && await p.evaluate(() => !!S.fichiers.find(f => f.id === 'r2').bienId) && await p.evaluate(() => document.getElementById('overlay').hidden));
  await p.evaluate(() => [...document.querySelectorAll('#toast .toast-undo')].find(x => x.textContent === 'Annuler').click()); await p.waitForTimeout(200);
  ok('Annuler : le papier revient dans la boîte', await p.evaluate(() => !S.fichiers.find(f => f.id === 'r2').bienId));
  await p.evaluate(() => rangerRecu('r1')); await p.waitForTimeout(200);
  ok('le logement le plus probable est en premier, en vert', await p.evaluate(b0 => { const x = document.querySelector('#overlay .ou-ranger button'); return x.classList.contains('primary') && x.getAttribute('onclick').includes(b0) && /le plus probable/.test(x.textContent); }, ids.b0));
  await p.evaluate(() => closeOverlay());
  await p.evaluate(() => rangerTousProposes()); await p.waitForTimeout(200);
  ok('"Ranger les proposés" : 2 papiers rangés d\'un coup, au bon endroit, bonne catégorie', /2 papiers rangés/.test(await toastTxt()) && await p.evaluate(x => { const a = S.fichiers.find(f => f.id === 'r1'), c = S.fichiers.find(f => f.id === 'r3'); return a.bienId === x.b0 && a.cat === 'Factures et travaux' && c.bienId === x.b1 && c.cat === 'Assurance'; }, ids));
  // ---- Fichier du Drive pas encore rangé : un toucher ----
  // (en local, la liste du Drive est celle du connecteur Claude : on vérifie la ligne et le rangement directement)
  await p.evaluate(() => { location.hash = 'docs'; render(); }); await p.waitForTimeout(1500);
  const ligne = await p.evaluate(() => { const m = MCP; MCP = null; view.docVue = 'nonranges'; const f = DOCS.fichiers.find(f => !rangeOu(f.id).length); const h = f ? ligneDoc(f) : ''; MCP = m; view.docVue = ''; return { h, id: f && f.id }; });
  ok('Drive "Pas encore rangés" : la ligne dit "Ranger" et ouvre directement "Où va … ?"', /pill">Ranger/.test(ligne.h) && /rangerDocDrive\(/.test(ligne.h));
  await p.evaluate(id => rangerDocDrive(id), ligne.id); await p.waitForTimeout(300);
  ok('"Où va … ?" pour un fichier du Drive : un bouton par logement', await p.locator('#overlay .ou-ranger button').count() === ids.nb);
  await p.locator('#overlay .ou-ranger button').first().click(); await p.waitForTimeout(1500);
  ok('rangé depuis le Drive en un toucher (avec Annuler)', /Rangé dans/.test(await toastTxt()) && /Annuler/.test(await toastTxt()) && await p.evaluate(id => S.fichiers.some(f => f.driveId === id), ligne.id));
  ok('aucune erreur', !errs.length); if (errs.length) console.log(errs);
  await b.close(); console.log(KO ? `\n${KO} échec(s)` : '\nTout est bon'); process.exit(KO ? 1 : 0);
})();

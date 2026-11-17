// Activité entre associés (vraie base, 2 vrais comptes) : B (associé) enregistre un paiement, ajoute et supprime une dépense,
// écrit au locataire ; A (propriétaire) le voit sur l'accueil ("👥 Ce que font tes associés"), et un document au même locataire le prévient.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist');
const env = Object.fromEntries(fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split('\n').filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.split('=')[0], l.slice(l.indexOf('=') + 1).replace(/^"|"$/g, '')]));
const sql = async q => JSON.parse(require('child_process').execFileSync('python3', [path.join(__dirname, 'sql.py'), q], { env: { ...process.env, ...env } }).toString());
const types = { '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); }).listen(8099);
let ok = 0, ko = 0; const t = (c, m) => { c ? ok++ : ko++; console.log((c ? 'OK ' : 'KO ') + m); };
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const page = async () => { const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true, serviceWorkers: 'block' })).newPage(); p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
    await p.route('**/jspdf.umd.min.js', r => r.fulfill({ path: __dirname + '/vendor/jspdfpkg/package/dist/jspdf.umd.min.js', contentType: 'application/javascript' })); await p.goto('http://localhost:8099/'); await p.waitForTimeout(1200); return p; };
  const A = await page();
  await A.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await A.waitForTimeout(1500); await A.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await A.fill('#esp_nom', 'Test activité'); await A.click('#esp_btn'); await A.waitForTimeout(2000);
  const esp = await A.evaluate(async () => {
    S.biens.push({ id: 'b1', nom: 'Studio', type: 'Studio', adresse: '1 rue', cp: '35000', ville: 'Rennes', meuble: 'vide' });
    S.baux.push({ id: 'l1', bienId: 'b1', nom: 'Jean Dupontel', email: 'jean@exemple.fr', typeBail: 'vide', dateEntree: addM(CUR, -2) + '-01', loyerHC: '500', charges: '50', jourPaiement: '5', revisions: [] });
    S.depenses.push({ id: 'dA', date: iso(TODAY), montant: 30, categorie: 'Frais bancaires', bienId: '', libelle: 'Frais de A' });
    save(); await new Promise(r => setTimeout(r, 1500));
    await SB.from('invitations').insert({ espace_id: ESPACE, email: 'test-b@gestion-test.fr' }); return ESPACE; });
  // B : associé
  const B = await page();
  await B.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-b@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await B.waitForTimeout(1500); await B.evaluate(e => ouvrirEspace(e), esp); await B.waitForTimeout(2500);
  const uB = await B.evaluate(async () => {
    S.paiements.push({ id: 'pB', bailId: 'l1', mois: CUR, montant: 550, date: iso(TODAY), mode: 'virement' });
    S.depenses.push({ id: 'dB', date: iso(TODAY), montant: 120, categorie: "Travaux d'entretien / réparation", bienId: 'b1', libelle: 'Plombier' }, { id: 'dB2', date: iso(TODAY), montant: 40, categorie: 'Autre', bienId: '', libelle: 'Erreur' });
    save(); await new Promise(r => setTimeout(r, 2000));
    S.depenses = S.depenses.filter(d => d.id !== 'dB2'); save(); await new Promise(r => setTimeout(r, 2000)); return SB_USER.id; });
  await sql(`insert into envois (espace_id, par, destinataires, objet) values ('${esp}', '${uB}', array['jean@exemple.fr'], 'Relance : loyer de novembre')`);
  const qui = await sql(`select coll, doc_id, maj_par = '${uB}' as par_b from docs where espace_id = '${esp}' and doc_id in ('pB','dB','dA','l1')`);
  t(qui.find(x => x.doc_id === 'pB' && x.par_b) && qui.find(x => x.doc_id === 'dA' && !x.par_b), 'serveur : l\'auteur de chaque modif est noté (B pour son paiement, A pour sa dépense)');
  const sup = await sql(`select coll, doc_id from docs_supprimes where espace_id = '${esp}'`);
  t(sup.some(x => x.doc_id === 'dB2'), 'serveur : la suppression est gardée (qui, quoi)');
  // A voit l'activité de B
  await A.evaluate(async () => { await chargerMembres(); await chargerActivite(); location.hash = ''; render(); }); await A.waitForTimeout(800);
  const txt = await A.locator('.activite').innerText().catch(() => '');
  console.log(txt);
  await A.locator('.activite').scrollIntoViewIfNeeded().catch(() => {}); await A.screenshot({ path: __dirname + '/shots58/activite.png' });
  t(/Ce que font tes associés/.test(txt), 'accueil de A : carte "👥 Ce que font tes associés"');
  t(/Test a enregistré 550,00\s€ reçus de Jean Dupontel/.test(txt), 'paiement de B visible, avec son prénom');
  t(/a ajouté une dépense : Plombier \(120,00\s€\)/.test(txt) && /a supprimé la dépense Erreur/.test(txt), 'dépense ajoutée et dépense supprimée visibles');
  t(/a envoyé « Relance : loyer de novembre » à jean@exemple.fr/.test(txt), 'e-mail envoyé par B visible');
  t(!/Frais de A/.test(txt), 'ce que A a fait lui-même n\'apparaît pas');
  // anti-doublon : A ouvre une relance pour Jean
  await A.evaluate(() => { const b = bail('l1'); showDoc('<p>Test</p>', { titre: 'Relance', to: b.email, bailId: b.id }); }); await A.waitForTimeout(300);
  t(/Test a déjà écrit à jean@exemple\.fr/.test(await A.locator('#overlay').innerText()), 'document au même locataire : "👥 Test a déjà écrit à jean@… " en grand');
  // B ne voit pas sa propre activité
  await B.evaluate(async () => { await chargerMembres(); await chargerActivite(); }); const nb = await B.evaluate(() => ACTIVITE.filter(x => x.qui === SB_USER.id).length);
  t(nb === 0, 'B ne voit pas ses propres actions');
  t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  await A.evaluate(async () => { closeOverlay(); await SB.from('espaces').delete().eq('id', ESPACE); });
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

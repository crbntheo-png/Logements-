// Espace locataire, vraie base : le propriétaire crée le lien ; le locataire l'ouvre SANS compte, voit sa situation, ses
// quittances (PDF), son bail ; ne voit pas l'autre locataire ; signale un problème avec photo ; le propriétaire le voit dans
// À faire, ouvre la photo, "C'est réglé" ; mise à jour automatique ; lien désactivé = plus d'accès ; tables fermées à l'anonyme.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); }).listen(8099);
let ok = 0, ko = 0; const t = (c, m) => { c ? ok++ : ko++; console.log((c ? 'OK ' : 'KO ') + m); };
const OUT = __dirname + '/shots56'; fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const nouvelle = async (scheme = 'light') => { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true, serviceWorkers: 'block', colorScheme: scheme, acceptDownloads: true }); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
    await p.route('**/jspdf.umd.min.js', r => r.fulfill({ path: __dirname + '/vendor/jspdfpkg/package/dist/jspdf.umd.min.js', contentType: 'application/javascript' })); return p; };
  const p = await nouvelle();
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test espace locataire'); await p.click('#esp_btn'); await p.waitForTimeout(2000);
  await p.evaluate(async () => {
    const m0 = addM(CUR, -2);
    S.sci.nom = 'SCI Test Portail'; S.sci.iban = 'FR76 3000 6000 0112 3456 7890 189'; S.sci.telephone = '06 00 00 00 00';
    S.biens.push({ id: 'b1', nom: 'Studio', type: 'Studio', adresse: '1 rue des Lilas', cp: '35000', ville: 'Rennes', meuble: 'vide' }, { id: 'b2', nom: 'T2', type: 'T2', adresse: '2 rue', cp: '35000', ville: 'Rennes', meuble: 'vide' });
    S.baux.push({ id: 'l1', bienId: 'b1', nom: 'Jean Dupontel', email: 'jean@exemple.fr', telephone: '0611223344', typeBail: 'vide', dateEntree: m0 + '-01', suiviDepuis: m0, loyerHC: '500', charges: '50', jourPaiement: '5', revisions: [] },
                { id: 'l2', bienId: 'b2', nom: 'Marie Secretnom', email: 'marie@exemple.fr', typeBail: 'vide', dateEntree: m0 + '-01', suiviDepuis: m0, loyerHC: '900', charges: '0', jourPaiement: '5', revisions: [] });
    S.paiements.push({ id: 'p1', bailId: 'l1', mois: m0, montant: 550, date: m0 + '-04', mode: 'virement' }, { id: 'p2', bailId: 'l1', mois: addM(m0, 1), montant: 550, date: addM(m0, 1) + '-04', mode: 'virement' });
    const pdf = new window.jspdf.jsPDF(); pdf.text('Bail de Jean', 20, 20); const bl = pdf.output('blob'), ch = `${ESPACE}/b1/${uid()}.pdf`;
    await SB.storage.from('documents').upload(ch, bl, { contentType: 'application/pdf' });
    S.fichiers.push({ id: 'f1', bienId: 'b1', bailId: 'l1', cat: 'Bail', nom: 'Bail Jean signé', chemin: ch, type: 'application/pdf', date: iso(TODAY) });
    const ch2 = `${ESPACE}/b2/${uid()}.pdf`; await SB.storage.from('documents').upload(ch2, bl, { contentType: 'application/pdf' });
    S.fichiers.push({ id: 'f2', bienId: 'b2', bailId: 'l2', cat: 'Bail', nom: 'Bail Marie', chemin: ch2, type: 'application/pdf', date: iso(TODAY) });
    save(); go('bail-l1'); render();
  });
  await p.waitForTimeout(500);
  // menu Plus > Son espace locataire
  await p.evaluate(() => ouvrirPortail('l1')); await p.waitForTimeout(300);
  t(/Ce qu'il ne verra jamais/.test(await p.locator('#overlay').innerText()), 'fenêtre : ce qu\'il verra / ne verra jamais');
  await p.screenshot({ path: OUT + '/proprio-avant.png' });
  await p.click('#overlay button.primary'); await p.waitForTimeout(2500);
  const lien = await p.inputValue('#portail_lien').catch(() => '');
  t(/^https:\/\/sci-gestion-locative\.com\/#locataire=[A-Za-z0-9_-]{40,}$/.test(lien), 'lien créé : ' + lien.slice(0, 60) + '…');
  const jeton = lien.split('=')[1];
  t(await p.evaluate(() => !!bail('l1').portail), 'lien gardé sur la fiche du locataire');
  await p.screenshot({ path: OUT + '/proprio-lien.png' });
  // ---- le locataire, sans compte
  const L = await nouvelle();
  await L.goto('http://localhost:8099/#locataire=' + jeton); await L.waitForTimeout(3500);
  const txt = await L.locator('#app').innerText();
  await L.screenshot({ path: OUT + '/locataire.png', fullPage: true });
  t(/Mon logement/.test(txt) && /1 rue des Lilas/.test(txt) && /Bonjour Jean Dupontel/.test(txt), 'locataire : son logement, son nom');
  t(/Vous êtes à jour|Reste à payer/.test(txt), 'locataire : sa situation en grand');
  t((await L.locator('button:has-text("Quittance")').count()) >= 2, 'locataire : ses quittances (' + (await L.locator('button:has-text("Quittance")').count()) + ')');
  t(/Bail Jean signé/.test(txt) && !/Bail Marie/.test(txt), 'locataire : son bail, pas celui de l\'autre');
  t(!/Marie|Secretnom|900/.test(txt), 'locataire : rien sur l\'autre locataire');
  t(!(await L.isVisible('#bottomnav a')) && !(await L.isVisible('.top-acts')), 'locataire : pas de menu de l\'appli');
  t(/FR76 3000/.test(txt), 'locataire : IBAN pour le virement');
  const [dl] = await Promise.all([L.waitForEvent('download', { timeout: 8000 }).catch(() => null), L.locator('button:has-text("Quittance")').first().click()]);
  t(dl && /\.pdf$/.test(dl.suggestedFilename()), 'locataire : quittance en PDF (' + (dl ? dl.suggestedFilename() : 'aucun') + ')');
  const docOk = await L.evaluate(async () => { const u = LOC.docs[0].url; const r = await fetch(u); return r.ok && (await r.text()).startsWith('%PDF'); });
  t(docOk, 'locataire : son bail s\'ouvre (lien temporaire)');
  // signaler avec photo
  await L.fill('#loc_texte', 'Fuite sous l\'évier de la cuisine');
  await L.setInputFiles('#loc_photo', __dirname + '/shots53/qauto.png');
  await L.click('#loc_btn'); await L.waitForTimeout(5000);
  t(/Envoyée/.test(await L.locator('#app').innerText()), 'locataire : demande envoyée, visible dans "Mes demandes"');
  // ---- le propriétaire la voit
  await p.evaluate(async () => { closeOverlay(); await chargerDemandes(); go('afaire'); render(); }); await p.waitForTimeout(500);
  t(/Jean Dupontel signale un problème/.test(await p.locator('#app').innerText()) && /photo/.test(await p.locator('#app').innerText()), 'propriétaire : "🔧 Jean signale un problème" dans À faire');
  const did = await p.evaluate(() => DEMANDES[0] && DEMANDES[0].id);
  await p.evaluate(id => voirDemande(id), did); await p.waitForTimeout(1500);
  t(await p.evaluate(() => { const i = document.querySelector('.demande-photo'); return !!(i && i.complete && i.naturalWidth > 0); }), 'propriétaire : la photo s\'affiche');
  await p.screenshot({ path: OUT + '/proprio-demande.png' });
  await p.click('#overlay button.primary'); await p.waitForTimeout(1500);
  t(await p.evaluate(() => !DEMANDES.length), 'propriétaire : "C\'est réglé" la retire de À faire');
  // mise à jour automatique : un nouveau paiement chez le propriétaire
  await p.evaluate(() => { S.paiements.push({ id: 'p3', bailId: 'l1', mois: CUR, montant: 550, date: iso(TODAY), mode: 'virement' }); save(); }); await p.waitForTimeout(4000);
  await L.reload(); await L.waitForTimeout(3500);
  const t2 = await L.locator('#app').innerText();
  t(/Réglé/.test(t2), 'locataire : sa demande passe à "Réglé"'); if (!/Réglé/.test(t2)) console.log(t2.slice(-400), JSON.stringify(await L.evaluate(() => LOC.demandes)));
  t(await L.evaluate(() => LOC.donnees.mois.some(e => e.m === CUR && e.statut === 'paye')), 'locataire : le nouveau paiement apparaît tout seul');
  // sécurité : l'anonyme ne lit pas les tables
  const sec = await L.evaluate(async () => { const c = window.supabase.createClient(APP_SUPABASE.url, APP_SUPABASE.cle); const a = await c.from('portails_locataire').select('*'); const d = await c.from('demandes_locataire').select('*'); const x = await c.from('docs').select('*').limit(1); return [(a.data || []).length, (d.data || []).length, (x.data || []).length]; });
  t(sec.every(n => n === 0), 'sécurité : rien de lisible sans le lien (tables fermées) ' + JSON.stringify(sec));
  const faux = await L.evaluate(async () => { const r = await fetch(APP_SUPABASE.url + '/functions/v1/locataire', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: APP_SUPABASE.cle }, body: JSON.stringify({ jeton: 'A'.repeat(43) }) }); return r.status; });
  t(faux === 404, 'sécurité : faux lien refusé');
  // désactiver
  await p.evaluate(() => desactiverPortail('l1')); await p.waitForTimeout(1500);
  await L.reload(); await L.waitForTimeout(3000);
  t(/Espace indisponible/.test(await L.locator('#app').innerText()), 'lien désactivé : le locataire n\'a plus accès');
  await L.screenshot({ path: OUT + '/locataire-off.png' });
  t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  await p.evaluate(async () => { const c = S.fichiers.filter(f => f.chemin).map(f => f.chemin); await SB.storage.from('documents').remove(c); const d = await SB.from('demandes_locataire').select('photo').eq('espace_id', ESPACE); await SB.storage.from('documents').remove((d.data || []).map(x => x.photo).filter(Boolean)); await SB.from('espaces').delete().eq('id', ESPACE); });
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

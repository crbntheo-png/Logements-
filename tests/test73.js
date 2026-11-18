// Suivi des interventions : le locataire signale un souci → le propriétaire en fait une intervention (artisan du carnet,
// date de passage) → À faire la suit (une seule ligne, pas de doublon avec la demande) → le locataire voit "Artisan prévu le…"
// → passage dépassé : "c'est fini ?" → Fini avec facture → dépense en compta, demande "Réglé" chez le locataire.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); }).listen(8099);
let ok = 0, ko = 0; const t = (c, m) => { c ? ok++ : ko++; console.log((c ? 'OK ' : 'KO ') + m); };
const OUT = __dirname + '/shots73'; fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const nouvelle = async () => { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true, serviceWorkers: 'block' }); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort()); return p; };
  const p = await nouvelle();
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test interventions'); await p.click('#esp_btn'); await p.waitForTimeout(2000);
  const ESP = await p.evaluate(() => ESPACE);
  await p.evaluate(async () => {
    S.sci.nom = 'SCI Test'; S.sci.gerant = 'Théo Test'; S.sci.contacts = [{ nom: 'Plomberie Martin', role: 'Plombier', email: 'martin@plomberie.fr' }];
    S.biens.push({ id: 'b1', nom: 'Studio', adresse: '1 rue des Lilas', cp: '35000', ville: 'Rennes' });
    S.baux.push({ id: 'l1', bienId: 'b1', nom: 'Jean Dupontel', email: 'jean@exemple.fr', telephone: '0611223344', typeBail: 'vide', dateEntree: addM(CUR, -2) + '-01', suiviDepuis: CUR, loyerHC: '500', charges: '0', jourPaiement: '5', revisions: [] });
    save(); await new Promise(r => setTimeout(r, 1500));
  });
  await p.evaluate(() => ouvrirPortail('l1')); await p.waitForTimeout(300); await p.click('#overlay button.primary'); await p.waitForTimeout(2500);
  const jeton = (await p.inputValue('#portail_lien')).split('=')[1]; await p.evaluate(() => closeOverlay());
  // le locataire signale
  const L = await nouvelle();
  await L.goto('http://localhost:8099/#locataire=' + jeton); await L.waitForTimeout(3500);
  await L.fill('#loc_texte', 'Fuite sous l\'évier de la cuisine'); await L.click('#loc_btn'); await L.waitForFunction(() => /Envoyée/.test(document.getElementById('app').innerText), null, { timeout: 15000 }).catch(() => {});
  t(/Envoyée/.test(await L.locator('#app').innerText()), 'locataire : demande envoyée');
  // le propriétaire en fait une intervention
  await p.evaluate(async () => { await chargerDemandes(); go('afaire'); render(); }); await p.waitForTimeout(400);
  const did = await p.evaluate(() => DEMANDES[0] && DEMANDES[0].id);
  await p.evaluate(id => voirDemande(id), did); await p.waitForTimeout(800);
  t(/En faire une intervention/.test(await p.locator('#overlay').innerText()), 'demande : bouton "🛠 En faire une intervention"');
  await p.locator('#overlay button', { hasText: 'En faire une intervention' }).click(); await p.waitForTimeout(500);
  const f = await p.evaluate(() => ({ titre: document.querySelector('#overlay [name=titre]').value, notes: document.querySelector('#overlay [name=notes]').value, liste: [...document.querySelectorAll('#artisans_l option')].map(o => o.value) }));
  t(/Fuite sous l'évier/.test(f.titre) && /Signalé par Jean Dupontel/.test(f.notes), 'intervention pré-remplie avec la demande');
  t(f.liste.includes('Plomberie Martin'), 'artisans du carnet d\'adresses proposés');
  await p.fill('#overlay [name=artisan]', 'Plomberie Martin'); await p.locator('#overlay [name=artisan]').dispatchEvent('change');
  t((await p.inputValue('#overlay [name=contact]')) === 'martin@plomberie.fr', 'artisan du carnet choisi : son e-mail se remplit tout seul');
  await p.selectOption('#overlay [name=statut]', 'prevu'); const demain = await p.evaluate(() => iso(addDays(TODAY, 2)));
  await p.fill('#overlay [name=date]', demain);
  await p.screenshot({ path: OUT + '/intervention.png' });
  await p.locator('#overlay button.primary').last().click(); await p.waitForTimeout(2500);
  const T1 = await p.evaluate(() => taches().filter(x => /Fuite|signale un problème/.test(x.t)).map(x => x.t));
  t(T1.length === 1 && /🛠 Fuite/.test(T1[0]), 'À faire : une seule ligne "🛠 Fuite… · Studio" (la demande n\'est plus en double) ' + JSON.stringify(T1));
  // le locataire voit l'avancement
  await p.evaluate(async () => { await publierPortails(); }); await p.waitForTimeout(1000);
  await L.reload(); await L.waitForTimeout(3500); let lt = await L.locator('#app').innerText();
  t(/Artisan prévu/.test(lt) && /passage prévu le/.test(lt), 'locataire : "🛠 Artisan prévu" + date de passage');
  await L.screenshot({ path: OUT + '/locataire-suivi.png', fullPage: true });
  // messages prêts pour l'artisan et le locataire
  const msgs = await p.evaluate(() => { const bi = bien('b1'), tr = bi.travaux[0]; return [msgArtisan(bi, tr), msgLocataireTravaux(bi, tr)]; });
  t(/1 rue des Lilas/.test(msgs[0]) && /Jean Dupontel · 0611223344/.test(msgs[0]) && /Fuite/.test(msgs[0]), 'message artisan : adresse, locataire et téléphone, problème');
  t(/Plomberie Martin passera le/.test(msgs[1]), 'message locataire : "Plomberie Martin passera le …"');
  // le passage est dépassé → "c'est fini ?"
  const T2 = await p.evaluate(() => { const tr = bien('b1').travaux[0]; tr.date = iso(addDays(TODAY, -1)); save(); return taches().find(x => /🛠 Fuite/.test(x.t)); });
  t(T2 && T2.prio === 'soon' && /c'est fini/.test(T2.d) && /C'est fini/.test(T2.acts[0][0]), 'passage dépassé : "c\'est fini ?" avec le bouton ✓');
  await p.evaluate(() => { go('afaire'); render(); }); await p.waitForTimeout(300);
  await p.locator('.task', { hasText: 'Fuite' }).locator('button', { hasText: "C'est fini" }).click().catch(async () => { await p.evaluate(() => { const tr = bien('b1').travaux[0]; editTravaux('b1', tr.id, { statut: 'fini' }); }); });
  await p.waitForTimeout(500);
  t((await p.inputValue('#overlay [name=statut]')) === 'fini', 'le bouton ouvre l\'intervention sur "Fini"');
  await p.fill('#overlay [name=facture]', '180'); await p.locator('#overlay button.primary').last().click(); await p.waitForTimeout(3000);
  const fin = await p.evaluate(() => ({ dep: S.depenses.filter(d => d.travauxId).map(d => d.montant), tache: taches().some(x => /Fuite/.test(x.t)), dem: DEMANDES.length }));
  t(fin.dep[0] === 180 && !fin.tache && fin.dem === 0, 'fini : facture 180 € en compta, plus rien dans À faire, demande réglée ' + JSON.stringify(fin));
  const st = await p.evaluate(async id => (await SB.from('demandes_locataire').select('statut').eq('id', id).single()).data.statut, did);
  t(st === 'traite', 'serveur : demande marquée réglée');
  await L.reload(); await L.waitForTimeout(3500); lt = await L.locator('#app').innerText();
  t(/Réglé/.test(lt), 'locataire : "✓ Réglé"');
  // fiche du logement
  await p.evaluate(() => { go('bien-b1'); render(); }); await p.waitForTimeout(300);
  t(/Travaux et interventions/.test(await p.locator('#app').innerText()), 'fiche logement : "Travaux et interventions" avec l\'historique');
  t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  await p.evaluate(async esp => { await SB.from('espaces').delete().eq('id', esp); }, ESP);
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

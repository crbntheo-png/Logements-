// Attestation d'assurance déposée par le locataire : À faire propose "📲 Lui demander (son espace)" (espace créé tout seul),
// le locataire envoie sa photo/PDF depuis son espace, le document arrive dans le logement, À faire "🛡️ X a envoyé son
// attestation" (IA / Voir / C'est bon) à la place de la demande, "C'est bon" enregistre la date de fin.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); }).listen(8099);
let ok = 0, ko = 0; const t = (c, m) => { c ? ok++ : ko++; console.log((c ? 'OK ' : 'KO ') + m); };
const OUT = __dirname + '/shots73';
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const nouvelle = async () => { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true, serviceWorkers: 'block' }); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort()); return p; };
  const p = await nouvelle();
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test assurance'); await p.click('#esp_btn'); await p.waitForTimeout(2000);
  const ESP = await p.evaluate(() => ESPACE);
  await p.evaluate(async () => { S.sci.nom = 'SCI Test';
    S.biens.push({ id: 'b1', nom: 'Studio', adresse: '1 rue des Lilas', cp: '35000', ville: 'Rennes' });
    S.baux.push({ id: 'l1', bienId: 'b1', nom: 'Jean Dupontel', typeBail: 'vide', dateEntree: addM(CUR, -2) + '-01', suiviDepuis: CUR, loyerHC: '500', charges: '0', jourPaiement: '5', revisions: [] });
    save(); await chargerMembres(); await new Promise(r => setTimeout(r, 1500)); });
  const T0 = await p.evaluate(() => taches().find(x => x.key.startsWith('ass-l1')));
  t(T0 && /Lui demander \(son espace\)/.test(T0.acts[0][0]), 'À faire assurance : "📲 Lui demander (son espace)" en premier');
  await p.evaluate(() => demanderAssuranceEspace('l1')); await p.waitForTimeout(2500);
  const jeton = await p.evaluate(() => bail('l1').portail); t(!!jeton, 'son espace locataire est créé tout seul');
  // le locataire
  const L = await nouvelle();
  await L.goto('http://localhost:8099/#locataire=' + jeton); await L.waitForTimeout(3500);
  let lt = await L.locator('#app').innerText();
  t(/Mon assurance habitation/.test(lt) && /pas encore votre attestation/.test(lt), 'locataire : "🛡️ Mon assurance habitation", attestation demandée');
  await L.setInputFiles('#loc_ass', OUT + '/bulletins.pdf'); await L.screenshot({ path: OUT + '/assurance-locataire.png' });
  await L.click('#loc_ass_btn'); await L.waitForFunction(() => /Attestation envoyée/.test(document.getElementById('app').innerText), null, { timeout: 15000 }).catch(() => {});
  t(/Attestation envoyée/.test(await L.locator('#app').innerText()), 'locataire : "✅ Attestation envoyée… Merci !"');
  const anon = await L.evaluate(async () => { const u = window.APP_SUPABASE.url, k = window.APP_SUPABASE.cle; const r = await (await fetch(u + '/rest/v1/depots_locataire?select=*', { headers: { apikey: k, Authorization: 'Bearer ' + k } })).json(); return Array.isArray(r) ? r.length : -1; });
  t(anon === 0, 'sécurité : rien de lisible sans compte');
  // le propriétaire
  await p.evaluate(async () => { await chargerDepots(); }); await p.waitForTimeout(800);
  const f = await p.evaluate(() => S.fichiers.filter(x => x.parLocataire).map(x => ({ nom: x.nom, bienId: x.bienId, cat: x.cat })));
  t(f.length === 1 && f[0].bienId === 'b1' && /Attestation d'assurance envoyée par Jean Dupontel/.test(f[0].nom), 'le document arrive dans le logement ' + JSON.stringify(f));
  const st = await p.evaluate(async () => (await SB.from('depots_locataire').select('statut').eq('espace_id', ESPACE)).data.map(x => x.statut));
  t(st.length === 1 && st[0] === 'traite', 'serveur : dépôt marqué traité (pas de doublon au prochain chargement)');
  await p.evaluate(async () => { await chargerDepots(); }); t((await p.evaluate(() => S.fichiers.filter(x => x.parLocataire).length)) === 1, 'rechargement : toujours un seul document');
  const T = await p.evaluate(() => taches().filter(x => /attestation/i.test(x.t)).map(x => ({ t: x.t, p: x.prio, a: x.acts.map(y => y[0]) })));
  t(T.length === 1 && /Jean Dupontel a envoyé son attestation/.test(T[0].t) && T[0].p === 'urgent' && T[0].a.includes('🤖 Lire la date'), 'À faire : "🛡️ Jean Dupontel a envoyé son attestation" (IA, Voir, C\'est bon), la demande disparaît ' + JSON.stringify(T));
  const fid = await p.evaluate(() => S.fichiers.find(x => x.parLocataire).id);
  await p.evaluate(id => traiterDepot(id, 'ok'), fid); await p.waitForTimeout(400);
  await p.fill('#overlay [name=fin]', '2027-10-31'); await p.click('#overlay button.primary'); await p.waitForTimeout(1200);
  const fin = await p.evaluate(() => ({ fin: bail('l1').assuranceFin, t: taches().filter(x => /attestation/i.test(x.t)).length, conf: !document.getElementById('overlay').hidden && /Ranger aussi/.test(document.getElementById('overlay').innerText) }));
  t(fin.fin === '2027-10-31' && fin.t === 0 && !fin.conf, '"C\'est bon" : assuré jusqu\'au 31/10/2027, plus rien dans À faire, pas de question en double ' + JSON.stringify(fin));
  await p.evaluate(async () => { await publierPortails(); }); await L.reload(); await L.waitForTimeout(3500);
  t(/Valable jusqu'au 31 octobre 2027|Attestation envoyée/.test(await L.locator('#app').innerText()), 'locataire : son assurance apparaît comme reçue');
  t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  await p.evaluate(async esp => { const r = await SB.from('depots_locataire').select('chemin').eq('espace_id', esp); const ch = (r.data || []).map(x => x.chemin); if (ch.length) await SB.storage.from('documents').remove(ch); await SB.from('espaces').delete().eq('id', esp); }, ESP);
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

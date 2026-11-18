// Signature à distance, vraie base : le bailleur signe sur son téléphone et envoie l'avenant dans l'espace du locataire ;
// le locataire (sans compte) le lit et signe avec le doigt ; preuve gardée (IP, date, empreinte) ; le propriétaire est
// prévenu dans À faire, ouvre le PDF avec les deux signatures et le range ; sécurité (pas de double signature, rien de lisible).
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); }).listen(8099);
let ok = 0, ko = 0; const t = (c, m) => { c ? ok++ : ko++; console.log((c ? 'OK ' : 'KO ') + m); };
const OUT = __dirname + '/shots73';
const dessiner = async (p) => { const bx = await p.locator('#sigZone').boundingBox(); await p.mouse.move(bx.x + 30, bx.y + 60); await p.mouse.down(); for (let i = 1; i < 12; i++) await p.mouse.move(bx.x + 30 + i * 18, bx.y + 60 + (i % 2 ? -25 : 25)); await p.mouse.up(); };
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const nouvelle = async () => { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true, serviceWorkers: 'block' }); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
    await p.route('**/jspdf.umd.min.js', r => r.fulfill({ path: __dirname + '/vendor/jspdfpkg/package/dist/jspdf.umd.min.js', contentType: 'application/javascript' })); return p; };
  const p = await nouvelle();
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test signature distance'); await p.click('#esp_btn'); await p.waitForTimeout(2000);
  const ESP = await p.evaluate(() => ESPACE);
  await p.evaluate(async () => { S.sci.nom = 'SCI Test'; S.sci.gerant = 'Théo Test';
    S.biens.push({ id: 'b1', nom: 'Studio', adresse: '1 rue des Lilas', cp: '35000', ville: 'Rennes' });
    S.baux.push({ id: 'l1', bienId: 'b1', nom: 'Jean Dupontel', email: 'jean@exemple.fr', telephone: '0611223344', typeBail: 'vide', dateEntree: addM(CUR, -2) + '-01', suiviDepuis: CUR, loyerHC: '500', charges: '0', jourPaiement: '5', revisions: [] });
    save(); await chargerMembres();
    showDoc('<h1>Avenant n° 1</h1><p>Les ordures ménagères sont ajoutées aux charges à partir du 1er janvier 2027.</p><div class="sign"><div><b>Le bailleur</b><br><span class="small">Signature</span></div><div><b>Le locataire</b><br><span class="small">Signature précédée de « lu et approuvé »</span></div></div>', { titre: 'Avenant n° 1', bailId: 'l1' });
  });
  await p.waitForTimeout(400);
  // le bailleur signe sur son téléphone
  await p.evaluate(() => dessinerSignature(0)); await p.waitForTimeout(300); await dessiner(p); await p.click('#sigOk'); await p.waitForTimeout(400);
  t(await p.isVisible('#sigDistance'), 'panneau de signature : "📲 Lui faire signer à distance"');
  await p.screenshot({ path: OUT + '/sig-panneau.png' });
  await p.click('#sigDistance'); await p.waitForTimeout(3000);
  t(/Envoyé dans son espace/.test(await p.locator('#sigpad').innerText()), '"✅ Envoyé dans son espace" + bouton pour lui envoyer le lien');
  const row = await p.evaluate(async () => (await SB.from('signatures_distance').select('statut, index_locataire, sigs, empreinte').eq('espace_id', ESPACE).single()).data);
  t(row.statut === 'attente' && row.index_locataire === 1 && row.sigs['0'] && row.sigs['0'].nom === 'Théo Test SCI Test'.replace(' SCI', ' pour SCI') || (row.statut === 'attente' && row.sigs['0']), 'serveur : en attente, avec la signature du bailleur');
  const jeton = await p.evaluate(() => bail('l1').portail); t(!!jeton, 'espace locataire créé tout seul');
  await p.evaluate(() => { fermerSigPad(); closeOverlay(); });
  // le locataire signe
  const L = await nouvelle();
  await L.goto('http://localhost:8099/#locataire=' + jeton); await L.waitForTimeout(3500);
  t(/À signer/.test(await L.locator('#app').innerText()) && /Avenant n° 1/.test(await L.locator('#app').innerText()), 'locataire : "✍️ À signer · Avenant n° 1"');
  await L.click('button:has-text("Lire et signer")'); await L.waitForTimeout(500);
  const lu = await L.locator('#paper').innerText(); t(/ordures ménagères/.test(lu) && /Signé par Théo Test/.test(lu), 'locataire : lit le document, voit la signature du bailleur');
  await L.click('.loc-signer button'); await L.waitForTimeout(400);
  await L.click('#sigOk'); await L.waitForTimeout(300); t(await L.isVisible('#sigZone'), 'sans dessin ni accord : rien ne part');
  await dessiner(L); await L.check('#sigAccord'); await L.screenshot({ path: OUT + '/sig-locataire.png' });
  await L.click('#sigOk'); await L.waitForFunction(() => !!document.querySelector('.loc-asigner .pill.ok'), null, { timeout: 15000 }).catch(() => {});
  t(await L.locator('.loc-asigner .pill.ok').count() === 1 && !(await L.locator('.loc-asigner button:has-text("Lire et signer")').count()), 'locataire : "✓ Signé" dans sa liste');
  const r2 = await p.evaluate(async () => (await SB.from('signatures_distance').select('statut, ip, appareil, signature, signe_le').eq('espace_id', ESPACE).single()).data);
  t(r2.statut === 'signe' && r2.ip && r2.appareil && r2.signature.nom === 'Jean Dupontel' && r2.signature.distance && r2.signe_le, 'preuve gardée : IP, appareil, date, nom (' + r2.ip + ')');
  // sécurité
  const sec = await L.evaluate(async () => { const u = window.APP_SUPABASE.url, k = window.APP_SUPABASE.cle;
    const re = await appelLocataire({ action: 'signer', id: LOC.a_signer[0].id, nom: 'X', img: 'data:image/png;base64,iVBORw0KGgo=', accord: true }).then(() => 'accepté', e => e.message);
    const lire = await (await fetch(u + '/rest/v1/signatures_distance?select=*', { headers: { apikey: k, Authorization: 'Bearer ' + k } })).json();
    return [re, Array.isArray(lire) ? lire.length : -1]; });
  t(/déjà signé/.test(sec[0]) && sec[1] === 0, 'sécurité : pas de 2e signature, rien de lisible sans lien ' + JSON.stringify(sec));
  const triche = await p.evaluate(async () => (await SB.from('signatures_distance').update({ signature: { nom: 'Faux' } }).eq('espace_id', ESPACE)).error?.message || 'accepté');
  t(triche !== 'accepté', 'un membre ne peut pas réécrire la signature (' + triche.slice(0, 50) + ')');
  // le propriétaire range
  await p.evaluate(async () => { await chargerSignaturesDistance(); }); await p.waitForTimeout(300);
  const T = await p.evaluate(() => taches().find(x => /a signé/.test(x.t))); t(T && T.prio === 'urgent' && /Jean Dupontel a signé « Avenant n° 1 »/.test(T.t), 'À faire : "✍️ Jean Dupontel a signé « Avenant n° 1 »"');
  const sid = await p.evaluate(() => SIGD[0].id); await p.evaluate(id => ouvrirSigneDistance(id), sid); await p.waitForTimeout(1500);
  const doc = await p.locator('#paper').innerText(); t(/Signé sur écran par Théo Test/.test(doc) && /Signé à distance \(espace locataire\) par Jean Dupontel/.test(doc) && /réf\./.test(doc), 'PDF : signature du bailleur + "Signé à distance (espace locataire) par Jean Dupontel · réf."');
  t(await p.evaluate(() => document.querySelectorAll('#paper .sig-img').length) === 2, 'les deux signatures sont sur le document');
  await p.screenshot({ path: OUT + '/sig-final.png', fullPage: true });
  await p.click('#sigRanger'); await p.waitForTimeout(4000);
  const fin = await p.evaluate(async () => ({ f: S.fichiers.filter(f => f.signe).map(f => f.nom), st: (await SB.from('signatures_distance').select('statut').eq('espace_id', ESPACE).single()).data.statut, tache: taches().some(x => /a signé/.test(x.t)) }));
  t(fin.f.length === 1 && /Avenant n° 1 \(signé le/.test(fin.f[0]) && fin.st === 'range' && !fin.tache, 'PDF signé rangé dans le logement, plus rien dans À faire ' + JSON.stringify(fin));
  t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  await p.evaluate(async esp => { const r = await SB.from('docs').select('data').eq('espace_id', esp).eq('coll', 'fichiers'); const ch = (r.data || []).map(x => x.data.chemin).filter(Boolean); if (ch.length) await SB.storage.from('documents').remove(ch); await SB.from('espaces').delete().eq('id', esp); }, ESP);
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

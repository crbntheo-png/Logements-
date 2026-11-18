// Praticité : 1) "Créer les N espaces" pour tous les locataires + message prêt pour chacun ; 2) Partager › Gestion locative
// (sw.js reçoit le fichier, l'appli le dépose dans la boîte à documents "À ranger") ; 3) raccourci "Photo d'une facture".
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); }).listen(8099);
let ok = 0, ko = 0; const t = (c, m) => { c ? ok++ : ko++; console.log((c ? 'OK ' : 'KO ') + m); };
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true }); const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(1500);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test praticite'); await p.click('#esp_btn'); await p.waitForTimeout(2000);
  const ESP = await p.evaluate(() => ESPACE);
  await p.evaluate(async () => { S.biens.push({ id: 'b1', nom: 'T1', adresse: '1 rue', cp: '35000', ville: 'Rennes' }, { id: 'b2', nom: 'T2', adresse: '2 rue', cp: '35000', ville: 'Rennes' }, { id: 'b3', nom: 'T3', adresse: '3 rue', cp: '35000', ville: 'Rennes' });
    ['Jean Un', 'Léa Deux', 'Max Trois'].forEach((n, i) => S.baux.push({ id: 'l' + i, bienId: 'b' + (i + 1), nom: n, typeBail: 'vide', dateEntree: '2026-01-01', suiviDepuis: '2026-11', loyerHC: '500', charges: '0', jourPaiement: '5', revisions: [] }));
    save(); await chargerMembres(); go('locataires'); render(); });
  await p.waitForTimeout(800);
  t(/Aucun locataire n'a encore son espace/.test(await p.locator('.portails-cta').innerText().catch(() => '')), 'accueil : "Aucun locataire n\'a encore son espace" + "Créer les 3 espaces"');
  await p.click('.portails-cta button.primary'); await p.waitForTimeout(4000);
  const n = await p.evaluate(async () => (await SB.from('portails_locataire').select('bail_id').eq('espace_id', ESPACE)).data.length);
  t(n === 3 && await p.evaluate(() => S.baux.every(b => b.portail)), '3 espaces créés d\'un coup');
  t((await p.locator('#overlay .portails-l li').count()) === 3, 'liste des 3 locataires avec "📲 Envoyer" pour chacun');
  await p.locator('#overlay .portails-l li').first().locator('button').click(); await p.waitForTimeout(300);
  t(/Envoyé le/.test(await p.locator('#overlay .portails-l li').first().innerText()), 'envoyé : "Envoyé le …" (message copié, pas de téléphone)');
  await p.evaluate(() => closeOverlay()); await p.waitForTimeout(200);
  t(!(await p.locator('.portails-cta').count()), 'tout le monde a son espace : la carte disparaît');
  // 2) partage reçu par l'appli installée
  await p.evaluate(async () => { await navigator.serviceWorker.ready; }); await p.reload(); await p.waitForTimeout(3500);
  const red = await p.evaluate(async () => { const fd = new FormData(); fd.append('title', 'Facture'); fd.append('fichiers', new File([new Blob(['%PDF-1.4 test'], { type: 'application/pdf' })], 'Facture plombier.pdf', { type: 'application/pdf' }));
    const r = await fetch('./partage-recu', { method: 'POST', body: fd }); return { url: r.url, redirige: r.redirected, n: (await (await caches.open('partages')).keys()).length }; });
  t(red.n === 1 && /\/$/.test(red.url), 'sw.js reçoit le fichier partagé et le garde sur le téléphone ' + JSON.stringify(red));
  await p.evaluate(() => { RECU = { etat: '' }; location.hash = 'partage'; }); await p.waitForTimeout(5000);
  const f = await p.evaluate(async () => ({ h: location.hash, f: S.fichiers.filter(x => x.boite && !x.bienId).map(x => x.nom), reste: (await (await caches.open('partages')).keys()).length }));
  t(f.h === '#docs' && f.f.includes('Facture plombier') && f.reste === 0, 'l\'appli le dépose dans la boîte à documents "À ranger", puis vide la file ' + JSON.stringify(f));
  // 3) raccourci "Photo d'une facture"
  await p.evaluate(() => { location.hash = 'ajouter-doc'; render(); }); await p.waitForTimeout(300);
  t(/Prendre en photo/.test(await p.locator('#app').innerText()), 'raccourci : page "📸 Facture ou document"');
  await p.setInputFiles('.ajout-doc input[capture]', __dirname + '/shots53/qauto.png'); await p.waitForTimeout(4000);
  const g = await p.evaluate(() => S.fichiers.filter(x => x.boite && !x.bienId).map(x => x.nom + ' / ' + x.type));
  t(g.length === 2 && g.some(x => /qauto \/ image\/jpeg/.test(x)), 'photo réduite et déposée dans la boîte ' + JSON.stringify(g));
  t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  await p.evaluate(async esp => { const ch = S.fichiers.map(x => x.chemin).filter(Boolean); if (ch.length) await SB.storage.from('documents').remove(ch); await SB.from('espaces').delete().eq('id', esp); }, ESP);
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

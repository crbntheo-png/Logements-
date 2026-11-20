// Dropbox (sélecteur officiel simulé : la vraie fenêtre demande la clé d'appli de Théo) — vraie base, compte de test, espace temporaire.
// Sans clé : aucun bouton. Avec clé : "📦 Choisir dans Dropbox" dans Ajouter un document (fiche logement) → fichiers copiés dans l'appli,
// catégorie devinée ; "📦 Depuis Dropbox" dans Docs › Ajouter un document → boîte à documents ; un lien expiré est signalé.
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist');
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'application/javascript' : f.endsWith('.json') ? 'application/json' : 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(8108);
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const gen = await b.newPage(); await gen.setContent('<h1>FACTURE PLOMBIER</h1><p>TOTAL TTC 90 €</p>'); const pdf = (await gen.pdf({ format: 'A4' })).toString('base64'); await gen.close();
  const p = await (await b.newContext({ ...devices['iPhone 13'], ignoreHTTPSErrors: true, serviceWorkers: 'block' })).newPage();
  p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
  await p.goto('http://localhost:8108/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test Dropbox'); await p.click('#esp_btn'); await p.waitForTimeout(3000);
  try {
    await p.evaluate(() => { S.biens = [{ id: 'b1', nom: 'T2 Gare', adresse: '3 rue de la Gare', cp: '35000', ville: 'Rennes', type: 'Appartement' }]; save(); window.APP_SUPABASE.dropbox = ''; ajouterDocument('b1', ''); });
    await p.waitForTimeout(300);
    ok('sans clé Dropbox : pas de bouton', await p.locator('#overlay .btn-dropbox').count() === 0);
    // clé posée + sélecteur Dropbox simulé (renvoie des liens directs comme le vrai)
    await p.evaluate(b64 => { closeOverlay(); window.APP_SUPABASE.dropbox = 'cle-test'; const lien = 'data:application/pdf;base64,' + b64;
      window.Dropbox = { choose: o => setTimeout(() => o.success(window.__choix || []), 50) };
      window.__choix = [{ id: 'id:1', name: 'Facture plombier.pdf', link: lien, bytes: 30000 }, { id: 'id:2', name: 'Attestation assurance.pdf', link: lien, bytes: 30000 }];
      ajouterDocument('b1', ''); }, pdf);
    await p.waitForTimeout(300);
    ok('avec la clé : "📦 Choisir dans Dropbox" dans Ajouter un document', await p.locator('#overlay .btn-dropbox').count() === 1);
    await p.click('#overlay .btn-dropbox'); await p.waitForTimeout(600);
    ok('fenêtre "2 fichiers de Dropbox" avec catégorie et locataire', /2 fichiers de Dropbox/.test(await p.evaluate(() => document.getElementById('overlay').innerText)) && await p.locator('#overlay [name=cat]').count() === 1);
    await p.click('#overlay button.primary'); await p.waitForTimeout(7000);
    const docs = await p.evaluate(() => S.fichiers.filter(f => f.bienId === 'b1').map(f => ({ nom: f.nom, cat: f.cat, chemin: !!f.chemin })));
    ok(`copiés dans l'appli, chacun avec sa catégorie : ${docs.map(d => d.nom + ' → ' + d.cat).join(' ; ')}`, docs.length === 2 && docs.every(d => d.chemin) && docs.find(d => /Facture/.test(d.nom)).cat === 'Factures et travaux' && docs.find(d => /Attestation/.test(d.nom)).cat === 'Assurance');
    ok('après : "Voir / En ajouter / Annuler"', /documents ajoutés/.test(await p.evaluate(() => document.getElementById('toast').innerText)));
    const enLigne = await p.evaluate(async () => { const f = S.fichiers.find(f => f.bienId === 'b1'); const r = await SB.storage.from('documents').createSignedUrl(f.chemin, 60); return !r.error; });
    ok('fichier bien présent dans le stockage', enLigne);
    // Docs › Ajouter un document › Depuis Dropbox → boîte à documents
    await p.evaluate(b64 => { window.__choix = [{ id: 'id:3', name: 'scan_0099.pdf', link: 'data:application/pdf;base64,' + b64, bytes: 30000 }, { id: 'id:4', name: 'expiré.pdf', link: 'https://localhost:1/expire', bytes: 1000 }]; go('ajouter-doc'); }, pdf);
    await p.waitForTimeout(400);
    ok('Docs › Ajouter un document : "📦 Depuis Dropbox"', await p.locator('#app .btn-dropbox').count() === 1);
    await p.click('#app .btn-dropbox'); await p.waitForTimeout(6000);
    ok('arrivé dans la boîte à documents (lu ensuite tout seul), le lien expiré signalé', await p.evaluate(() => S.fichiers.some(f => f.boite && f.nom === 'scan_0099' && f.de === 'Dropbox') && !S.fichiers.some(f => /expir/.test(f.nom))) && /1 pas copié/.test(await p.evaluate(() => (document.getElementById('toast') || {}).innerText || '')));
  } finally { await p.evaluate(async () => { const c = S.fichiers.filter(f => f.chemin).map(f => f.chemin); if (c.length) await SB.storage.from('documents').remove(c); await SB.from('espaces').delete().eq('id', ESPACE); }); }
  ok('aucune erreur', !errs.length); if (errs.length) console.log(errs);
  await b.close(); srv.close(); console.log(KO ? `\n${KO} échec(s)` : '\nTout est bon'); process.exit(KO ? 1 : 0);
})();

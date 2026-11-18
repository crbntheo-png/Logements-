// Candidatures en ligne, vraie base : lien créé par le propriétaire → le candidat (sans compte) voit l'annonce sans l'adresse,
// dépose son dossier avec pièces → À faire → dossier ouvert (pièces, taux d'effort, manquants) → gardé dans les candidats ;
// un autre refusé (pièces effacées) ; annonce mise à jour toute seule ; sécurité ; lien désactivé.
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
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test candidatures'); await p.click('#esp_btn'); await p.waitForTimeout(2000);
  const ESP = await p.evaluate(() => ESPACE);
  await p.evaluate(async () => { S.sci.nom = 'SCI Test Cand';
    S.biens.push({ id: 'b1', nom: 'T2 Lilas', type: 'T2', pieces: 2, surface: 42, adresse: '1 rue Secrète', cp: '35000', ville: 'Rennes', dpe: 'C', annonce: { hc: 600, ch: 50, mode: 'provision', dispo: iso(addDays(TODAY, 20)), plus: 'Lumineux, proche métro.' } });
    save(); await chargerMembres(); go('bien-b1'); render(); });
  await p.waitForTimeout(800);
  t(await p.locator('button', { hasText: 'Recevoir les dossiers en ligne' }).count() === 1, 'fiche logement › Relouer : "🔗 Recevoir les dossiers en ligne"');
  await p.locator('button', { hasText: 'Recevoir les dossiers en ligne' }).click(); await p.waitForTimeout(300);
  t(/Ce qu'ils ne verront jamais/.test(await p.locator('#overlay').innerText()), 'fenêtre : ce qu\'ils verront / ne verront jamais');
  await p.click('#overlay button.primary'); await p.waitForTimeout(2500);
  const lien = await p.inputValue('#cand_lien').catch(() => ''); const jeton = lien.split('=')[1] || '';
  t(/^https:\/\/sci-gestion-locative\.com\/#candidature=[A-Za-z0-9_-]{40,}$/.test(lien), 'lien créé : ' + lien.slice(0, 58) + '…');
  await p.evaluate(() => closeOverlay());
  // le candidat
  const C = await nouvelle();
  await C.goto('http://localhost:8099/#candidature=' + jeton); await C.waitForTimeout(3500);
  let ct = await C.locator('#app').innerText();
  t(/T2 2 pièces 42 m²/.test(ct) && /650,00\s€/.test(ct) && /Lumineux/.test(ct) && /DPE C/.test(ct), 'candidat : annonce (titre, loyer charges comprises, texte, DPE)');
  t(!/Secrète/.test(ct) && !(await C.isVisible('#bottomnav a')), 'candidat : pas d\'adresse exacte, pas de menu de l\'appli');
  t(/n'a pas le droit de vous demander/.test(ct), 'candidat : pièces interdites rappelées');
  await C.fill('#cand_nom', 'Alice Martin'); await C.fill('#cand_email', 'alice@exemple.fr'); await C.fill('#cand_revenus', '2400');
  await C.setInputFiles('input[name=p_identite]', __dirname + '/shots53/qauto.png'); await C.setInputFiles('input[name=p_salaires]', OUT + '/bulletins.pdf');
  await C.check('#cand_accord'); await C.screenshot({ path: OUT + '/candidat.png', fullPage: true });
  await C.click('#cand_btn'); await C.waitForFunction(() => /Dossier envoyé/.test(document.getElementById('app').innerText), null, { timeout: 20000 }).catch(() => {});
  ct = await C.locator('#app').innerText(); t(/Dossier envoyé/.test(ct) && /2 pièces/.test(ct), 'candidat : "✅ Dossier envoyé" (2 pièces)');
  // sécurité
  const sec = await C.evaluate(async j => { const u = window.APP_SUPABASE.url, k = window.APP_SUPABASE.cle;
    const lire = await (await fetch(u + '/rest/v1/candidatures?select=*', { headers: { apikey: k, Authorization: 'Bearer ' + k } })).json();
    const ann = await (await fetch(u + '/rest/v1/annonces_publiques?select=*', { headers: { apikey: k, Authorization: 'Bearer ' + k } })).json();
    const faux = await fetch(u + '/functions/v1/candidature', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: k }, body: JSON.stringify({ jeton: 'x'.repeat(43), action: 'voir' }) });
    const sansAccord = await (await fetch(u + '/functions/v1/candidature', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: k }, body: JSON.stringify({ jeton: j, action: 'deposer', nom: 'X', email: 'x@x.fr' }) })).json();
    return [Array.isArray(lire) ? lire.length : -1, Array.isArray(ann) ? ann.length : -1, faux.status, sansAccord.erreur || 'accepté']; }, jeton);
  t(sec[0] === 0 && sec[1] === 0 && sec[2] === 404 && /accord/.test(sec[3]), 'sécurité : rien de lisible sans compte, faux lien refusé, accord obligatoire ' + JSON.stringify(sec));
  // un 2e candidat (sera refusé)
  await C.evaluate(async j => { await fetch(window.APP_SUPABASE.url + '/functions/v1/candidature', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: window.APP_SUPABASE.cle }, body: JSON.stringify({ jeton: j, action: 'deposer', nom: 'Bob Refus', tel: '0600000000', revenus: 1200, accord: true, pieces: [{ type: 'identite', nom: 'id.png', data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' }] }) }); }, jeton);
  // le propriétaire
  await p.evaluate(async () => { await chargerCandidatures(); go('afaire'); render(); }); await p.waitForTimeout(500);
  const T = await p.evaluate(() => taches().filter(x => /Candidature de/.test(x.t)).map(x => x.t + ' | ' + x.d));
  t(T.length === 2 && T.some(x => /Alice Martin · T2 Lilas/.test(x) && /Taux d'effort 27 %/.test(x) && /2 pièces/.test(x)), 'À faire : "🙋 Candidature d\'Alice Martin · T2 Lilas", taux d\'effort 27 %, 2 pièces');
  const ida = await p.evaluate(() => CANDS.find(c => c.nom === 'Alice Martin').id), idb = await p.evaluate(() => CANDS.find(c => c.nom === 'Bob Refus').id);
  await p.evaluate(id => voirCandidature(id), ida); await p.waitForTimeout(2000);
  const ov = await p.locator('#overlay').innerText();
  t(/Taux d'effort : 27 %/.test(ov) && /Pièces \(2\)/.test(ov) && /Il manque : Justificatif de domicile/.test(ov), 'dossier : taux d\'effort, 2 pièces, ce qui manque');
  const ouvre = await p.evaluate(async () => { const a = [...document.querySelectorAll('#overlay a.btn')].filter(x => /Ouvrir/.test(x.innerText)); const r = await Promise.all(a.map(x => fetch(x.href).then(r => r.status))); return r; });
  t(ouvre.length === 2 && ouvre.every(x => x === 200), 'les pièces s\'ouvrent (liens temporaires) ' + JSON.stringify(ouvre));
  await p.screenshot({ path: OUT + '/dossier.png' });
  await p.click('#overlay button.primary'); await p.waitForTimeout(1500);
  const g = await p.evaluate(() => { const c = bien('b1').candidats || []; return c.map(x => ({ nom: x.nom, enLigne: !!x.enLigne, revenus: x.revenus, pieces: x.pieces, n: (x.piecesEnLigne || []).length })); });
  t(g.length === 1 && g[0].nom === 'Alice Martin' && g[0].revenus === 2400 && g[0].pieces.includes("Pièce d'identité") && g[0].n === 2, 'gardé : Alice dans les candidats du logement, avec ses pièces ' + JSON.stringify(g));
  const st = await p.evaluate(async id => (await SB.from('candidatures').select('statut').eq('id', id).single()).data.statut, ida); t(st === 'importee', 'serveur : candidature "importée"');
  t(!(await p.evaluate(() => taches().some(x => /Alice Martin/.test(x.t)))), 'Alice n\'est plus dans À faire');
  // refus de Bob : pièces effacées
  const cheminB = await p.evaluate(id => CANDS.find(c => c.id === id).pieces[0].chemin, idb);
  await p.evaluate(async id => { await refuserCandidature(id); }, idb); await p.waitForTimeout(1000);
  const apres = await p.evaluate(async ([id, ch]) => { const r = await SB.from('candidatures').select('statut, pieces').eq('id', id).single(); const u = await SB.storage.from('documents').createSignedUrl(ch, 60); const f = u.data ? (await fetch(u.data.signedUrl)).status : 'aucun lien'; return [r.data.statut, r.data.pieces.length, f]; }, [idb, cheminB]);
  t(apres[0] === 'refusee' && apres[1] === 0 && apres[2] !== 200, 'refus : statut "refusée", pièces effacées du stockage ' + JSON.stringify(apres));
  // l'annonce se met à jour toute seule
  await p.evaluate(async () => { bien('b1').annonce.hc = 620; save(); await new Promise(r => setTimeout(r, 4000)); });
  await C.reload(); await C.waitForTimeout(3500); t(/670,00\s€/.test(await C.locator('#app').innerText()), 'annonce mise à jour toute seule chez le candidat (670 €)');
  // fiche du logement : candidats
  await p.evaluate(() => { go('bien-b1'); render(); }); await p.waitForTimeout(300);
  t(/Alice Martin/.test(await p.locator('#app').innerText()), 'fiche logement : Alice dans les candidats');
  // désactiver
  await p.evaluate(async () => { await desactiverLienCandidature('b1'); }); await p.waitForTimeout(800);
  await C.reload(); await C.waitForTimeout(3000); t(/n'est plus en ligne/.test(await C.locator('#app').innerText()), 'lien désactivé : "Cette annonce n\'est plus en ligne"');
  t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  await p.evaluate(async esp => { const r = await SB.from('candidatures').select('pieces').eq('espace_id', esp); const ch = (r.data || []).flatMap(x => (x.pieces || []).map(y => y.chemin)); if (ch.length) await SB.storage.from('documents').remove(ch); await SB.from('espaces').delete().eq('id', esp); }, ESP);
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

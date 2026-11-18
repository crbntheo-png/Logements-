// Relances automatiques (vraie base, vrai serveur, AUCUN e-mail envoyé : aperçu seulement).
// J+3 gentil, J+8 ferme si le 1er rappel date d'au moins 4 jours, rien pour un accord d'étalement, une vieille dette, un locataire sans e-mail ou exclu.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); }).listen(8099);
let ok = 0, ko = 0; const t = (c, m) => { c ? ok++ : ko++; console.log((c ? 'OK ' : 'KO ') + m); };
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true, serviceWorkers: 'block' })).newPage();
  p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test relances auto'); await p.click('#esp_btn'); await p.waitForTimeout(2000);
  // jour de paiement calculé pour avoir 3, 9 et 40 jours de retard aujourd'hui
  await p.evaluate(async () => {
    const j = n => { const d = new Date(TODAY); d.setDate(d.getDate() - n); return d; };
    S.sci.gerant = 'Théo'; S.sci.iban = 'FR76 1234';
    S.biens.push({ id: 'b1', nom: 'A', adresse: '1 rue', cp: '35000', ville: 'Rennes' });
    const bail0 = (id, nom, email, d, extra) => Object.assign({ id, bienId: 'b1', nom, email, typeBail: 'vide', dateEntree: mk(addMonthsDate(d, -3)) + '-01', loyerHC: '500', charges: '0', jourPaiement: String(d.getDate()), revisions: [] }, extra || {});
    const d3 = j(3), d9 = j(9), d40 = j(40);
    S.baux.push(bail0('l3', 'Jean Trois', 'jean@exemple.fr', d3), bail0('l9', 'Marie Neuf', 'marie@exemple.fr', d9), bail0('lsans', 'Paul Sansmail', '', d3), bail0('lexclu', 'Zoe Exclue', 'zoe@exemple.fr', d3, { sansRelanceAuto: true }));
    // paiements des mois d'avant, pour ne garder que le retard du mois visé
    S.baux.forEach(bb => echeancesBail(bb).forEach(e => { if (e.m < mk(d3) && bb.id !== 'l9') S.paiements.push({ id: uid(), bailId: bb.id, mois: e.m, montant: e.du, date: iso(TODAY) }); }));
    S.baux.filter(bb => bb.id === 'l9').forEach(bb => echeancesBail(bb).forEach(e => { if (e.m < mk(d9)) S.paiements.push({ id: uid(), bailId: bb.id, mois: e.m, montant: e.du, date: iso(TODAY) }); }));
    // Marie : 1er rappel il y a 5 jours
    S.relances.push({ id: 'r1', bailId: 'l9', mois: mk(d9), niveau: 0, date: iso(j(5)) });
    save(); await new Promise(r => setTimeout(r, 2500)); location.hash = 'reglages'; render();
  });
  await p.waitForTimeout(500);
  t(await p.isVisible('text=Relances automatiques'), 'Réglages : rubrique "Relances automatiques"');
  await p.click('#rgl-relances summary'); await p.waitForTimeout(200);
  await p.click('text=Voir ce qui partirait demain matin'); await p.waitForTimeout(5000);
  const txt = await p.locator('#overlay').innerText(); console.log(txt.slice(0, 1400));
  await p.screenshot({ path: __dirname + '/shots58/relances.png' });
  t(/2 relances partiraient demain/.test(txt), 'aperçu : 2 relances');
  t(/Jean Trois[\s\S]*rappel gentil[\s\S]*Petit message au cas où[\s\S]*FR76 1234[\s\S]*Théo/.test(txt), 'Jean (J+3) : rappel gentil, avec l\'IBAN, signé Théo');
  t(/Marie Neuf[\s\S]*2e rappel[\s\S]*toujours pas réglé/.test(txt), 'Marie (J+9, 1er rappel il y a 5 j) : 2e rappel ferme');
  t(!/Paul|Zoe/.test(txt), 'rien pour le locataire sans e-mail ni pour celui exclu');
  t(/Seulement si tu actives l'option/.test(txt), 'option pas encore activée : le dit');
  // activer
  await p.click('#overlay button.primary'); await p.check('#rauto'); await p.waitForTimeout(2500);
  t(await p.evaluate(() => S.sci.relanceAuto === true) && /Activées/.test(await p.locator('#rauto-etat').innerText()), 'option activée, "✅ Activées" en grand');
  // vieille dette : Marie à 40 jours → rien
  const r2 = await p.evaluate(async () => { const bb = bail('l9'); const d = new Date(TODAY); d.setDate(d.getDate() - 40); bb.jourPaiement = String(d.getDate()); bb.dateEntree = mk(addMonthsDate(d, -1)) + '-01'; S.paiements = S.paiements.filter(x => x.bailId !== 'l9'); save(); await new Promise(r => setTimeout(r, 2500));
    const s0 = (await SB.auth.getSession()).data.session; const r = await fetch(APP_SUPABASE.url + '/functions/v1/notifier', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: APP_SUPABASE.cle, Authorization: 'Bearer ' + s0.access_token }, body: JSON.stringify({ essai: true, simulerRelances: true, espace: ESPACE }) }); const j2 = await r.json(); j2.vieux = mk(d); return j2; });
  console.log(JSON.stringify(r2.plan.map(x => [x.nom, x.mois, x.niveau]), r2.vieux)); t(r2.actif && !r2.plan.some(x => x.bailId === 'l9' && x.mois === r2.vieux), 'vieille dette : pas de "petit oubli ?" automatique');
  // un autre compte ne peut pas voir l'aperçu de cet espace
  const r3 = await p.evaluate(async () => { const r = await fetch(APP_SUPABASE.url + '/functions/v1/notifier', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: APP_SUPABASE.cle }, body: JSON.stringify({ essai: true, simulerRelances: true, espace: ESPACE }) }); return r.status; });
  t(r3 === 401, 'sans connexion : aperçu refusé');
  // menu du locataire
  await p.evaluate(() => { closeOverlay(); location.hash = 'bail-l3'; render(); }); await p.waitForTimeout(300);
  await p.evaluate(() => basculerRelanceBail('l3')); t(await p.evaluate(() => bail('l3').sansRelanceAuto === true), 'fiche › Plus › "Pas de relance automatique pour lui"');
  t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  await p.evaluate(async () => { closeOverlay(); await SB.from('espaces').delete().eq('id', ESPACE); });
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

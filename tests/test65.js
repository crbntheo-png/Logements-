// Connecteur Claude (MCP) : lien créé, protocole (initialize, tools/list, tools/call), réponses justes avec les chiffres de l'espace,
// mise à jour automatique, lien faux ou désactivé refusé, lecture seule. Vraie base, vraie fonction.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); }).listen(8099);
let ok = 0, ko = 0; const t = (c, m) => { c ? ok++ : ko++; console.log((c ? 'OK ' : 'KO ') + m); };
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true, serviceWorkers: 'block' }); const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test connecteur'); await p.click('#esp_btn'); await p.waitForTimeout(2000);
  await p.evaluate(() => { S.sci.nom = 'SCI Connecteur'; S.biens.push({ id: 'b1', nom: 'T2 Lilas', adresse: '1 rue des Lilas', cp: '35000', ville: 'Rennes', dpe: 'D' }, { id: 'b2', nom: 'Studio Gare', adresse: '2 place', cp: '35000', ville: 'Rennes' });
    const d = new Date(TODAY); d.setDate(d.getDate() - 6);
    S.baux.push({ id: 'l1', bienId: 'b1', nom: 'Jean Dupontel', email: 'jean@exemple.fr', typeBail: 'vide', dateEntree: addM(CUR, -1) + '-01', suiviDepuis: addM(CUR, -1), loyerHC: '600', charges: '50', jourPaiement: String(d.getDate()), revisions: [], assuranceFin: '2027-03-31' });
    S.paiements.push({ id: 'p0', bailId: 'l1', mois: addM(CUR, -1), montant: 650, date: iso(TODAY) });
    S.fichiers.push({ id: 'f1', bienId: 'b1', bailId: 'l1', cat: 'Bail', nom: 'Bail Jean signé', date: iso(TODAY), url: 'https://exemple.fr' });
    save(); location.hash = 'reglages'; render(); });
  await p.waitForTimeout(1500);
  t(await p.isVisible('text=Brancher sur Claude'), 'Réglages : rubrique "🤖 Brancher sur Claude"');
  await p.evaluate(() => brancherClaude()); await p.waitForTimeout(2500);
  const url = await p.inputValue('#mcp_lien');
  t(/^https:\/\/sci-gestion-locative\.com\/mcp\/[A-Za-z0-9_-]{40,}$/.test(url), "lien du connecteur créé, sur le domaine de l'appli");
  await p.screenshot({ path: __dirname + '/shots58/claude.png' });
  const api = await b.newContext({ ignoreHTTPSErrors: true });
  const rpc = async (corps, u = url) => { const r = await api.request.post(u, { headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, data: corps }); const tx = await r.text(); return { s: r.status(), j: tx ? JSON.parse(tx) : null }; };
  const init = await rpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } } });
  t(init.s === 200 && init.j.result.protocolVersion === '2025-06-18' && init.j.result.capabilities.tools && /SCI Connecteur/.test(init.j.result.instructions), 'initialize : version, outils, consignes');
  t((await rpc({ jsonrpc: '2.0', method: 'notifications/initialized' })).s === 202, 'notification : 202');
  const L = await rpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
  t(L.j.result.tools.length === 9 && L.j.result.tools.every(x => x.name && x.description && x.inputSchema), '9 outils décrits');
  const call = async (name, args = {}) => JSON.parse((await rpc({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name, arguments: args } })).j.result.content[0].text);
  const R = await call('resume_du_mois'); console.log(JSON.stringify(R).slice(0, 400));
  t(R.espace === 'SCI Connecteur' && R.loyers_attendus === 650 && R.en_retard.length === 1 && R.en_retard[0].doit === 650, 'résumé : 650 € attendus, Jean doit 650 €');
  const J = await call('locataires', { nom: 'jean' });
  t(J[0].nom === 'Jean Dupontel' && J[0].fin_assurance === '2027-03-31' && J[0].impayes.length === 1, 'locataire "jean" : fiche, fin d\'assurance, mois impayé');
  const LG = await call('logements'); t(LG.length === 2 && LG.find(x => x.nom === 'Studio Gare').locataire === 'vacant' && LG.find(x => x.nom === 'T2 Lilas').dpe === 'D', 'logements : vacant, DPE');
  const DOCS = await call('documents', { logement: 'lilas' }); t(DOCS.length === 1 && DOCS[0].nom === 'Bail Jean signé', 'documents d\'un logement (sans contenu)');
  const AF = await call('a_faire'); t(Array.isArray(AF) && AF.some(x => /Jean/.test(x.quoi)), 'à faire : tâches lisibles (sans code HTML)');
  t(Array.isArray(await call('echeances')), 'échéances à venir');
  const inconnu = await rpc({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'supprimer_tout', arguments: {} } });
  t(inconnu.j.error && inconnu.j.error.code === -32602, 'outil inconnu refusé (aucune écriture possible)');
  t((await api.request.get(url)).status() === 405, 'GET refusé (405)');
  // mise à jour automatique : Jean paie
  await p.evaluate(() => { closeOverlay(); S.paiements.push({ id: 'p1', bailId: 'l1', mois: CUR, montant: 650, date: iso(TODAY) }); save(); }); await p.waitForTimeout(6000);
  const R2 = await call('resume_du_mois'); t(R2.loyers_recus === 650 && !R2.en_retard.length, 'après paiement : Claude voit que Jean a payé (mise à jour toute seule)');
  t((await rpc({ jsonrpc: '2.0', id: 5, method: 'tools/list' }, url.replace(/[^/]+$/, 'A'.repeat(43)))).s === 404, 'faux lien refusé');
  fs.writeFileSync(path.join(__dirname, 'mcp-url.txt'), url);
  console.log(`\n${ok} OK, ${ko} KO (avant désactivation)`);
  if (process.argv[2] !== 'garder') {
    await p.evaluate(async () => { await SB.from('connecteurs').delete().eq('espace_id', ESPACE); delete S.sci.connecteurJeton; save(); });
    t((await rpc({ jsonrpc: '2.0', id: 6, method: 'tools/list' })).s === 404, 'désactivé : plus aucun accès');
    t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
    await p.evaluate(async () => { await SB.from('espaces').delete().eq('id', ESPACE); });
  }
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

// Ranger avec Claude (connecteur MCP en écriture) : autorisation du propriétaire, outils de rangement, pas de doublon,
// l'appli reçoit tout en direct, l'accueil montre ce que Claude a fait, écriture refusée si non autorisée. Vraie base, vraie fonction.
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
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test ranger avec Claude'); await p.click('#esp_btn'); await p.waitForTimeout(2000);
  await p.evaluate(() => { S.sci.nom = 'SCI Rangement'; S.biens.push({ id: 'b1', nom: 'T2 Lilas', adresse: '1 rue des Lilas', cp: '35000', ville: 'Rennes' }); S.fichiers.push({ id: 'fx', bienId: '', cat: 'Autre', nom: 'avis-tf-2026', url: 'https://exemple.fr/tf.pdf', date: iso(TODAY), boite: true }); save(); });
  await p.waitForTimeout(1500); await p.evaluate(() => brancherClaude()); await p.waitForTimeout(2500);
  const url = (await p.inputValue('#mcp_lien')).replace('https://sci-gestion-locative.com/mcp/', await p.evaluate(() => APP_SUPABASE.url + '/functions/v1/mcp/'));
  t(await p.isVisible('#mcp_ecr') && !(await p.isChecked('#mcp_ecr')), 'interrupteur "Autoriser Claude à ranger" présent, coupé au départ');
  const api = await b.newContext({ ignoreHTTPSErrors: true });
  let id = 1; const rpc = async (method, params) => { const r = await api.request.post(url, { headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, data: { jsonrpc: '2.0', id: id++, method, params } }); return (await r.json()); };
  const call = async (name, args) => { const r = (await rpc('tools/call', { name, arguments: args })).result; return { err: !!r.isError, j: (() => { try { return JSON.parse(r.content[0].text); } catch (e) { return r.content[0].text; } })() }; };
  t((await rpc('tools/list')).result.tools.length === 9, 'sans autorisation : 9 outils de lecture seulement');
  const refus = await call('creer_logement', { nom: 'Pirate' }); t(refus.err && /pas autorisé/.test(refus.j), 'sans autorisation : écriture refusée');
  // le propriétaire autorise
  await p.check('#mcp_ecr'); await p.waitForTimeout(1500);
  t(await p.isVisible('#mcp_prompt') && /Range mon appli/.test(await p.locator('#mcp_prompt').innerText()), 'autorisé : message à coller dans Claude affiché');
  await p.screenshot({ path: __dirname + '/shots58/claude-ranger.png' });
  const tools = (await rpc('tools/list')).result.tools.map(x => x.name);
  t(tools.length === 15 && tools.includes('creer_locataire') && !tools.some(n => /suppr|delete|envoy/.test(n)), '15 outils, aucun pour supprimer ou envoyer');
  const init = (await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } })).result;
  t(/montre toujours ton plan/.test(init.instructions) && !/supabase|index\.html|function|SELECT/i.test(JSON.stringify(init) + JSON.stringify((await rpc('tools/list')).result)), 'consignes claires, rien sur la fabrication de l\'appli');
  t((await rpc('prompts/list')).result.prompts[0].name === 'ranger_mon_appli', 'invite « Ranger mon appli avec Claude » disponible');
  const L = await call('creer_logement', { nom: 'Studio Gare', adresse: '2 place de la Gare', code_postal: '35000', ville: 'Rennes', type: 'Studio', meuble: true, surface: 22 });
  t(!L.err && L.j.cree === 'logement', 'creer_logement');
  t((await call('creer_logement', { nom: 'studio gare' })).err, 'doublon de logement refusé');
  const Lo = await call('creer_locataire', { nom: 'Léa Durand', logement: 'studio', date_entree: '2025-02-15', loyer_hc: 450, charges: 30, jour_paiement: 5, email: 'lea@exemple.fr' });
  console.log(JSON.stringify(Lo.j));
  t(!Lo.err && Lo.j.logement === 'Studio Gare' && /^\d{4}-\d{2}$/.test(Lo.j.loyers_suivis_a_partir_de), 'creer_locataire (logement trouvé par "studio", suivi au prochain loyer)');
  t((await call('creer_locataire', { nom: 'X', logement: 'Inexistant', date_entree: '2025-01-01', loyer_hc: 100 })).err, 'logement inconnu : refus clair');
  const D = await call('ajouter_document', { nom: 'Bail Léa Durand 2025', lien: 'https://drive.google.com/file/d/abc/view', logement: 'Studio Gare', categorie: 'Bail', locataire: 'Léa' });
  t(!D.err && D.j.cree === 'document', 'ajouter_document (lien Drive, rattaché à Léa)');
  t((await call('ajouter_document', { nom: 'Bail encore', lien: 'https://drive.google.com/file/d/abc/view', logement: 'Studio Gare', categorie: 'Bail' })).j.deja, 'même document deux fois : pas de doublon');
  const R = await call('ranger_document', { document: 'avis-tf-2026', logement: 'T2 Lilas', categorie: 'Taxe foncière' }); t(!R.err, 'ranger_document (document reçu "à ranger")');
  const Dp = await call('ajouter_depense', { date: '2026-10-14', montant: 1039.5, categorie: "Travaux d'entretien / réparation", libelle: 'Plombier – chauffe-eau', logement: 'T2 Lilas' }); t(!Dp.err, 'ajouter_depense');
  t((await call('ajouter_depense', { date: '2026-10-14', montant: 1039.5, categorie: "Travaux d'entretien / réparation", libelle: 'idem', logement: 'T2 Lilas' })).j.deja, 'même dépense deux fois : pas de doublon');
  t(!(await call('ajouter_rappel', { titre: "Demander l'attestation d'assurance de Léa", date: '2026-12-01', logement: 'Studio Gare' })).err, 'ajouter_rappel');
  // l'appli reçoit tout en direct
  await p.waitForTimeout(3000);
  const A = await p.evaluate(() => ({ biens: S.biens.map(x => x.nom), lea: S.baux.find(x => x.nom === 'Léa Durand'), doc: S.fichiers.find(x => x.nom === 'Bail Léa Durand 2025'), tf: S.fichiers.find(x => x.id === 'fx'), dep: S.depenses.length, rap: S.rappels.length }));
  t(A.biens.includes('Studio Gare') && A.lea && A.lea.bienId && A.doc && A.doc.bailId === A.lea.id && A.tf.bienId === 'b1' && A.tf.cat === 'Taxe foncière' && A.dep === 1 && A.rap === 1, 'l\'appli reçoit tout en direct (logement, locataire, document lié à Léa, document rangé, dépense, rappel)');
  t(await p.evaluate(() => detteBail(S.baux.find(x => x.nom === 'Léa Durand')) === 0), 'aucun impayé inventé pour Léa');
  // lecture à jour pour Claude
  const lg = await call('logements', {}); t(lg.j.some(x => x.nom === 'Studio Gare'), 'Claude voit aussitôt le logement créé');
  // l'accueil montre ce que Claude a fait
  await p.evaluate(async () => { closeOverlay(); await chargerActivite(); location.hash = ''; render(); }); await p.waitForTimeout(600);
  const acc = await p.locator('.activite').innerText().catch(() => ''); console.log(acc.slice(0, 300).replace(/\n/g, ' | '));
  t(/Ce que Claude a rangé/.test(acc) && /Claude a ajouté le document Bail Léa Durand 2025 dans Studio Gare/.test(acc), 'accueil : "🤖 Ce que Claude a rangé"');
  // retirer l'autorisation
  await p.evaluate(async () => { await SB.rpc('connecteur_ecriture', { e: ESPACE, oui: false }); });
  t((await call('ajouter_rappel', { titre: 'x', date: '2026-12-01' })).err, 'autorisation retirée : plus aucune écriture');
  t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  await p.evaluate(async () => { await SB.from('espaces').delete().eq('id', ESPACE); });
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

// Ranger avec Claude (connecteur MCP en écriture) : autorisation du propriétaire, outils de rangement, pas de doublon,
// l'appli reçoit tout en direct, l'accueil montre ce que Claude a fait, écriture refusée si non autorisée. Vraie base, vraie fonction.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); }).listen(8098);
let ok = 0, ko = 0; const t = (c, m) => { c ? ok++ : ko++; console.log((c ? 'OK ' : 'KO ') + m); };
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true, serviceWorkers: 'block' }); const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
  await p.goto('http://localhost:8098/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test corriger avec Claude'); await p.click('#esp_btn'); await p.waitForTimeout(2000);
  await p.evaluate(() => { S.sci.nom = 'SCI Rangement'; S.biens.push({ id: 'b1', nom: 'T2 Lilas', adresse: '1 rue des Lilas', cp: '35000', ville: 'Rennes', meuble: 'vide', surface: 40 }, { id: 'b2', nom: 'T3 Lilas', meuble: 'vide', surface: 60 }, { id: 'b3', nom: 'Parties communes Lilas', meuble: 'vide' }, { id: 'b4', nom: 'T2 Lilas bis' });
      S.baux.push({ id: 'l1', bienId: 'b1', nom: 'Eva Dumas', typeBail: 'vide', dateEntree: '2026-11-19', suiviDepuis: '2026-11', loyerHC: '430', charges: '20', jourPaiement: '5', revisions: [] }, { id: 'l2', bienId: 'b2', nom: 'Eva Dumas bis', typeBail: 'vide', dateEntree: '2026-01-01', loyerHC: '400', charges: '0', jourPaiement: '5', revisions: [] }); save(); });
  await p.waitForTimeout(1500); await p.evaluate(() => brancherClaude()); await p.waitForTimeout(2500);
  const url = (await p.inputValue('#mcp_lien')).replace('https://sci-gestion-locative.com/mcp/', await p.evaluate(() => APP_SUPABASE.url + '/functions/v1/mcp/'));
  const api = await b.newContext({ ignoreHTTPSErrors: true });
  let id = 1; const rpc = async (method, params) => { const r = await api.request.post(url, { headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, data: { jsonrpc: '2.0', id: id++, method, params } }); return (await r.json()); };
  const call = async (name, args) => { const r = (await rpc('tools/call', { name, arguments: args })).result; return { err: !!r.isError, j: (() => { try { return JSON.parse(r.content[0].text); } catch (e) { return r.content[0].text; } })() }; };
  await p.check('#mcp_ecr'); await p.waitForTimeout(1500);
  try {
    let r = await call('modifier_locataire', { locataire: 'Eva Dumas', date_entree: '2026-06-10', type_bail: 'meuble', jour_paiement: 10, suivi_depuis: '2026-12' });
    t(!r.err && r.j.champs.length === 4, 'modifier_locataire : date d\'entrée, type, jour, suivi (' + JSON.stringify(r.j) + ')');
    r = await call('modifier_locataire', { locataire: 'Eva Dumas', date_entree: '10/06/2026' }); t(r.err, 'date mal écrite refusée');
    r = await call('modifier_logement', { logement: 'T2 Lilas', meuble: true, dpe: 'D', diag_elec_fin: '2027-02-01', pno_echeance: '2027-01-15' });
    t(!r.err && /meublé/.test(JSON.stringify(r.j)), 'modifier_logement : meublé, DPE, diagnostic, assurance');
    r = await call('creer_immeuble', { nom: 'Parties communes Lilas', lots: ['T2 Lilas', 'T3 Lilas'], prix_achat: 300000 });
    t(!r.err && r.j.transforme === true && r.j.lots.length === 2, 'creer_immeuble : la fiche "parties communes" devient l\'immeuble, 2 lots');
    r = await call('enregistrer_loyer', { locataire: 'Eva Dumas bis', mois: '2026-11', montant: 400, date: '2026-11-05' }); t(!r.err && !r.j.deja, 'enregistrer_loyer');
    r = await call('enregistrer_loyer', { locataire: 'Eva Dumas bis', mois: '2026-11', montant: 400, date: '2026-11-05' }); t(!r.err && r.j.deja, 'même loyer une 2e fois : refusé (pas de doublon)');
    r = await call('supprimer_doublon', { type: 'locataire', fiche: 'Eva Dumas bis' }); t(r.err, 'supprimer un locataire qui a des paiements : refusé');
    r = await call('supprimer_doublon', { type: 'logement', fiche: 'T2 Lilas bis' }); t(!r.err, 'supprimer un logement vide en double : fait');
    r = await call('noter_depart', { locataire: 'Eva Dumas bis', date_sortie: '2026-12-31' }); t(!r.err, 'noter_depart');
    // l'appli reçoit tout
    await p.evaluate(async () => { await ouvrirEspace(ESPACE, true); }); await p.waitForTimeout(2500);
    const s = await p.evaluate(() => ({ e: bail('l1'), bi: bien('b1'), im: bien('b3'), lots: lotsDe('b3').map(x => x.id).sort(), pay: S.paiements.filter(x => x.bailId === 'l2').length, b4: !!bien('b4'), l2: bail('l2') }));
    t(s.e.dateEntree === '2026-06-10' && s.e.typeBail === 'meuble' && s.e.jourPaiement === '10' && s.e.suiviDepuis === '2026-12', 'appli : fiche locataire corrigée');
    t(s.bi.meuble === 'meuble' && s.bi.dpe === 'D' && s.bi.diagElecFin === '2027-02-01', 'appli : logement corrigé');
    t(s.im.immeuble === true && s.lots.join() === 'b1,b2' && +s.im.prixAchat === 300000, 'appli : immeuble avec ses 2 lots et son prix');
    t(s.pay === 1 && !s.b4 && s.l2.dateSortie === '2026-12-31', 'appli : 1 loyer, doublon supprimé, départ noté');
    const tools = (await rpc('tools/list')).result.tools.map(x => x.name);
    t(['modifier_locataire', 'modifier_logement', 'creer_immeuble', 'enregistrer_loyer', 'noter_depart', 'supprimer_doublon'].every(n => tools.includes(n)), 'les 6 nouveaux outils sont proposés à Claude');
  } finally { await p.evaluate(async () => { await SB.from('espaces').delete().eq('id', ESPACE); }); }
  console.log('ERREURS', errs); console.log(ok + ' OK, ' + ko + ' KO');
  await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

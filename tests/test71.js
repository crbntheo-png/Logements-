// Mois clôturés : le propriétaire clôture octobre ; plus rien ne change en octobre (à la main, par l'appli toute seule,
// ni en écrivant directement sur le serveur comme le ferait un vieux téléphone). Un loyer d'octobre payé en novembre reste possible.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); }).listen(8099);
let ok = 0, ko = 0; const t = (c, m) => { c ? ok++ : ko++; console.log((c ? 'OK ' : 'KO ') + m); };
const attendre = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true, serviceWorkers: 'block' })).newPage();
  p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test clôture'); await p.click('#esp_btn'); await p.waitForTimeout(2000);
  await p.evaluate(async () => {
    S.biens.push({ id: 'b1', nom: 'T2', adresse: '1 rue', cp: '35000', ville: 'Rennes' });
    S.baux.push({ id: 'jean', bienId: 'b1', nom: 'Jean Dupontel', typeBail: 'vide', dateEntree: '2026-09-01', loyerHC: '500', charges: '0', jourPaiement: '5', revisions: [] });
    S.paiements.push({ id: 'poct', bailId: 'jean', mois: '2026-10', montant: 500, date: '2026-10-06', mode: 'virement' }, { id: 'pnov', bailId: 'jean', mois: '2026-11', montant: 500, date: '2026-11-06', mode: 'virement' });
    S.depenses.push({ id: 'doct', date: '2026-10-12', libelle: 'Plombier', montant: 120, categorie: 'Entretien et réparations', bienId: 'b1' });
    save(); await new Promise(r => setTimeout(r, 2500)); await chargerMembres();
  });
  await p.evaluate(() => { view.comptaOnglet = 'comptable'; location.hash = 'compta'; render(); }); await p.waitForTimeout(1500);
  let txt = await p.locator('.cloture').innerText();
  t(/Aucun mois clôturé/.test(txt) && /Clôturer jusqu'à octobre 2026/.test(txt), 'carte visible : "Aucun mois clôturé" + bouton "Clôturer jusqu\'à octobre 2026"');
  await p.locator('.cloture button.primary').click(); await p.waitForTimeout(400);
  const conf = await p.locator('#overlay').innerText(); t(/ne pourront plus être ajoutés, modifiés ni supprimés/.test(conf), 'confirmation claire avant de clôturer');
  await p.click('#cyes'); await p.waitForTimeout(2000);
  txt = await p.locator('.cloture').innerText(); t(/Clôturé jusqu'à fin octobre 2026/.test(txt), 'carte : "Clôturé jusqu\'à fin octobre 2026"');
  await p.screenshot({ path: __dirname + '/shots58/cloture.png' });
  const srvV = async () => p.evaluate(async () => Object.fromEntries(((await SB.from('docs').select('doc_id, data').eq('espace_id', ESPACE).in('coll', ['paiements', 'depenses'])).data || []).map(x => [x.doc_id, x.data])));
  // 1. dans l'appli : modifier / supprimer en octobre → refusé, affichage remis
  const r1 = await p.evaluate(async () => { S.paiements.find(x => x.id === 'poct').montant = 200; S.depenses = S.depenses.filter(d => d.id !== 'doct'); save(); await new Promise(r => setTimeout(r, 2000));
    return { m: S.paiements.find(x => x.id === 'poct').montant, d: S.depenses.some(d => d.id === 'doct'), toast: (document.getElementById('toast') || {}).innerText || '' }; });
  console.log(JSON.stringify(r1));
  t(r1.m === 500 && r1.d, 'appli : modif et suppression en octobre annulées (500 € et la dépense restent)');
  t(/mois clôturé/.test(r1.toast), 'appli : message "c\'est dans un mois clôturé"');
  // 2. en écrivant directement sur le serveur (vieux téléphone, bug) → ignoré
  await p.evaluate(async () => {
    await SB.from('docs').update({ data: { id: 'poct', bailId: 'jean', mois: '2026-10', montant: 1, date: '2026-10-06', mode: 'virement' } }).match({ espace_id: ESPACE, coll: 'paiements', doc_id: 'poct' }).setHeader('x-auto', '1');
    await SB.from('docs').delete().match({ espace_id: ESPACE, coll: 'depenses', doc_id: 'doct' });
    await SB.from('docs').upsert({ espace_id: ESPACE, coll: 'depenses', doc_id: 'dsep', data: { id: 'dsep', date: '2026-09-02', montant: 50, libelle: 'x' } });
    await SB.from('docs').upsert({ espace_id: ESPACE, coll: 'paiements', doc_id: 'pnov', data: { id: 'pnov', bailId: 'jean', mois: '2026-11', montant: 500, date: '2026-10-30', mode: 'virement' } });
  });
  let v = await srvV();
  t(v.poct && v.poct.montant === 500, 'serveur : montant d\'octobre inchangé malgré une écriture directe');
  t(!!v.doct, 'serveur : dépense d\'octobre pas supprimée');
  t(!v.dsep, 'serveur : ajout en septembre refusé');
  t(v.pnov && v.pnov.date === '2026-11-06', 'serveur : impossible de déplacer un paiement de novembre vers octobre');
  // 3. ce qui reste permis : novembre, et un loyer d'octobre payé en novembre
  await p.evaluate(async () => { S.paiements.push({ id: 'pretard', bailId: 'jean', mois: '2026-10', montant: 50, date: '2026-11-03', mode: 'virement' }); S.paiements.find(x => x.id === 'pnov').montant = 480; save(); await new Promise(r => setTimeout(r, 2000)); });
  v = await srvV(); t(v.pretard && v.pnov.montant === 480, 'novembre reste modifiable, et un loyer d\'octobre payé le 3/11 s\'enregistre');
  // 4. l'appli toute seule : un virement d'octobre lu dans la banque n'est pas pointé
  const n4 = await p.evaluate(async () => { BANQUE = { etat: 'ok', lien: { source: 'enablebanking' }, ops: [{ tx_id: '777', date: '2026-10-20', montant: 300, libelle: 'VIR JEAN DUPONTEL' }], comptes: [], opsTous: [], comptesTous: [] }; rapprocherBanque(); await new Promise(r => setTimeout(r, 1500)); return S.paiements.filter(x => String(x.tx) === '777').length; });
  t(n4 === 0, 'appli toute seule : virement d\'octobre pas pointé dans le mois clôturé');
  // 5. on ne clôture pas le mois en cours
  const e5 = await p.evaluate(async () => (await SB.rpc('cloturer', { p_espace: ESPACE, p_mois: mk(TODAY) })).error?.message || '');
  t(/mois terminés/.test(e5), 'serveur : impossible de clôturer le mois en cours');
  // 6. rouvrir
  await p.evaluate(() => { view.comptaOnglet = 'comptable'; location.hash = 'compta'; render(); }); await p.waitForTimeout(800);
  await p.locator('.cloture button', { hasText: 'Rouvrir' }).click(); await p.waitForTimeout(300); await p.click('#cyes'); await p.waitForTimeout(2000);
  txt = await p.locator('.cloture').innerText(); t(/Clôturé jusqu'à fin septembre 2026/.test(txt), 'rouvrir octobre : clôturé seulement jusqu\'à septembre');
  await p.evaluate(async () => { S.paiements.find(x => x.id === 'poct').montant = 450; save(); await new Promise(r => setTimeout(r, 2000)); });
  v = await srvV(); t(v.poct.montant === 450, 'après réouverture, octobre se corrige');
  const j = await p.evaluate(async () => (await SB.from('clotures_journal').select('avant, apres').eq('espace_id', ESPACE).order('id')).data);
  t(j.length === 2 && j[0].apres === '2026-10' && j[1].apres === '2026-09', 'journal des clôtures : ' + JSON.stringify(j));
  // 7. un associé non propriétaire ne peut pas clôturer
  const ESP = await p.evaluate(() => ESPACE);
  const e7 = await p.evaluate(async esp => { await SB.auth.signOut(); const r = await SB.auth.signInWithPassword({ email: 'test-b@gestion-test.fr', password: 'TestMotDePasse-2026!' }); const x = await SB.rpc('cloturer', { p_espace: esp, p_mois: null }); await SB.auth.signOut(); await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); return x.error?.message || 'accepté'; }, ESP);
  t(/propriétaire/.test(e7), 'un non-propriétaire ne peut pas clôturer / rouvrir');
  // 8. supprimer un espace dont des mois sont clôturés marche toujours
  const e8 = await p.evaluate(async esp => { const c = await SB.rpc('cloturer', { p_espace: esp, p_mois: '2026-10' }); if (c.error) return 'clôture : ' + c.error.message; const r = await SB.from('espaces').delete().eq('id', esp).select(); return r.error ? r.error.message : (r.data || []).length; }, ESP);
  t(e8 === 1, 'supprimer un espace avec des mois clôturés : OK (' + e8 + ')');
  t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

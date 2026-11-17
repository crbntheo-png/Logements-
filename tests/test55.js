// Quittances automatiques : option dans Réglages (propriétaire), virement reconnu → quittance envoyée toute seule
// (envoi simulé), seulement les nouveaux loyers (pas l'arriéré), sans option = proposition en un geste. Vraie base, compte de test.
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
  await p.route('**/jspdf.umd.min.js', r => r.fulfill({ path: __dirname + '/vendor/jspdfpkg/package/dist/jspdf.umd.min.js', contentType: 'application/javascript' }));
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test quittances auto'); await p.click('#esp_btn'); await p.waitForTimeout(2000);
  await p.evaluate(() => {
    const m0 = addM(CUR, -2);
    S.biens.push({ id: 'b1', nom: 'Studio', type: 'Studio', adresse: '1 rue', cp: '35000', ville: 'Rennes', meuble: 'vide' }, { id: 'b2', nom: 'T2', type: 'T2', adresse: '2 rue', cp: '35000', ville: 'Rennes', meuble: 'vide' });
    S.baux.push({ id: 'l1', bienId: 'b1', nom: 'Jean Dupontel', email: 'jean@exemple.fr', typeBail: 'vide', dateEntree: m0 + '-01', suiviDepuis: m0, loyerHC: '500', charges: '0', jourPaiement: '1', revisions: [] },
                { id: 'l2', bienId: 'b2', nom: 'Marie Lefebvre', email: 'marie@exemple.fr', typeBail: 'vide', dateEntree: m0 + '-01', suiviDepuis: m0, loyerHC: '600', charges: '0', jourPaiement: '1', revisions: [] });
    // arriéré : le mois d'avant de Jean est déjà payé (saisi à la main), sans quittance envoyée
    S.paiements.push({ id: 'p0', bailId: 'l1', mois: m0, montant: 500, date: m0 + '-02', mode: 'virement' });
    GMAIL = { mode: 'google', adresse: 'proprio@exemple.fr' }; window.ENVOYES = []; envoyerMailBrut = async o => { ENVOYES.push(o.to); return true; };
    save(); go('reglages'); render();
  });
  await p.waitForTimeout(400);
  t(await p.isVisible('text=Quittances automatiques'), 'Réglages : rubrique "Quittances automatiques" (propriétaire)');
  // 1) option arrêtée : virement de Jean ce mois-ci → proposition, aucun envoi
  const r1 = await p.evaluate(async () => {
    BANQUE = { etat: 'ok', lien: { id: 1 }, comptes: [], ops: [{ tx_id: 't1', date: iso(TODAY), montant: 500, libelle: 'VIR JEAN DUPONTEL LOYER' }] };
    rapprocherBanque(); await apresLoyersRecus(); await new Promise(r => setTimeout(r, 300));
    const tt = document.getElementById('toast'); return { envoyes: ENVOYES.slice(), toast: tt && tt.innerText };
  });
  t(r1.envoyes.length === 0, 'option arrêtée : rien envoyé tout seul');
  t(/Loyer de Jean Dupontel reçu/.test(r1.toast) && /Envoyer la quittance/.test(r1.toast), 'option arrêtée : "💶 Loyer reçu" + bouton Envoyer la quittance (' + (r1.toast || '').replace(/\n/g, ' ') + ')');
  // 2) activer l'option depuis les Réglages
  await p.evaluate(() => { const r = document.querySelector('[data-rub="quittances"], #rub-quittances'); });
  await p.click('text=Quittances automatiques'); await p.waitForTimeout(300);
  await p.check('#qauto'); await p.waitForTimeout(300);
  t(await p.evaluate(() => S.sci.quittanceAuto === true) && /Activé/.test(await p.locator('#qauto-etat').innerText()), 'case cochée : option activée, "✅ Activé" en grand');
  await p.screenshot({ path: __dirname + '/shots53/qauto.png' });
  // 3) virement de Marie → quittance envoyée seule ; l'arriéré de Jean (m0) et Jean ce mois (déjà proposé) ne partent pas
  const r2 = await p.evaluate(async () => {
    BANQUE.ops.push({ tx_id: 't2', date: iso(TODAY), montant: 600, libelle: 'VIREMENT MARIE LEFEBVRE' });
    rapprocherBanque(); await apresLoyersRecus(); await new Promise(r => setTimeout(r, 300));
    return { envoyes: ENVOYES.slice(), toast: document.getElementById('toast').innerText, q: Object.keys(S.quittances) };
  });
  t(r2.envoyes.length === 1 && r2.envoyes[0] === 'marie@exemple.fr', 'option activée : quittance de Marie envoyée toute seule (' + r2.envoyes.join(',') + ')');
  t(/envoyée automatiquement \(Marie Lefebvre\)/.test(r2.toast), 'message "🧾 1 quittance envoyée automatiquement (Marie Lefebvre)"');
  t(r2.q.some(k => k.startsWith('l2|')), 'quittance notée comme envoyée');
  // 4) rouvrir / resynchroniser : pas de double envoi
  const r3 = await p.evaluate(async () => { rapprocherBanque(); await apresLoyersRecus(); return ENVOYES.length; });
  t(r3 === 1, 'nouvelle synchro : pas de double envoi');
  // 5) virement partiel : pas de quittance
  const r4 = await p.evaluate(async () => { S.baux.push({ id: 'l3', bienId: 'b1', nom: 'Paul Partiel', email: 'paul@exemple.fr', typeBail: 'vide', dateEntree: addM(CUR, -1) + '-01', suiviDepuis: CUR, loyerHC: '700', charges: '0', jourPaiement: '1', revisions: [] });
    BANQUE.ops.push({ tx_id: 't3', date: iso(TODAY), montant: 300, libelle: 'VIR PAUL PARTIEL' }); rapprocherBanque(); await apresLoyersRecus(); return { n: ENVOYES.length, paye: S.paiements.some(x => x.bailId === 'l3') }; });
  t(r4.paye && r4.n === 1, 'paiement partiel enregistré, pas de quittance');
  // 6) un associé (pas propriétaire) : pas d'envoi automatique
  const r5 = await p.evaluate(async () => { const moi = MEMBRES.membres.find(x => x.user_id === SB_USER.id); moi.role = 'editeur'; S.baux.push({ id: 'l4', bienId: 'b2', nom: 'Zoe Martinez', email: 'zoe@exemple.fr', typeBail: 'vide', dateEntree: CUR + '-01', suiviDepuis: CUR, loyerHC: '400', charges: '0', jourPaiement: '1', revisions: [] });
    BANQUE.ops.push({ tx_id: 't4', date: iso(TODAY), montant: 400, libelle: 'VIR ZOE MARTINEZ' }); rapprocherBanque(); await apresLoyersRecus(); moi.role = 'proprietaire'; return ENVOYES.length; });
  t(r5 === 1, 'associé : pas d\'envoi automatique (proposition seulement)');
  t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  await p.evaluate(async () => { await SB.from('espaces').delete().eq('id', ESPACE); });
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

// Banque directe ET Pennylane ensemble (vraie base, données insérées) : deux branchements, comparaison (décalages), pas de loyer compté deux fois,
// doublons déjà créés nettoyés, débrancher Pennylane garde la banque directe.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist');
const env = Object.fromEntries(fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split('\n').filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.split('=')[0], l.slice(l.indexOf('=') + 1).replace(/^"|"$/g, '')]));
const sql = q => JSON.parse(require('child_process').execFileSync('python3', [path.join(__dirname, 'sql.py'), q], { env: { ...process.env, ...env } }).toString() || '[]');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); }).listen(8099);
let ok = 0, ko = 0; const t = (c, m) => { c ? ok++ : ko++; console.log((c ? 'OK ' : 'KO ') + m); };
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true, serviceWorkers: 'block' })).newPage();
  p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test deux banques'); await p.click('#esp_btn'); await p.waitForTimeout(2000);
  const e = await p.evaluate(async () => { S.biens.push({ id: 'b1', nom: 'T2', adresse: '1 rue', cp: '35000', ville: 'Rennes' });
    S.baux.push({ id: 'emma', bienId: 'b1', nom: 'Emma Durand', typeBail: 'vide', dateEntree: '2026-09-01', suiviDepuis: '2026-10', loyerHC: '600', charges: '0', jourPaiement: '5', revisions: [] });
    // octobre et novembre déjà pointés grâce à Pennylane (virements vus le 9)
    S.paiements.push({ id: 'txP10-2026-10', bailId: 'emma', mois: '2026-10', montant: 600, date: '2026-10-09', mode: 'virement', tx: '9001', lot: 'tx9001' }, { id: 'txP11-2026-11', bailId: 'emma', mois: '2026-11', montant: 600, date: '2026-11-09', mode: 'virement', tx: '9002', lot: 'tx9002' });
    // et le doublon créé ce matin par la banque directe (novembre recompté sur décembre)
    S.paiements.push({ id: 'tx777-2026-12', bailId: 'emma', mois: '2026-12', montant: 600, date: '2026-11-05', mode: 'virement', tx: '777', lot: 'tx777' });
    save(); await new Promise(r => setTimeout(r, 2000)); return ESPACE; });
  sql(`insert into banque_liens (espace_id, source, derniere_synchro) values ('${e}', 'pennylane', now());
    insert into banque_directe (espace_id, banque, session_id, comptes, valide_jusqua, derniere_synchro) values ('${e}', 'Crédit Mutuel', 'faux', '[{"uid":"u1","nom":"GTP …0250"}]', now() + interval '180 days', now());
    insert into banque_comptes (espace_id, compte_id, nom, solde, source) values ('${e}', 1, 'Compte Pennylane', 5000, 'pennylane'), ('${e}', 2, 'GTP …0250', 5120, 'enablebanking');
    insert into banque (espace_id, tx_id, date, montant, libelle, source) values
     ('${e}', 9001, '2026-10-09', 600, 'VIR EMMA DURAND', 'pennylane'), ('${e}', 9002, '2026-11-09', 600, 'VIR EMMA DURAND', 'pennylane'), ('${e}', 9003, '2026-11-10', -45, 'FRAIS BANCAIRES', 'pennylane'), ('${e}', 9004, '2026-10-28', -99, 'SAISIE MANUELLE', 'pennylane'), ('${e}', 9005, '2026-11-16', -5, 'PL RECENT', 'pennylane'),
     ('${e}', 666, '2026-10-05', 600, 'EMMA DURAND · Loyer octobre', 'enablebanking'), ('${e}', 777, '2026-11-05', 600, 'EMMA DURAND · Loyer novembre', 'enablebanking'), ('${e}', 778, '2026-11-08', -45, 'FRAIS', 'enablebanking'), ('${e}', 779, '2026-10-25', 120, 'REMBOURSEMENT ASSURANCE', 'enablebanking'), ('${e}', 780, '2026-11-20', -10, 'RECENT', 'enablebanking'), ('${e}', 781, '2026-11-15', -5, 'EB RECENT', 'enablebanking')`);
  await p.evaluate(async () => { await chargerBanque(false); location.hash = 'reglages'; render(); }); await p.waitForTimeout(800);
  const P = await p.evaluate(() => S.paiements.filter(x => x.bailId === 'emma').map(x => x.mois + ':' + x.tx + (x.txAutre ? '<' + x.txAutre : '')).sort());
  console.log(JSON.stringify(P));
  t(P.length === 3, 'rien n\'est supprimé tout seul (le doublon reste en attente de ton choix)');
  t(P.includes('2026-10:666<9001'), 'octobre relié aux deux sources, sans recompter');
  await p.evaluate(() => { location.hash = 'afaire'; render(); }); await p.waitForTimeout(300);
  const af = await p.locator('#app').innerText();
  t(/Paiement peut-être compté deux fois : Emma Durand 600,00/.test(af) && /Garder novembre 2026/.test(af) && /Garder décembre 2026/.test(af), 'À faire : "⚠️ Paiement peut-être compté deux fois" avec Garder novembre / Garder décembre');
  await p.screenshot({ path: __dirname + '/shots58/doublon.png' });
  await p.locator('button:has-text("Garder novembre 2026")').first().click(); await p.waitForTimeout(800);
  const P2 = await p.evaluate(() => S.paiements.filter(x => x.bailId === 'emma').map(x => x.mois).sort());
  t(JSON.stringify(P2) === '["2026-10","2026-11"]', '"Garder novembre" : décembre retiré, novembre gardé');
  t(await p.evaluate(() => detteBail(bail('emma')) === 0 && !toutesEcheances().some(x => x.b.id === 'emma' && x.m === '2026-12' && x.paye > 0)), 'Emma : à jour, rien d\'avance sur décembre');
  await p.waitForTimeout(2500);
  // l'historique garde la suppression et permet de restaurer
  await p.evaluate(() => { HISTO = null; location.hash = 'historique'; render(); }); await p.waitForTimeout(2500);
  const hi = await p.locator('#app').innerText(); console.log(hi.slice(0, 300).replace(/\n/g, ' | '));
  t(/a supprimé le paiement de Emma Durand 600,00\s€ \(décembre 2026\)/.test(hi), 'Historique : "… a supprimé le paiement de Emma 600 € (décembre)", avec qui et quand');
  await p.screenshot({ path: __dirname + '/shots58/historique.png' });
  await p.locator('.histo-l', { hasText: 'décembre 2026' }).locator('button:has-text("Restaurer")').click(); await p.waitForTimeout(800);
  t(await p.evaluate(() => S.paiements.some(x => x.bailId === 'emma' && x.mois === '2026-12')), '♻️ Restaurer : le paiement revient');
  await p.evaluate(() => { location.hash = 'reglages'; render(); }); await p.waitForTimeout(300);
  await p.click('#rgl-banque summary'); await p.waitForTimeout(200);
  const txt = await p.locator('#rgl-banque').innerText(); console.log(JSON.stringify(await p.evaluate(() => { const c = comparaisonBanques(); return c && { periode: c.periode, paires: c.paires, b: c.seulBanque.map(o => o.date + ' ' + o.montant), p: c.seulPennylane.map(o => o.date + ' ' + o.montant) }; })));
  t(/Banque en direct \+ Pennylane/.test(txt), 'résumé : "Banque en direct + Pennylane"');
  t(/Ta banque en direct[\s\S]*référence[\s\S]*Pennylane[\s\S]*pour comparer/.test(txt), 'deux blocs : banque directe (référence) et Pennylane (pour comparer)');
  t(/2 décalages/.test(txt) && /2 opérations identiques/.test(txt), 'comparaison : 2 identiques, 2 décalages');
  await p.screenshot({ path: __dirname + '/shots58/deux-banques.png', fullPage: false });
  await p.evaluate(() => voirComparaison()); await p.waitForTimeout(300);
  const c = await p.locator('#overlay').innerText();
  t(/Seulement à la banque \(1\)[\s\S]*REMBOURSEMENT ASSURANCE/.test(c) && /Seulement dans Pennylane \(1\)[\s\S]*SAISIE MANUELLE/.test(c), 'détail : remboursement absent de Pennylane, saisie manuelle absente de la banque');
  t(!/RECENT/.test(c), 'les tout derniers jours ne sont pas comptés comme décalage (Pennylane a du retard)');
  t(/5\s120,00\s€ à la banque[\s\S]*5\s000,00\s€ dans Pennylane/.test(c), 'soldes des deux côtés');
  await p.screenshot({ path: __dirname + '/shots58/comparaison.png' });
  await p.evaluate(() => { closeOverlay(); location.hash = 'afaire'; render(); }); await p.waitForTimeout(300);
  t(/2 décalages entre ta banque et Pennylane/.test(await p.locator('#app').innerText()), 'À faire : "🔎 2 décalages entre ta banque et Pennylane"');
  // débrancher Pennylane : la banque directe reste
  await p.evaluate(async () => { await SB.rpc('banque_debrancher', { e: ESPACE }); await chargerBanque(false); });
  const r = await p.evaluate(() => ({ d: !!BANQUE.directe, pl: !!BANQUE.pennylane, ops: BANQUE.opsTous.map(o => o.source) }));
  t(r.d && !r.pl && r.ops.length === 6 && r.ops.every(x => x === 'enablebanking'), 'débrancher Pennylane : seules ses opérations partent, la banque directe reste');
  t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  await p.evaluate(async () => { closeOverlay(); await SB.from('espaces').delete().eq('id', ESPACE); });
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

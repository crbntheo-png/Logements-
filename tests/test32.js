// Ouverture instantanée (copie gardée sur l'appareil) contre la vraie base Supabase, comptes de test uniquement
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); }).listen(8099);
const MDP = 'TestMotDePasse-2026!';
let ok = 0, ko = 0; const verif = (nom, c) => { c ? ok++ : ko++; console.log((c ? 'OK ' : 'KO ') + nom); };
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: "localhost,127.0.0.1" } } : {});
  const errs = [];
  const nouvelle = async (vp) => { const ctx = await b.newContext({ viewport: vp, ignoreHTTPSErrors: true, serviceWorkers: 'block' }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text())); await p.route('**/jspdf.umd.min.js', r => r.fulfill({ path: __dirname + '/vendor/jspdfpkg/package/dist/jspdf.umd.min.js', contentType: 'application/javascript' })); return p; };
  const A = await nouvelle({ width: 390, height: 844 });
  await A.goto('http://localhost:8099/'); await A.waitForTimeout(1500);
  await A.evaluate(async m => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: m }); if (r.error) throw new Error(r.error.message); await apresConnexion(r.data.user); }, MDP);
  await A.waitForTimeout(800);
  if (await A.evaluate(() => MODE) === 'nouvel-espace') { await A.fill('#esp_nom', 'SCI Test cache'); await A.click('#esp_btn'); await A.waitForTimeout(1500); }
  const esp = await A.evaluate(() => ESPACE);
  await A.evaluate(() => { S.biens.push({ id: 'c1', nom: 'Studio cache', type: 'Studio', meuble: 'vide' }); S.baux.push({ id: 'cl1', bienId: 'c1', nom: 'Léa Cache', typeBail: 'vide', dateEntree: '2026-01-01', suiviDepuis: '2026-11', loyerHC: '500', charges: '20', jourPaiement: '5' }); save(); render(); });
  await A.waitForTimeout(2500);
  verif('copie gardée sur l\'appareil', await A.evaluate(() => !!localStorage.getItem('gestion-sci-cache')));
  // Pendant que A est fermé, un changement arrive par le serveur (comme un associé) : loyer modifié + bien supprimé + paiement ajouté
  await A.evaluate(async id => {
    await SB.from('docs').upsert({ espace_id: id, coll: 'paiements', doc_id: 'cp1', data: { id: 'cp1', bailId: 'cl1', mois: '2026-11', montant: 520, date: '2026-11-05', mode: 'virement' } });
    await SB.from('docs').upsert({ espace_id: id, coll: 'biens', doc_id: 'c2', data: { id: 'c2', nom: 'Garage', type: 'Garage' } });
  }, esp);
  // Réouverture : les données doivent être là tout de suite, avant même la réponse du serveur
  await A.route('**/rest/v1/docs*', async r => { await new Promise(x => setTimeout(x, 2500)); r.continue(); });
  await A.reload(); await A.waitForTimeout(400);
  const vite = await A.evaluate(() => [MODE, S.baux.length, document.querySelector('#app').innerText.includes('Léa')]);
  verif('ouverture instantanée (avant la réponse du serveur) : ' + JSON.stringify(vite), vite[0] === 'partage' && vite[1] === 1 && vite[2]);
  await A.waitForTimeout(4500);
  const apres = await A.evaluate(() => [S.paiements.length, S.biens.map(x => x.nom).sort().join(','), APERCU]);
  verif('mise à jour en arrière-plan : ' + JSON.stringify(apres), apres[0] === 1 && apres[1] === 'Garage,Studio cache' && apres[2] === false);
  // Suppression faite ailleurs : disparaît à la réouverture suivante
  await A.unroute('**/rest/v1/docs*');
  await A.evaluate(async id => { await SB.from('docs').delete().match({ espace_id: id, coll: 'biens', doc_id: 'c2' }); }, esp);
  await A.waitForTimeout(3000); await A.reload(); await A.waitForTimeout(3000);
  verif('suppression faite ailleurs reprise', await A.evaluate(() => S.biens.map(x => x.nom).join(',')) === 'Studio cache');
  // Une modification faite pendant la mise à jour n'est pas écrasée
  await A.route('**/rest/v1/docs?select*', async r => { await new Promise(x => setTimeout(x, 2500)); r.continue(); });
  await A.reload(); await A.waitForTimeout(400);
  await A.evaluate(() => { bail('cl1').loyerHC = '555'; save(); });
  await A.waitForTimeout(5000); await A.unroute('**/rest/v1/docs?select*');
  verif('modif faite pendant la mise à jour gardée', await A.evaluate(() => bail('cl1').loyerHC) === '555');
  await A.reload(); await A.waitForTimeout(3000);
  verif('modif bien enregistrée en ligne', await A.evaluate(async id => (await SB.from('docs').select('data').match({ espace_id: id, coll: 'baux', doc_id: 'cl1' }).single()).data.data.loyerHC, esp) === '555');
  // Hors connexion : on voit quand même ses données
  await A.route('**/*.supabase.co/**', r => r.abort());
  await A.reload(); await A.waitForTimeout(2500);
  const hors = await A.evaluate(() => [MODE, S.baux.length, document.querySelector('#app').innerText.includes('Léa')]);
  verif('hors connexion : données visibles ' + JSON.stringify(hors), hors[0] === 'partage' && hors[1] === 1 && hors[2]);
  await A.unroute('**/*.supabase.co/**'); await A.reload(); await A.waitForTimeout(2500);
  // Nettoyage puis déconnexion : la copie est effacée
  await A.evaluate(async id => { await SB.from('espaces').delete().eq('id', id); }, esp);
  await A.evaluate(() => SB.auth.signOut()); await A.waitForTimeout(1500);
  verif('déconnexion : copie effacée', await A.evaluate(() => !localStorage.getItem('gestion-sci-cache') && !localStorage.getItem('gestion-sci-v1')));
  await A.reload(); await A.waitForTimeout(1500);
  verif('déconnexion : écran de connexion', await A.evaluate(() => MODE) === 'connexion');
  console.log('ERREURS', errs.filter(e => !/Failed to load resource|ERR_FAILED|fetch/i.test(e)));
  console.log(`${ok}/${ok + ko}`);
  await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

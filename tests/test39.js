// Copie de sauvegarde chaque semaine par e-mail : propriétaire seulement, aperçu (adresse, taille) avant "Oui, activer",
// arrêt, refus pour un autre compte. Vraie base, comptes de test. AUCUN e-mail n'est envoyé (aperçu seulement, case "maintenant" décochée).
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist'), OUT = __dirname + '/shots39';
fs.mkdirSync(OUT, { recursive: true });
const types = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(8095);
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })).newPage();
  p.on('pageerror', e => errs.push(e.message));
  let envoisReels = 0;
  p.on('request', r => { if (/functions\/v1\/sauvegarde/.test(r.url()) && r.method() === 'POST' && !/"apercu":true/.test(r.postData() || '')) envoisReels++; });
  await p.goto('http://localhost:8095/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1200); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test Copie'); await p.click('#esp_btn'); await p.waitForTimeout(2500);
  const espace = await p.evaluate(() => ESPACE);
  await p.evaluate(() => { S.biens.push({ id: 'b1', nom: 'Studio', type: 'Studio', meuble: 'vide' }); save(); }); await p.waitForTimeout(1500);
  await p.evaluate(() => reglage('sauv')); await p.waitForTimeout(1500);
  ok('bouton "M\'envoyer une copie chaque semaine par e-mail"', await p.evaluate(() => /M'envoyer une copie chaque semaine par e-mail/.test(document.querySelector('#rgl-sauv').innerText)));
  await p.click('#rgl-sauv button:has-text("M\'envoyer une copie")'); await p.waitForTimeout(4000);
  await p.screenshot({ path: OUT + '/1-apercu.png' });
  const t = await p.evaluate(() => document.getElementById('overlay').innerText);
  ok('aperçu : adresse, taille, contenu', /test-a@gestion-test\.fr/.test(t) && /\d+ ko/.test(t) && /1 logement/.test(t) && /\.json\.txt/.test(t));
  ok('bouton "Oui, activer"', await p.evaluate(() => document.querySelector('#mform button.primary').textContent.trim() === 'Oui, activer'));
  await p.evaluate(() => { const c = document.querySelector('#mform input[name=maintenant]'); c.checked = false; }); // surtout pas d'envoi réel
  await p.click('#mform button.primary'); await p.waitForTimeout(2500);
  ok('activée (sans envoi)', await p.evaluate(async e => (await SB.from('sauvegarde_hebdo').select('active').eq('espace_id', e).single()).data.active === true, espace));
  await p.screenshot({ path: OUT + '/2-active.png' });
  ok('Réglages : "chaque lundi matin" + Envoyer maintenant + Arrêter', await p.evaluate(() => { const x = document.querySelector('#rgl-sauv').innerText; return /chaque lundi matin/.test(x) && /Envoyer une copie maintenant/.test(x) && /Arrêter/.test(x); }));
  // "Envoyer maintenant" : l'aperçu demande "Oui, envoyer" et prévient ; on n'envoie pas (Annuler)
  await p.click('#rgl-sauv button:has-text("Envoyer une copie maintenant")'); await p.waitForTimeout(4000);
  ok('envoyer maintenant : aperçu + "Oui, envoyer" + "ne peut pas être annulé"', await p.evaluate(() => /ne peut pas être annulé/.test(document.getElementById('overlay').innerText) && document.querySelector('#mform button.primary').textContent.trim() === 'Oui, envoyer'));
  await p.evaluate(() => closeOverlay());
  ok('aucun e-mail envoyé pendant le test', envoisReels === 0);
  // Arrêter
  await p.click('#rgl-sauv button:has-text("Arrêter")'); await p.waitForTimeout(300); await p.click('#cyes'); await p.waitForTimeout(2000);
  ok('arrêtée', await p.evaluate(async e => (await SB.from('sauvegarde_hebdo').select('active').eq('espace_id', e).single()).data.active === false, espace));
  // un autre compte (pas propriétaire de cet espace) : refusé côté serveur
  const p2 = await (await b.newContext({ serviceWorkers: 'block' })).newPage(); await p2.goto('http://localhost:8095/'); await p2.waitForTimeout(1000);
  const refus = await p2.evaluate(async e => { await SB.auth.signInWithPassword({ email: 'test-b@gestion-test.fr', password: 'TestMotDePasse-2026!' }); ESPACE = e;
    const a = await SB.rpc('sauvegarde_activer', { e, actif: true }); let f = ''; try { await fnSauvegarde({ apercu: true }); } catch (x) { f = x.message; } return [a.error && a.error.message, f]; }, espace);
  ok('autre compte : activer refusé (' + refus[0] + ')', /Seul le propriétaire/.test(refus[0] || ''));
  ok('autre compte : copie refusée (' + refus[1] + ')', /propriétaire/.test(refus[1] || ''));
  // l'import accepte le fichier .txt envoyé par e-mail
  ok('"Ouvrir une sauvegarde" accepte le .txt', await p.evaluate(() => /\.txt/.test(document.getElementById('importFile').accept)));
  await p.evaluate(async e => { await SB.from('espaces').delete().eq('id', e); }, espace);
  console.log('ERREURS', errs); console.log('KO', KO);
  await b.close(); srv.close();
})().catch(e => { console.log('FATAL', e.message); srv.close(); process.exit(1); });

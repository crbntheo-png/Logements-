// Banque en direct (vraie base, vrai Enable Banking, sans les codes de la banque) : liste des banques, recherche,
// départ vers la banque (adresse d'accord réelle), retour annulé ou faux code bien expliqués, droits.
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
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test banque directe'); await p.click('#esp_btn'); await p.waitForTimeout(2500);
  await p.evaluate(() => { location.hash = 'reglages'; render(); }); await p.waitForTimeout(500);
  await p.click('#rgl-banque summary'); await p.waitForTimeout(200);
  t(await p.isVisible('button:has-text("Relier ma banque")'), 'Réglages › Banque : "🏦 Relier ma banque"');
  await p.click('button:has-text("Relier ma banque")'); await p.waitForSelector('.bq-l', { timeout: 30000 });
  t((await p.locator('.bq-l').count()) >= 10 && /banques : tape le nom/.test(await p.locator('#bq_liste').innerText()), 'liste des banques françaises chargée');
  await p.fill('#bq_q', 'credit mutuel'); await p.waitForTimeout(300);
  const noms = await p.$$eval('.bq-l span', l => l.map(x => x.textContent));
  t(noms.includes('Crédit Mutuel') && noms.every(n => /mutuel/i.test(n)), 'recherche sans accents : ' + noms.slice(0, 4).join(', '));
  t(await p.inputValue('#overlay select[name=type]') === 'business', 'compte professionnel proposé pour une SCI');
  await p.screenshot({ path: __dirname + '/shots58/banque.png' });
  await p.evaluate(() => { const i = [...document.querySelectorAll('.bq-l')].find(l => l.textContent.trim() === 'Crédit Mutuel'); i.querySelector('input').checked = true; });
  let cible = null; await p.route(/enablebanking|tilisy/, r => { cible = r.request().url(); r.fulfill({ status: 200, body: 'banque' }); });
  await p.click('#overlay button.primary'); await p.waitForTimeout(6000);
  console.log('adresse de la banque :', (cible || '').slice(0, 90));
  t(cible && /^https:\/\/[^/]*(enablebanking|tilisy)[^/]*\//.test(cible), 'départ vers l\'accord officiel de la banque (Enable Banking)');
  const ligne = await p.evaluate(async () => { await new Promise(r => setTimeout(r, 0)); return null; });
  // retour : annulé par l'utilisateur
  await p.goto('http://localhost:8099/?error=access_denied&error_description=Annul%C3%A9%20par%20l%27utilisateur&state=eb-123'); await p.waitForTimeout(4000);
  t(!/state=/.test(p.url()), 'au retour, l\'adresse est nettoyée (pas de code qui traîne)');
  t(/Banque pas reliée/.test(await p.locator('#overlay').innerText().catch(() => '')) && /Annulé par l'utilisateur/.test(await p.locator('#overlay').innerText()), 'retour annulé : message clair');
  // retour avec un faux code mais le vrai "state"
  const etat = await p.evaluate(async () => (await SB.from('banque_directe').select('etat, banque').eq('espace_id', ESPACE).maybeSingle()).data);
  t(etat && /^eb-/.test(etat.etat) && etat.banque === 'Crédit Mutuel', 'connexion en cours notée (banque, jeton de retour)');
  await p.goto(`http://localhost:8099/?code=faux-code&state=${etat.etat}`); await p.waitForTimeout(7000);
  const tx = await p.locator('#overlay').innerText().catch(() => ''); console.log(tx.replace(/\n/g, ' ').slice(0, 200));
  t(/n'a pas confirmé l'accès|Ça n'a pas marché/.test(tx), 'faux code : refusé par la banque, message clair');
  // droits : sans connexion
  const anon = await p.evaluate(async () => { const r = await fetch(APP_SUPABASE.url + '/functions/v1/banque-directe', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: APP_SUPABASE.cle }, body: JSON.stringify({ action: 'banques' }) }); return r.status; });
  t(anon === 401, 'sans connexion : refusé');
  const cron = await p.evaluate(async () => { const r = await fetch(APP_SUPABASE.url + '/functions/v1/banque-directe', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: APP_SUPABASE.cle, 'x-cle-cron': 'mauvaise' }, body: JSON.stringify({ action: 'toutes' }) }); return r.status; });
  t(cron === 401, 'relecture de toutes les banques : refusée sans la clé de la tâche');
  t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  await p.evaluate(async () => { closeOverlay(); await SB.from('espaces').delete().eq('id', ESPACE); });
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

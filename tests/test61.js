// Agenda abonné (vraie base, vraie fonction) : lien créé, calendrier lisible SANS connexion par un agenda (format .ics valide),
// mis à jour tout seul après une modification, faux lien refusé, désactivation = plus lisible.
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
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test agenda'); await p.click('#esp_btn'); await p.waitForTimeout(2000);
  await p.evaluate(() => { S.biens.push({ id: 'b1', nom: 'Studio', adresse: '1 rue', cp: '35000', ville: 'Rennes' }); S.baux.push({ id: 'l1', bienId: 'b1', nom: 'Jean Dupontel', typeBail: 'vide', dateEntree: '2025-03-01', loyerHC: '500', charges: '50', jourPaiement: '5', revisions: [], assuranceFin: iso(addDays(TODAY, 40)) }); save(); location.hash = 'reglages'; render(); });
  await p.waitForTimeout(1500);
  await p.evaluate(() => abonnerAgenda()); await p.waitForTimeout(2500);
  const url = await p.inputValue('#agenda_lien');
  t(/\/functions\/v1\/agenda\?j=[A-Za-z0-9_-]{40,}$/.test(url), 'lien d\'agenda créé');
  t(await p.isVisible('#overlay a:has-text("Google Agenda")') && /calendar\.google\.com\/calendar\/r\?cid=webcal/.test(await p.getAttribute('#overlay a:has-text("Google Agenda")', 'href')), 'bouton Google Agenda (abonnement webcal)');
  t(/^webcal:/.test(await p.getAttribute('#overlay a:has-text("iPhone")', 'href')), 'bouton iPhone / Mac (webcal)');
  await p.screenshot({ path: __dirname + '/shots58/agenda.png' });
  // lu comme le ferait Google : sans connexion, sans clé
  const lire = async () => (await (await b.newContext({ ignoreHTTPSErrors: true })).request.get(url));
  let r = await lire(); let ics = await r.text();
  t(r.status() === 200 && /text\/calendar/.test(r.headers()['content-type']), 'lisible sans connexion, en text/calendar');
  t(/^BEGIN:VCALENDAR/.test(ics) && /END:VCALENDAR\s*$/.test(ics) && ics.split('\r\n').every(l => [...l].length <= 75), 'format .ics valide (lignes repliées)');
  t(/SUMMARY:💶 Loyer Jean Dupontel/.test(ics) && /Assurance de Jean Dupontel/.test(ics) && /Taxe foncière/.test(ics), 'loyers, fin d\'assurance, taxe foncière dans l\'agenda');
  // modification -> mise à jour toute seule
  await p.evaluate(() => { closeOverlay(); S.baux.push({ id: 'l2', bienId: 'b1', nom: 'Marie Nouvelle', typeBail: 'vide', dateEntree: iso(TODAY), loyerHC: '600', charges: '0', jourPaiement: '1', revisions: [] }); save(); });
  await p.waitForTimeout(5000);
  ics = await (await lire()).text();
  t(/Marie Nouvelle/.test(ics), 'nouveau locataire : l\'agenda se met à jour tout seul');
  const lu = await p.evaluate(async () => (await SB.from('agendas').select('lu_le').eq('espace_id', ESPACE).maybeSingle()).data.lu_le);
  t(!!lu, 'l\'appli sait quand l\'agenda a été lu');
  const faux = await (await b.newContext({ ignoreHTTPSErrors: true })).request.get(url.replace(/j=.*/, 'j=' + 'A'.repeat(43)));
  t(faux.status() === 404, 'faux lien refusé');
  const anon = await p.evaluate(async () => { const c = window.supabase.createClient(APP_SUPABASE.url, APP_SUPABASE.cle); return ((await c.from('agendas').select('*')).data || []).length; });
  t(anon === 0, 'table fermée sans connexion');
  await p.evaluate(async () => { await SB.from('agendas').delete().eq('espace_id', ESPACE); delete S.sci.agendaJeton; save(); });
  t((await lire()).status() === 404, 'désactivé : plus lisible');
  t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  await p.evaluate(async () => { await SB.from('espaces').delete().eq('id', ESPACE); });
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

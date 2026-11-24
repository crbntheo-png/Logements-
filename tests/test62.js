// Boîte à documents (vraie base, vraie fonction, vraie IA pour 1 document) : adresse créée, e-mail d'un membre → document "à ranger",
// refus d'un inconnu / d'une adresse inconnue / sans pièce jointe / sans clé, "Lire et ranger" (IA) le range tout seul, "Ranger" à la main.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist');
const env = Object.fromEntries(fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split('\n').filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.split('=')[0], l.slice(l.indexOf('=') + 1).replace(/^"|"$/g, '')]));
const types = { '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); }).listen(8099);
let ok = 0, ko = 0; const t = (c, m) => { c ? ok++ : ko++; console.log((c ? 'OK ' : 'KO ') + m); };
const TAXE = `<html><body style="font-family:sans-serif"><h2>DIRECTION GÉNÉRALE DES FINANCES PUBLIQUES</h2><h1>AVIS D'IMPÔT 2026 – TAXES FONCIÈRES</h1><p>Adresse du bien imposé : 41 RUE DE BEAUCHAMPS 35000 RENNES</p><p>Cotisation commune 612 €, intercommunalité 38 €, taxe d'enlèvement des ordures ménagères 133 €, frais 41 €.</p><p><b>Montant de votre impôt : 824 €</b></p></body></html>`;
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const g = await b.newPage(); await g.setContent(TAXE); const pdf = (await g.pdf({ format: 'A4' })).toString('base64'); await g.close();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true, serviceWorkers: 'block' }); const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
  // sans internet (sessions Claude en ligne) : la lecture des PDF utilise la copie locale de pdf.js
  if (fs.existsSync(__dirname + '/vendor/pdfjs/pdf.min.js')) { await p.route('**/pdf.js/3.11.174/pdf.min.js', r => r.fulfill({ path: __dirname + '/vendor/pdfjs/pdf.min.js', contentType: 'application/javascript' })); await p.route('**/pdf.js/3.11.174/pdf.worker.min.js', r => r.fulfill({ path: __dirname + '/vendor/pdfjs/pdf.worker.min.js', contentType: 'application/javascript' })); }
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test Boite'); await p.click('#esp_btn'); await p.waitForTimeout(2000);
  await p.evaluate(() => { S.sci.nom = 'GTP Invest'; S.biens.push({ id: 'b41', nom: '41 Beauchamps', adresse: '41 rue de Beauchamps', cp: '35000', ville: 'Rennes' }, { id: 'b43', nom: '43 Beauchamps', adresse: '43 rue de Beauchamps', cp: '35000', ville: 'Rennes' }); save(); location.hash = 'docs'; render(); });
  await p.waitForTimeout(1500);
  t(await p.isVisible('text=Ta boîte à documents'), 'Docs : carte "📨 Ta boîte à documents"');
  await p.click('button:has-text("Créer mon adresse")'); await p.waitForTimeout(1500);
  const adr = await p.locator('.boite-adr b').innerText(); const code = adr.split('@')[0];
  t(/^gtp-invest-[a-z0-9]{5}@sci-gestion-locative\.com$/.test(adr), 'adresse créée : ' + adr);
  await p.screenshot({ path: __dirname + '/shots58/boite.png' });
  const SBURL = await p.evaluate(() => APP_SUPABASE.url);
  const appel = async (corps, secret = env.BOITE_SECRET) => (await ctx.request.post(SBURL + '/functions/v1/boite', { headers: { 'Content-Type': 'application/json', 'x-boite-secret': secret }, data: corps })).status();
  t(await appel({ code, de: 'test-a@gestion-test.fr', pjs: [{ nom: 'x.pdf', type: 'application/pdf', b64: pdf }] }, 'mauvaise') === 401, 'sans la clé du programme : refusé');
  t(await appel({ code, de: 'inconnu@pirate.fr', pjs: [{ nom: 'x.pdf', type: 'application/pdf', b64: pdf }] }) === 403, 'expéditeur inconnu : refusé');
  t(await appel({ code: 'nexistepas-xx', de: 'test-a@gestion-test.fr', pjs: [] }) === 404, 'adresse inconnue : refusée');
  t(await appel({ code, de: 'test-a@gestion-test.fr', pjs: [] }) === 422, 'sans pièce jointe : refusé');
  const st = await appel({ code: code.toUpperCase(), de: 'Test-A@gestion-test.fr', objet: 'TR: Avis de taxe foncière 2026', pjs: [{ nom: 'avis-tf-2026.pdf', type: 'application/pdf', b64: pdf }, { nom: 'virus.exe', type: 'application/x-msdownload', b64: 'AAAA' }] });
  t(st === 200, 'e-mail d\'un membre : accepté');
  await p.waitForFunction(() => S.fichiers.some(f => f.boite), null, { timeout: 20000 }).catch(() => {}); await p.evaluate(() => render());
  await p.waitForTimeout(500); await p.waitForFunction(() => !LECTURE_RECUS && S.fichiers.some(f => f.boite && (f.bienId || LU_RECUS[f.id])), null, { timeout: 30000 }).catch(() => {});
  // Depuis le 19/11 : un papier reçu est lu sans IA dès l'arrivée et rangé tout seul si c'est sûr
  const A = await p.evaluate(() => S.fichiers.filter(f => f.boite).map(f => ({ nom: f.nom, de: f.de, objet: f.objet, bienId: f.bienId, cat: f.cat, seul: !!f.rangeSeul })));
  t(A.length === 1 && A[0].nom === 'avis-tf-2026' && A[0].de === 'test-a@gestion-test.fr' && /Avis de taxe/.test(A[0].objet || ''), 'le PDF arrive (le .exe est ignoré), avec l\'objet du mail');
  t(A[0].bienId === 'b41' && A[0].cat === 'Taxe foncière' && A[0].seul, 'lu sans IA et rangé tout seul : 41 Beauchamps, Taxe foncière');
  await p.evaluate(() => { closeOverlay(); remettreDansBoite(S.fichiers.find(f => f.nom === 'avis-tf-2026').id); render(); }); await p.waitForTimeout(400);
  t(/avis-tf-2026/.test(await p.locator('.boite').first().innerText()) && /sûrement pour/.test(await p.locator('.boite').first().innerText()), 'Annuler : de retour dans "À ranger", avec la proposition');
  await p.screenshot({ path: __dirname + '/shots58/boite-recu.png' });
  // IA : lire et ranger
  await p.click('.boite button:has-text("Lire et ranger") >> nth=0'); await p.waitForSelector('#overlay:not([hidden]) .gros-msg', { timeout: 120000 }); await p.waitForTimeout(2500);
  const f = await p.evaluate(() => S.fichiers.find(x => x.nom === 'avis-tf-2026'));
  t(f.bienId === 'b41' && f.cat === 'Taxe foncière', 'IA : rangé tout seul dans 41 Beauchamps, catégorie Taxe foncière');
  t(/Taxe foncière 2026 — 41 Beauchamps/.test(await p.locator('#overlay h2').innerText()), 'IA : la fiche taxe foncière s\'ouvre déjà remplie');
  // ranger à la main un 2e envoi
  await appel({ code, de: 'test-a@gestion-test.fr', objet: 'Facture', pjs: [{ nom: 'facture.pdf', type: 'application/pdf', b64: pdf }] });
  await p.waitForFunction(() => S.fichiers.some(f => f.nom === 'facture'), null, { timeout: 20000 }).catch(() => {});
  await p.evaluate(() => { closeOverlay(); render(); }); await p.waitForTimeout(500); await p.waitForFunction(() => !LECTURE_RECUS, null, { timeout: 30000 }).catch(() => {});
  // (même PDF que l'avis : rangé tout seul ; on le remet dans "À ranger" pour essayer le rangement à la main)
  await p.evaluate(() => { const f = S.fichiers.find(x => x.nom === 'facture'); if (f && f.bienId) remettreDansBoite(f.id); closeOverlay(); render(); });
  const id2 = await p.evaluate(() => (recusBoite()[0] || {}).id);
  await p.evaluate(id => rangerRecu(id), id2); await p.selectOption('#overlay select[name=bienId]', 'b43'); await p.selectOption('#overlay select[name=cat]', 'Factures et travaux'); await p.click('#overlay button.primary'); await p.waitForTimeout(300);
  t(await p.evaluate(id => { const x = S.fichiers.find(y => y.id === id); return x.bienId === 'b43' && x.cat === 'Factures et travaux' && !recusBoite().length; }, id2), '"Ranger" à la main : logement et catégorie choisis');
  // expéditeur autorisé en plus
  await p.evaluate(() => expediteursBoite()); await p.fill('#boite_ex', 'syndic@exemple.fr'); await p.click('#overlay button.primary'); await p.waitForTimeout(1200);
  t(await appel({ code, de: 'syndic@exemple.fr', pjs: [{ nom: 'appel.pdf', type: 'application/pdf', b64: pdf }] }) === 200, 'adresse ajoutée (syndic) : acceptée');
  const anon = await p.evaluate(async () => { const c = window.supabase.createClient(APP_SUPABASE.url, APP_SUPABASE.cle); return ((await c.from('boites').select('*')).data || []).length; });
  t(anon === 0, 'table fermée sans connexion');
  t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  await p.evaluate(async () => { closeOverlay(); await SB.storage.from('documents').remove(S.fichiers.map(f => f.chemin).filter(Boolean)); await SB.from('espaces').delete().eq('id', ESPACE); });
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

// Nouvel utilisateur : connexion, création d'espace, invitation de 2 associés d'un coup, l'associé rejoint, l'IA réservée au propriétaire, limites normales
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); }).listen(8099);
let ok = 0, ko = 0; const t = (c, m) => { c ? ok++ : ko++; console.log((c ? 'OK ' : 'KO ') + m); };
const [PROP, ASSO1, ASSO2, MDP] = [process.env.U_PROP, process.env.U_A1, process.env.U_A2, process.env.U_MDP];
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const ctx = () => b.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true, serviceWorkers: 'block' });
  const p = await (await ctx()).newPage(); p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
  await p.goto('http://localhost:8099/'); await p.waitForTimeout(1200);
  await p.evaluate(async ([e, m]) => { const r = await SB.auth.signInWithPassword({ email: e, password: m }); await apresConnexion(r.data.user); }, [PROP, MDP]);
  await p.waitForTimeout(2000);
  t(await p.isVisible('h1:has-text("Bienvenue")') && await p.isVisible('#esp_btn'), 'nouveau compte : écran « Bienvenue » et « Créer mon espace »');
  await p.screenshot({ path: __dirname + '/b50-bienvenue.png' });
  await p.fill('#esp_nom', 'SCI Les Tilleuls'); await p.click('#esp_btn'); await p.waitForTimeout(2500);
  t(await p.evaluate(() => !!ESPACE && estProprio()), 'espace créé, il en est le propriétaire');
  const cr = await p.evaluate(async () => { const s = (await SB.auth.getSession()).data.session; const r = await fetch(window.APP_SUPABASE.url + '/functions/v1/ia', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: window.APP_SUPABASE.cle, Authorization: 'Bearer ' + s.access_token }, body: JSON.stringify({ action: 'credits' }) }); return r.json(); });
  console.log(JSON.stringify(cr));
  t(!cr.illimite && cr.par_mois === 5 && cr.mois_restant === 5 && cr.docs_par_mois === 15, 'crédits IA normaux pour un nouveau compte (5 analyses, 15 lectures / mois)');
  // inviter 2 associés d'un coup
  await p.evaluate(() => reglage('membres')); await p.waitForTimeout(1200);
  await p.evaluate(() => { const d = document.querySelector('#inv_email'); if (d) d.scrollIntoView(); });
  await p.fill('#inv_email', `${ASSO1}, ${ASSO2}`); await p.click('form:has(#inv_email) button.primary'); await p.waitForTimeout(2500);
  t(await p.isVisible('#overlay >> text=2 personnes invitées') && await p.isVisible('#overlay .gros-msg >> text=préviens-les'), 'invitation : « 2 personnes invitées » et « préviens-les » en grand');
  const txt = await p.evaluate(() => document.getElementById('txtInvit').value); console.log(txt);
  t(txt.includes('https://sci-gestion-locative.com') && txt.includes('SCI Les Tilleuls'), 'message prêt : lien de l’appli et nom de l’espace');
  await p.screenshot({ path: __dirname + '/b50-invitation.png' });
  await p.evaluate(() => closeOverlay()); await p.waitForTimeout(800);
  t(await p.evaluate(() => MEMBRES && MEMBRES.invitations.length === 2), '2 invitations enregistrées');
  t(await p.isVisible('text=Les crédits IA'), 'Réglages : « les crédits IA sont à toi »');
  const espace = await p.evaluate(() => ESPACE);
  // l'associé se connecte : il arrive dans l'espace, l'IA lui est refusée
  const q = await (await ctx()).newPage(); q.on('pageerror', e => errs.push(e.message)); await q.route(/accounts\.google\.com\/gsi/, r => r.abort());
  await q.goto('http://localhost:8099/'); await q.waitForTimeout(1200);
  await q.evaluate(async ([e, m]) => { const r = await SB.auth.signInWithPassword({ email: e, password: m }); await apresConnexion(r.data.user); }, [ASSO1, MDP]);
  await q.waitForTimeout(3000);
  t(await q.evaluate(e => ESPACE === e && !estProprio() && !LECTURE, espace), 'associé : arrive directement dans l’espace, peut modifier');
  const ia = await q.evaluate(async () => { const s = (await SB.auth.getSession()).data.session; const r = await fetch(window.APP_SUPABASE.url + '/functions/v1/ia', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: window.APP_SUPABASE.cle, Authorization: 'Bearer ' + s.access_token }, body: JSON.stringify({ action: 'bail', espace: ESPACE, texte: 'x'.repeat(400) }) }); return { s: r.status, j: await r.json() }; });
  console.log(JSON.stringify(ia));
  t(ia.s === 403 && /réservée au propriétaire/.test(ia.j.erreur), 'serveur : l’IA refusée à l’associé');
  await q.evaluate(() => { S.biens.push({ id: 'x1', nom: 'T1', adresse: '', meuble: 'vide' }); editBail(null); }); await q.waitForTimeout(300);
  t(await q.isVisible('#overlay button:has-text("Remplir depuis le bail")') && await q.evaluate(() => !estProprio()), 'associé : bouton de lecture simple du bail (l’IA lui est refusée)');
  t(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  await p.evaluate(async () => { await SB.from('espaces').delete().eq('id', ESPACE); });
  console.log(`\n${ok} OK, ${ko} KO`); await b.close(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

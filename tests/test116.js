// Procès-verbal d'assemblée générale (mode local) + erreurs qui remontent toutes seules (compte de test réel) + "?" retiré du texte pour Claude.
const { chromium, devices } = require('playwright'); const fs = require('fs'), path = require('path'), http = require('http'), { execSync } = require('child_process');
const src = fs.readFileSync(__dirname + '/test4.js', 'utf8');
let FAKE = fs.readFileSync(__dirname + '/test2.js', 'utf8').split('const FAKE = `')[1].split('`;')[0];
const mcpBlock = src.split("FAKE = FAKE.replace(/const mcp = \\{[\\s\\S]*?\\};\\n/, `")[1].split("`);")[0];
FAKE = FAKE.replace(/const mcp = \{[\s\S]*?\};\n/, mcpBlock);
const DIST = path.join(__dirname, '..', 'dist');
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'application/javascript' : 'text/plain' }); fs.createReadStream(f).pipe(r); }).listen(8097);
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}), errs = [];
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date(new Date().getFullYear(), 4, 15, 10) }); // mi-mai : la tâche "Assemblée générale" est là
  await p.addInitScript(FAKE); await p.goto('file://' + path.join(__dirname, '..', 'index.html')); await p.waitForTimeout(500);
  const Y = await p.evaluate(() => { S = demo(); S.sci.forme = 'sci'; S.sci.regime = 'IR'; S.sci.nom = 'SCI Les Tests'; S.sci.gerant = 'Camille Test'; S.sci.siege = '1 rue du Test, 75001 Paris';
    S.sci.associes = [{ nom: 'Camille Test', parts: 60 }, { nom: 'Dominique Test', parts: 40 }]; save(); render(); return TODAY.getFullYear(); });
  // la tâche de mai : bouton "Préparer le procès-verbal"
  const t = await p.evaluate(() => { const t = taches().find(x => x.key.startsWith('fisc-ag-')); return t && t.acts.map(a => a[0] + '|' + a[1]); });
  ok('À faire en mai : "Assemblée générale" avec le bouton "📝 Préparer le procès-verbal"', t && t.some(a => /Préparer le procès-verbal\|pvAG\(\d{4}\)/.test(a)));
  await p.evaluate(Y => { view.comptaAnnee = Y - 1; view.comptaOnglet = 'comptable'; location.hash = 'compta'; render(); }, Y); await p.waitForTimeout(300);
  ok('Compta › Comptable (année passée) : carte "Assemblée générale" avec le bouton', /Assemblée générale : comptes \d{4}/.test(await p.locator('#app').innerText()));
  // SCI à l'IR, bénéfice : répartition entre associés
  await p.evaluate(Y => pvAG(Y - 1), Y); await p.waitForTimeout(250);
  await p.fill('#mform [name=resultat]', '10000'); await p.fill('#mform [name=capital]', '1000');
  await p.evaluate(() => document.getElementById('mform').requestSubmit()); await p.waitForTimeout(600);
  let doc = await p.evaluate(() => document.getElementById('overlay').textContent.replace(/[\u00a0\u202f]/g, ' '));
  ok('PV : titre, SCI, capital, siège, présents 100 sur 100', /Procès-verbal de l'assemblée générale ordinaire annuelle/i.test(doc) && /SCI Les Tests/.test(doc) && /au capital de 1 000,00/.test(doc) && /100 sur 100/.test(doc));
  ok('PV : 4 résolutions (comptes, affectation, quitus, pouvoirs), unanimité', /Première résolution/i.test(doc) && /Deuxième résolution/i.test(doc) && /quitus entier et sans réserve à Camille Test/.test(doc) && /Quatrième résolution/i.test(doc) && /unanimité/.test(doc));
  ok('PV à l\'IR : bénéfice de 10 000 € réparti 6 000 / 4 000 selon les parts', /un bénéfice de 10[  ]000,00/.test(doc) && /Camille Test \(60 parts, 60 %\)\s*6[  ]000,00/.test(doc) && /Dominique Test \(40 parts, 40 %\)\s*4[  ]000,00/.test(doc));
  ok('PV : signature du président et des associés, capital gardé dans la fiche SCI', /Le président de séance/i.test(doc) && /Les associés/i.test(doc) && await p.evaluate(() => S.sci.capital === 1000));
  // SCI à l'IS, perte, un associé absent
  await p.evaluate(Y => { fermerDoc(); S.sci.regime = 'IS'; pvAG(Y - 1); }, Y); await p.waitForTimeout(250);
  await p.fill('#mform [name=resultat]', '-2500'); await p.locator('#mform [name=p1]').uncheck();
  await p.evaluate(() => document.getElementById('mform').requestSubmit()); await p.waitForTimeout(600);
  doc = await p.evaluate(() => document.getElementById('overlay').textContent.replace(/[\u00a0\u202f]/g, ' '));
  ok('PV à l\'IS avec perte : "une perte de 2 500 €" au report à nouveau, vote 60 parts sur 100 (pas l\'unanimité)', /une perte de 2[  ]500,00/.test(doc) && /report à nouveau/.test(doc) && /représentant 60 parts sur 100/.test(doc) && !/unanimité/.test(doc));
  // IS, dividendes
  await p.evaluate(Y => { fermerDoc(); pvAG(Y - 1); }, Y); await p.waitForTimeout(250);
  await p.fill('#mform [name=resultat]', '5000'); await p.selectOption('#mform [name=affectation]', 'dividendes');
  await p.evaluate(() => document.getElementById('mform').requestSubmit()); await p.waitForTimeout(600);
  doc = await p.evaluate(() => document.getElementById('overlay').textContent.replace(/[\u00a0\u202f]/g, ' '));
  ok('PV à l\'IS : dividendes 3 000 / 2 000', /distribuer le bénéfice/.test(doc) && /3[  ]000,00/.test(doc) && /2[  ]000,00/.test(doc));
  ok('nom propre : pas d\'assemblée générale', await p.evaluate(() => { fermerDoc(); S.sci.forme = 'perso'; pvAG(2025); const o = document.getElementById('overlay').hidden; S.sci.forme = 'sci'; return o; }));
  // le "?" d'aide ne part plus dans le texte pour Claude
  ok('texte pour Claude : le bouton "?" est retiré', await p.evaluate(() => sansHtml(`${cq("pno")} Obligatoire`) === 'Obligatoire'));
  ok('aucune erreur (mode local)', !errs.length); if (errs.length) console.log(errs);
  // erreurs qui remontent : compte de test réel
  const ctx = await b.newContext({ ...devices['iPhone 13'], ignoreHTTPSErrors: true, serviceWorkers: 'block' }), q = await ctx.newPage(); await q.route(/accounts\.google\.com\/gsi/, r => r.abort());
  await q.goto('http://localhost:8097/'); await q.waitForTimeout(1200);
  await q.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); }); await q.waitForTimeout(1500);
  const marque = 'test116-' + Math.random().toString(36).replace(/[^a-z]/g, '').slice(0, 8);
  await q.evaluate(m => { setTimeout(() => { throw new Error('Erreur volontaire ' + m + ' pour camille@exemple.fr'); }, 0); setTimeout(() => { throw new Error('Erreur volontaire ' + m + ' pour camille@exemple.fr'); }, 10); Promise.reject(new Error('Failed to fetch')); }, marque);
  await q.waitForTimeout(2500);
  const lignes = JSON.parse(execSync(`python3 ${__dirname}/sql.py "select message, page, version, navigateur from erreurs where message like '%${marque}%'"`).toString());
  ok(`l'erreur est notée sur le serveur une seule fois (${lignes.length}), sans l'e-mail : "${lignes[0] && lignes[0].message}"`, lignes.length === 1 && !/camille@/.test(lignes[0].message) && /iPhone/.test(lignes[0].navigateur));
  const reseau = JSON.parse(execSync(`python3 ${__dirname}/sql.py "select count(*) as n from erreurs where message = 'Failed to fetch' and cree_le > now() - interval '1 minute'"`).toString());
  ok('les coupures de réseau ne sont pas notées', reseau[0].n === 0);
  execSync(`python3 ${__dirname}/sql.py "delete from erreurs where message like '%test116-%'"`);
  await b.close(); srv.close(); console.log(KO ? `\n${KO} échec(s)` : '\nTout est bon'); process.exit(KO ? 1 : 0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

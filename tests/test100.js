// Clavier ouvert sur téléphone (retour de Théo, 20/11) — mode local.
// 1. Android (page rétrécie par le clavier) : la fenêtre tient au-dessus, bouton Enregistrer visible.
// 2. iPhone (clavier par-dessus la page, simulé avec un faux visualViewport) : la fenêtre se cale sur la partie visible.
// 3. "Pose ta question" : pas de clavier imposé, exemples visibles, un exemple pose la question tout de suite, réponse en haut.
const { chromium, devices } = require('playwright'); const fs = require('fs');
const src = fs.readFileSync(__dirname + '/test4.js', 'utf8');
let FAKE = fs.readFileSync(__dirname + '/test2.js', 'utf8').split('const FAKE = `')[1].split('`;')[0];
const mcpBlock = src.split("FAKE = FAKE.replace(/const mcp = \\{[\\s\\S]*?\\};\\n/, `")[1].split("`);")[0];
FAKE = FAKE.replace(/const mcp = \{[\s\S]*?\};\n/, mcpBlock);
// faux visualViewport pilotable (iPhone : le clavier ne rétrécit pas la page)
const VV = `(() => { const t = new EventTarget(); t.height = innerHeight; t.offsetTop = 0; t.width = innerWidth; window.__clavier = (h) => { t.height = innerHeight - h; t.dispatchEvent(new Event('resize')); };
  Object.defineProperty(window, 'visualViewport', { get: () => t }); })();`;
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
const dans = (r, H) => r && r.top >= -1 && r.bottom <= H + 1;
(async () => {
  const b = await chromium.launch(); const errs = [];
  // 1. Android
  let p = await (await b.newContext({ ...devices['Pixel 7'] })).newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(FAKE); await p.goto('file://' + require('path').join(__dirname, '..', 'index.html')); await p.waitForTimeout(500);
  ok('balise viewport : la page rétrécit avec le clavier (Android)', await p.evaluate(() => /interactive-widget=resizes-content/.test(document.querySelector('meta[name=viewport]').content)));
  await p.evaluate(() => { S = demo(); render(); editBail(S.baux[0].id); }); await p.waitForTimeout(300);
  const W = p.viewportSize().width; await p.setViewportSize({ width: W, height: 430 }); await p.waitForTimeout(300); // clavier ouvert : il reste 430 px
  await p.focus('#mform [name=nom]'); await p.waitForTimeout(450);
  const a = await p.evaluate(() => { const r = x => x && x.getBoundingClientRect().toJSON(); return { modal: r(document.querySelector('.modal')), btn: r(document.querySelector('#mform > .full.row:last-child button.primary')), champ: r(document.querySelector('#mform [name=nom]')) }; });
  ok('Android : la fenêtre tient au-dessus du clavier', dans(a.modal, 430));
  ok('Android : bouton Enregistrer visible', dans(a.btn, 430));
  ok('Android : le champ touché est visible', dans(a.champ, 430));
  await p.close();
  // 2. iPhone
  p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(VV); await p.addInitScript(FAKE); await p.goto('file://' + require('path').join(__dirname, '..', 'index.html')); await p.waitForTimeout(500);
  await p.evaluate(() => { S = demo(); render(); editBail(S.baux[0].id); }); await p.waitForTimeout(300);
  const H = p.viewportSize().height, kb = 336; await p.evaluate(h => window.__clavier(h), kb); await p.focus('#mform [name=nom]'); await p.waitForTimeout(450);
  const c = await p.evaluate(() => { const r = x => x && x.getBoundingClientRect().toJSON(); return { modal: r(document.querySelector('.modal')), btn: r(document.querySelector('#mform > .full.row:last-child button.primary')), champ: r(document.querySelector('#mform [name=nom]')), cls: document.getElementById('overlay').className }; });
  ok(`iPhone : la fenêtre s'arrête au-dessus du clavier (bas ${Math.round(c.modal.bottom)} ≤ ${H - kb})`, c.modal.bottom <= H - kb + 1 && /clavier/.test(c.cls));
  ok('iPhone : bouton Enregistrer et champ visibles', dans(c.btn, H - kb) && dans(c.champ, H - kb));
  await p.evaluate(() => window.__clavier(0)); await p.waitForTimeout(200);
  ok('iPhone : clavier rangé, la fenêtre reprend sa place', await p.evaluate(() => !document.getElementById('overlay').classList.contains('clavier') && !document.getElementById('overlay').style.top));
  await p.evaluate(() => closeOverlay());
  // 3. Pose ta question (IA simulée)
  await p.evaluate(() => { MCP = null; SB = { auth: {} }; SB_USER = { id: 'u1' }; MEMBRES = { membres: [{ user_id: 'u1', role: 'proprietaire' }] }; window.fnIA = async c => { window.__envoye = c; return { reponse: 'Paul te doit 650 € (octobre).', boutons: [{ texte: 'Voir la fiche de Paul', page: 'bail-' + S.baux[0].id }] }; }; poserQuestion(); });
  await p.waitForTimeout(400);
  ok('question : pas de clavier imposé à l\'ouverture', await p.evaluate(() => document.activeElement.tagName !== 'TEXTAREA'));
  const ordre = await p.evaluate(() => { const y = s => document.querySelector(s).getBoundingClientRect().top; return y('#q_rep') <= y('.q-ex') && y('.q-ex') < y('#mform [name=q]'); });
  ok('question : réponse en haut, puis exemples, puis la case', ordre);
  ok('question : exemples visibles sans défiler', await p.evaluate(() => { const r = document.querySelector('.q-ex').getBoundingClientRect(); return r.bottom <= innerHeight; }));
  await p.locator('.q-ex .chip').first().click(); await p.waitForTimeout(400);
  ok('un exemple pose la question tout de suite', await p.evaluate(() => /Qui me doit/.test((window.__envoye || {}).question || '') && /Qui me doit/.test(document.querySelector('.q-moi').textContent) && /650/.test(document.querySelector('.q-rep').textContent)));
  fs.mkdirSync(__dirname + '/shots100', { recursive: true }); await p.screenshot({ path: __dirname + '/shots100/reponse.png' });
  await p.evaluate(() => window.__clavier(336)); await p.focus('#mform [name=q]'); await p.waitForTimeout(450); await p.screenshot({ path: __dirname + '/shots100/clavier.png' }); await p.evaluate(() => window.__clavier(0));
  await p.fill('#mform [name=q]', 'Et Léa ?'); await p.press('#mform [name=q]', 'Enter'); await p.waitForTimeout(400);
  ok('Entrée envoie la question écrite (et range le clavier)', await p.evaluate(() => window.__envoye.question === 'Et Léa ?' && document.activeElement.tagName !== 'TEXTAREA'));
  ok('aucune erreur', !errs.length); if (errs.length) console.log(errs);
  await b.close(); console.log(KO ? `\n${KO} échec(s)` : '\nTout est bon'); process.exit(KO ? 1 : 0);
})();

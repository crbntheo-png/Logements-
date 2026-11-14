// DPE électrique : numéro du DPE, tâche "Ton DPE peut s'améliorer gratuitement" (électrique + E/F/G + DPE depuis le 1er juillet 2021),
// et révision de loyer proposée quand la classe passe de F/G à E ou mieux (sans effet sur les mois passés). Mode local.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = __dirname + '/shots40'; fs.mkdirSync(OUT, { recursive: true });
const src = fs.readFileSync(__dirname + '/test4.js', 'utf8');
let FAKE = fs.readFileSync(__dirname + '/test2.js', 'utf8').split('const FAKE = `')[1].split('`;')[0];
const mcpBlock = src.split("FAKE = FAKE.replace(/const mcp = \\{[\\s\\S]*?\\};\\n/, `")[1].split("`);")[0];
FAKE = FAKE.replace(/const mcp = \{[\s\S]*?\};\n/, mcpBlock);
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(FAKE);
  await p.goto('file://' + path.join(__dirname, '..', 'index.html')); await p.waitForTimeout(500);
  const r = await p.evaluate(() => {
    S = demo(); S.faits = {};
    const B = (id, nom, chauffage, dpe, dpeValidite, dpeNumero) => ({ id, nom, type: 'Appartement', meuble: 'vide', chauffage, dpe, dpeValidite, dpeNumero });
    S.biens = [B('e1', 'Elec F 2023', 'Individuel électrique', 'F', '2033-06-08', '2350E1960061Z'), B('e2', 'Elec E sans numéro', 'Pompe à chaleur', 'E', '2032-03-01', ''),
      B('g1', 'Gaz F', 'Individuel gaz', 'F', '2033-06-08', 'X'), B('o1', 'Elec F 2020', 'Individuel électrique', 'F', '2030-05-01', ''), B('n1', 'Elec F 2026', 'Individuel électrique', 'F', '2036-03-01', ''), B('c1', 'Elec C', 'Individuel électrique', 'C', '2033-01-01', '')];
    // bail dont la date anniversaire est passée il y a 2 mois : révision bloquée tant que le DPE est F
    const d = new Date(TODAY.getFullYear() - 2, TODAY.getMonth() - 2, 1);
    S.baux = [{ id: 'l1', bienId: 'e1', nom: 'Léo Test', typeBail: 'vide', dateEntree: iso(d), suiviDepuis: CUR, loyerHC: 600, charges: 0, jourPaiement: 5, revisable: true, irlTrimestre: qLabel(irlEnVigueur(d)), irlValeur: irlVal(irlEnVigueur(d)), revisions: [] }];
    S.paiements = []; save(); render();
    const T = taches(), t = id => T.find(x => x.key.startsWith('dpeelec-' + id));
    return { e1: t('e1'), e2: t('e2'), g1: !!t('g1'), o1: !!t('o1'), n1: t('n1'), c1: !!t('c1'), gele: (revInfo(bail('l1')) || {}).statut };
  });
  ok('électrique + F + DPE 2023 : tâche "peut s\'améliorer gratuitement"', r.e1 && /peut s'améliorer gratuitement/.test(r.e1.t) && r.e1.prio === 'soon');
  ok('numéro à copier + lien Observatoire', r.e1 && /2350E1960061Z/.test(r.e1.d) && r.e1.acts.some(a => /Copier le numéro/.test(a[0])) && r.e1.acts.some(a => /observatoire-dpe-audit\.ademe\.fr/.test(a[1])));
  ok('pompe à chaleur + E sans numéro : "Noter le numéro"', r.e2 && r.e2.acts.some(a => /Noter le numéro/.test(a[0])));
  ok('gaz : pas de tâche', !r.g1);
  ok('DPE d\'avant juillet 2021 : pas de tâche', !r.o1);
  ok('DPE de 2026 : prévenu pour le 1er janvier 2027 (à surveiller)', r.n1 && r.n1.prio === 'info' && /1er janvier 2027/.test(r.n1.d));
  ok('classe C : pas de tâche', !r.c1);
  ok('loyer gelé tant que DPE F', r.gele === 'gele');
  // "Pourquoi ?" et "C'est fait"
  await p.evaluate(() => { location.hash = 'afaire'; }); await p.waitForTimeout(300);
  ok('"Pourquoi ?" sur la tâche', await p.evaluate(() => { const t = [...document.querySelectorAll('.task')].find(x => /Elec F 2023/.test(x.innerText)); return t && /Pourquoi/.test(t.innerText); }));
  await p.screenshot({ path: OUT + '/1-taches.png', fullPage: true });
  // numéro du DPE dans la fiche : 13 caractères
  await p.evaluate(() => { location.hash = 'bien-e2'; }); await p.waitForTimeout(300); await p.evaluate(() => editBien('e2')); await p.waitForTimeout(300);
  ok('fiche : champ "Numéro du DPE (13 caractères…)"', await p.evaluate(() => !!document.querySelector('#mform input[name=dpeNumero]') && /Numéro du DPE \(13 caractères/.test(document.getElementById('overlay').innerText)));
  await p.fill('#mform input[name=dpeNumero]', '123'); await p.click('#mform button.primary'); await p.waitForTimeout(300);
  ok('numéro trop court refusé', await p.evaluate(() => !document.getElementById('overlay').hidden && !bien('e2').dpeNumero));
  await p.fill('#mform input[name=dpeNumero]', '2350e1959777b'); await p.click('#mform button.primary'); await p.waitForTimeout(300);
  ok('numéro enregistré en majuscules', await p.evaluate(() => bien('e2').dpeNumero === '2350E1959777B'));
  // F -> E : la révision bloquée est proposée
  await p.evaluate(() => { location.hash = 'bien-e1'; }); await p.waitForTimeout(300); await p.evaluate(() => editBien('e1')); await p.waitForTimeout(300);
  await p.selectOption('#mform select[name=dpe]', 'E'); await p.click('#mform button.primary'); await p.waitForTimeout(800);
  await p.screenshot({ path: OUT + '/2-revision.png' });
  const t2 = await p.evaluate(() => document.getElementById('overlay').innerText);
  ok('F -> E : "La révision de loyer est de nouveau possible"', /de nouveau possible/.test(t2) && /F/.test(t2) && /E/.test(t2));
  ok('révision proposée avec bouton Réviser, à partir d\'aujourd\'hui', /à partir d'aujourd'hui/.test(t2) && await p.evaluate(() => !!document.querySelector('#overlay button.primary.small, #overlay li button')));
  ok('pas de rattrapage des mois passés (expliqué)', /ne rattrape pas les mois passés/.test(t2) && /dans l'année/.test(t2));
  await p.evaluate(() => { const bt = [...document.querySelectorAll('#overlay li button')].find(x => /Réviser/.test(x.textContent)); bt && bt.click(); }); await p.waitForTimeout(400);
  ok('écran de révision : date minimum = aujourd\'hui', await p.evaluate(() => document.querySelector('#mform input[name=date]').min === iso(TODAY)));
  await p.evaluate(() => closeOverlay());
  // G -> G (pas de changement) : rien proposé ; C -> B : rien proposé
  await p.evaluate(() => { revisionDebloquee('c1', 'C'); }); await p.waitForTimeout(200);
  ok('pas de proposition si la classe n\'était pas F ou G', await p.evaluate(() => document.getElementById('overlay').hidden));
  const sw = await p.evaluate(() => document.documentElement.scrollWidth); ok('pas de débordement (' + sw + ')', sw <= 390);
  console.log('ERREURS', errs); console.log('KO', KO); await b.close();
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

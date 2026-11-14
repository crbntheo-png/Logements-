// Déclaration d'occupation (GMBI) : tâche à partir du 1er juin, liste calculée (arrivées, départs, logements vides entre le
// 2 janvier de l'année d'avant et le 1er janvier), lien espace pro (SCI) ou particulier, "C'est fait", rien sans changement,
// lexique et "Pourquoi ?" (amende 150 € par local). Mode local, date simulée.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = __dirname + '/shots41'; fs.mkdirSync(OUT, { recursive: true });
const src = fs.readFileSync(__dirname + '/test4.js', 'utf8');
let FAKE = fs.readFileSync(__dirname + '/test2.js', 'utf8').split('const FAKE = `')[1].split('`;')[0];
const mcpBlock = src.split("FAKE = FAKE.replace(/const mcp = \\{[\\s\\S]*?\\};\\n/, `")[1].split("`);")[0];
FAKE = FAKE.replace(/const mcp = \{[\s\S]*?\};\n/, mcpBlock);
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ouvrir = async (date, changements, perso) => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.on('pageerror', e => errs.push(e.message));
    await p.clock.setFixedTime(new Date(date + 'T10:00:00'));
    await p.addInitScript(FAKE);
    await p.goto('file://' + path.join(__dirname, '..', 'index.html')); await p.waitForTimeout(400);
    await p.evaluate(([ch, perso]) => {
      S = demo(); S.faits = { guideMasque: 1 }; S.paiements = []; S.taxes = []; S.sci.forme = perso ? 'perso' : 'sci';
      const B = id => ({ id, nom: 'Logement ' + id, type: 'Appartement', meuble: 'vide' });
      S.biens = [B('b1'), B('b2'), B('b3')];
      const L = (id, bienId, e, s) => ({ id, bienId, nom: 'Locataire ' + id, typeBail: 'vide', dateEntree: e, dateSortie: s || '', suiviDepuis: '2027-01', loyerHC: 500, charges: 0, jourPaiement: 5, revisable: false, revisions: [] });
      S.baux = ch ? [L('l1', 'b1', '2026-03-01'), L('l2', 'b2', '2020-01-01', '2026-09-30'), L('l3', 'b3', '2020-05-01')] : [L('l3', 'b3', '2020-05-01'), L('l4', 'b1', '2019-01-01')];
      save(); render();
    }, [changements, perso]);
    return p;
  };
  const tache = p => p.evaluate(() => { const t = taches().find(x => x.key.startsWith('gmbi-')); return t ? { t: t.t, d: t.d, prio: t.prio, acts: t.acts, key: t.key } : null; });
  // 20 mai 2027 : pas encore
  let p = await ouvrir('2027-05-20', true); ok('20 mai : pas encore de tâche', !(await tache(p))); await p.close();
  // 10 juin 2027 : tâche avec la liste
  p = await ouvrir('2027-06-10', true); let t = await tache(p);
  ok('10 juin : tâche "Déclarer les changements d\'occupants avant le 1er juillet"', t && /Déclarer les changements d'occupants avant le 1er juillet/.test(t.t) && t.prio === 'soon');
  ok('liste : arrivée, départ, logement vide au 1er janvier 2027', t && /arrivée de Locataire l1 le 01\/03\/2026/.test(t.d) && /départ de Locataire l2 le 30\/09\/2026/.test(t.d) && /Logement b2 : vide au 1er janvier 2027/.test(t.d));
  ok('période : 2 janvier 2026 au 1er janvier 2027', t && /2 janvier 2026 et le 1er janvier 2027/.test(t.d));
  ok('logement sans changement absent', t && !/Logement b3/.test(t.d));
  ok('SCI : lien espace professionnel', t && t.acts.some(a => /cfspro\.impots\.gouv\.fr/.test(a[1])));
  await p.evaluate(() => { location.hash = 'afaire'; }); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/1-juin.png', fullPage: true });
  ok('"Pourquoi ?" : amende de 150 € par logement', await p.evaluate(() => { const x = [...document.querySelectorAll('.task')].find(e => /Déclarer les changements/.test(e.innerText)); return !!x && /150 €/.test(x.querySelector('.pq') ? x.querySelector('.pq').textContent : ''); }));
  ok('lexique "gmbi"', await p.evaluate(() => !!LEXIQUE.gmbi && /150 €/.test(LEXIQUE.gmbi[1]) && /1er juillet/.test(LEXIQUE.gmbi[1])));
  await p.evaluate(k => marquerFait(k), t.key); await p.waitForTimeout(200);
  ok('"C\'est fait" : la tâche disparaît', !(await tache(p)));
  await p.close();
  // particulier : lien espace particulier
  p = await ouvrir('2027-06-10', true, true); t = await tache(p); ok('en nom propre : lien espace particulier', t && t.acts.some(a => /cfspart\.impots\.gouv\.fr/.test(a[1]))); await p.close();
  // aucun changement : aucune tâche
  p = await ouvrir('2027-06-10', false); ok('aucun changement : aucune tâche', !(await tache(p))); await p.close();
  // 5 juillet : en retard
  p = await ouvrir('2027-07-05', true); t = await tache(p); ok('5 juillet : "en retard", urgent', t && /en retard/.test(t.t) && t.prio === 'urgent');
  const sw = await p.evaluate(() => document.documentElement.scrollWidth); ok('pas de débordement (' + sw + ')', sw <= 390); await p.close();
  console.log('ERREURS', errs); console.log('KO', KO); await b.close();
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

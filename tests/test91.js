// Fiche immeuble (lots, taxe foncière unique répartie, prix d'achat réparti, pas un logement vide), vraie date d'entrée, meublé qui suit, alertes 4 mois avant.
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = __dirname + '/shots91'; fs.mkdirSync(OUT, { recursive: true });
let FAKE = fs.readFileSync(__dirname + '/test2.js', 'utf8').split('const FAKE = `')[1].split('`;')[0];
const src = fs.readFileSync(__dirname + '/test4.js', 'utf8');
FAKE = FAKE.replace(/const mcp = \{[\s\S]*?\};\n/, src.split("FAKE = FAKE.replace(/const mcp = \\{[\\s\\S]*?\\};\\n/, `")[1].split("`);")[0]);
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.route(/accounts\.google\.com/, r => r.abort()); await p.addInitScript(FAKE);
  await p.goto('file://' + path.join(__dirname, '..', 'index.html')); await p.waitForTimeout(500);
  // données : 2 lots loués + une fiche "Immeuble / parties communes" créée comme un logement
  await p.evaluate(() => { S = demo(); delete S.demo; S.biens = S.biens.slice(0, 2); const ids = S.biens.map(x => x.id); S.baux = S.baux.filter(x => ids.includes(x.bienId)); S.taxes = []; S.depenses = S.depenses.filter(d => !d.taxeId);
    S.biens[0].surface = 30; S.biens[1].surface = 70;
    S.biens.push({ id: 'imm1', nom: 'Immeuble / parties communes', type: 'Appartement', adresse: '13 rue des Fossés', cp: '50300', ville: 'Avranches', meuble: 'vide' }); save(); location.hash = 'bien-imm1'; render(); });
  await p.waitForTimeout(300);
  ok('fiche "parties communes" : proposition de la transformer en immeuble', await p.evaluate(() => /C'est l'immeuble, pas un logement à louer/.test(document.body.innerText)));
  ok('avant : traitée à tort comme logement vide', await p.evaluate(() => taches().some(t => t.key === 'vac-imm1')));
  await p.evaluate(() => transformerImmeuble('imm1')); await p.waitForTimeout(400);
  ok('choix des lots proposé', await p.evaluate(() => /Les lots de/.test(document.querySelector('#overlay h2').textContent)));
  await p.evaluate(() => document.querySelectorAll('#overlay input[type=checkbox]').forEach(c => c.checked = true)); await p.click('#mform button.primary'); await p.waitForTimeout(300);
  const ids = await p.evaluate(() => S.biens.filter(x => !x.immeuble).map(x => x.id));
  ok('2 lots rattachés', await p.evaluate(() => lotsDe('imm1').length === 2));
  ok('plus de "logement vide", d\'annonce ni de détecteur de fumée pour l\'immeuble', await p.evaluate(() => !taches().some(t => /imm1/.test(t.key) && /^(vac|leg-daaf|leg-chaud|leg-enc)/.test(t.key))));
  ok('accueil : pas de tuile "logement vide" pour l\'immeuble', await p.evaluate(() => { location.hash = 'locataires'; render(); return !/Immeuble \/ parties communes[\s\S]{0,40}Logement vide/.test(document.body.innerText); }));
  ok('nouveau locataire : l\'immeuble n\'est pas proposé', await p.evaluate(() => { editBail(); const o = [...document.querySelectorAll('#mform select[name=bienId] option')].map(x => x.value); closeOverlay(); return !o.includes('imm1') && o.length === 2; }));
  // prix d'achat global réparti par surface
  await p.evaluate(() => { bien('imm1').prixAchat = 200000; save(); });
  ok('prix d\'achat réparti selon la surface (30 % / 70 %)', await p.evaluate(ids => prixAchatDe(bien(ids[0])) === 60000 && prixAchatDe(bien(ids[1])) === 140000 && !!rendement(bien(ids[0])), ids));
  ok('lot : "prix d\'achat" n\'est plus demandé', await p.evaluate(ids => !aCompleterBien(bien(ids[0])).L.some(x => /prix d'achat/i.test(x.t)), ids));
  // taxe foncière : déjà saisie lot par lot (comptée 2 fois), puis une seule pour l'immeuble
  await p.evaluate(ids => { enregistrerTaxe(ids[0], 2026, 1000, 200); enregistrerTaxe(ids[1], 2026, 1000, 200); save(); }, ids);
  ok('avant : 2 taxes et 2 dépenses (le problème)', await p.evaluate(() => S.taxes.length === 2 && S.depenses.filter(d => d.taxeId).length === 2));
  await p.evaluate(() => { taxeFonciere('imm1', 2026); }); await p.waitForTimeout(300);
  ok('formulaire : explique la répartition et le remplacement des taxes par lot', await p.evaluate(() => /répartie|réparties/.test(document.getElementById('overlay').innerText) && /seront remplacées/.test(document.getElementById('overlay').innerText)));
  await p.fill('#mform input[name=total]', '2000'); await p.fill('#mform input[name=teom]', '400'); await p.waitForTimeout(200);
  await p.screenshot({ path: OUT + '/1-taxe.png' });
  await p.click('#mform button.primary'); await p.waitForTimeout(400);
  const t = await p.evaluate(() => ({ n: S.taxes.length, deps: S.depenses.filter(d => d.taxeId).length, t: S.taxes[0], somme: r2(S.taxes[0].parts.reduce((s, x) => s + x.montant, 0) + S.taxes[0].partSci) }));
  ok('après : 1 seule taxe (immeuble) et 1 seule dépense', t.n === 1 && t.t.bienId === 'imm1' && t.deps === 1);
  ok('ordures ménagères : parts par locataire + part de la SCI = 400 €', t.somme === 400 && t.t.parts.length >= 1);
  ok('parts calculées par lot (30 % et 70 % de 400 €)', await p.evaluate(ids => { const P = S.taxes[0].parts; const a = P.filter(x => x.lotId === ids[0]), b2 = P.filter(x => x.lotId === ids[1]); return (!a.length || a[0].teomLot === 120) && (!b2.length || b2[0].teomLot === 280); }, ids));
  ok('fiche d\'un lot : taxe = part du lot (600 €)', await p.evaluate(ids => { location.hash = 'bien-' + ids[0]; render(); return /600,00/.test(document.querySelector('.kpis').innerText) && /Fait partie de Immeuble/.test(document.body.innerText); }, ids));
  ok('taxe demandée sur un lot → renvoie à l\'immeuble', await p.evaluate(ids => { taxeFonciere(ids[0], 2026); const h = document.querySelector('#overlay h2').textContent; closeOverlay(); return /Immeuble/.test(h); }, ids));
  // lettre d'ordures ménagères : adresse et montant du lot
  ok('lettre ordures ménagères : montant du lot, pas de l\'immeuble', await p.evaluate(() => { const tx = S.taxes[0], pt = tx.parts[0]; docTeom(tx.id, pt.bailId); const x = document.getElementById('overlay').innerText; closeOverlay(); return x.includes(eur(pt.teomLot)) && !x.includes(eur(400)); }));
  // liste des biens et page immeuble
  await p.evaluate(() => { location.hash = 'biens'; render(); }); await p.waitForTimeout(200);
  ok('Biens : l\'immeuble en tête, ses lots en dessous', await p.evaluate(() => { const L = [...document.querySelectorAll('.biens-l > li')]; return L[0].classList.contains('imm') && L[1].classList.contains('lot') && L[2].classList.contains('lot'); }));
  await p.screenshot({ path: OUT + '/2-biens.png' });
  await p.evaluate(() => { location.hash = 'bien-imm1'; render(); }); await p.waitForTimeout(200);
  ok('page immeuble : lots, prix réparti, taxe, documents', await p.evaluate(() => /Les lots/.test(document.body.innerText) && /réparti selon la surface/.test(document.body.innerText) && /part 30 %/.test(document.body.innerText)));
  await p.screenshot({ path: OUT + '/3-immeuble.png', fullPage: true });
  // vraie date d'entrée
  ok('nouveau locataire : date d\'entrée vide et obligatoire', await p.evaluate(() => { editBail(); const f = document.querySelector('#mform input[name=dateEntree]'); const r = f.value === '' && f.required; closeOverlay(); return r; }));
  // meublé qui suit
  const r = await p.evaluate(ids => { const bi = bien(ids[0]), b = bailActifDuBien(ids[0]); b.typeBail = 'vide'; bi.meuble = 'vide'; save(); editBien(ids[0]); document.querySelector('#mform select[name=meuble]').value = 'meuble'; document.getElementById('mform').requestSubmit(); return b.typeBail; }, ids);
  ok('logement passé en meublé → le bail en place aussi', r === 'meuble');
  ok('aucune erreur JavaScript', !errs.length); if (errs.length) console.log(errs);
  await b.close(); console.log(KO ? `\n${KO} échec(s)` : '\nTout est bon'); process.exit(KO ? 1 : 0);
})();

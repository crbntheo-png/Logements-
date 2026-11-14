// Services publics gratuits : adresse qui se complète (Géoplateforme), DPE retrouvé à l'adresse ou par numéro (ADEME),
// état des risques (Géorisques). Mode local (aucune donnée en ligne), vrais appels aux services publics avec une adresse publique neutre.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = __dirname + '/shots37'; fs.mkdirSync(OUT, { recursive: true });
const src = fs.readFileSync(__dirname + '/test4.js', 'utf8');
let FAKE = fs.readFileSync(__dirname + '/test2.js', 'utf8').split('const FAKE = `')[1].split('`;')[0];
const mcpBlock = src.split("FAKE = FAKE.replace(/const mcp = \\{[\\s\\S]*?\\};\\n/, `")[1].split("`);")[0];
FAKE = FAKE.replace(/const mcp = \{[\s\S]*?\};\n/, mcpBlock);
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const scheme of ['light', 'dark']) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
    p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(FAKE);
    await p.goto('file://' + path.join(__dirname, '..', 'index.html')); await p.waitForTimeout(500);
    await p.evaluate(() => { S = demo(); S.biens[0].adresse = ''; S.biens[0].cp = ''; S.biens[0].ville = ''; S.biens[0].dpe = ''; S.biens[0].surface = 60; save(); render(); });
    const id = await p.evaluate(() => S.biens[0].id);
    // 1. Adresse qui se complète
    await p.evaluate(id => { location.hash = 'bien-' + id; }, id); await p.waitForTimeout(300);
    await p.evaluate(id => editBien(id), id); await p.waitForTimeout(300);
    await p.fill('#f_adresse', '82 rue de rivoli paris'); await p.waitForTimeout(2500);
    if (scheme === 'light') await p.screenshot({ path: OUT + '/1-adresse.png' });
    ok(scheme + ' : propositions d\'adresses', await p.evaluate(() => /82 Rue de Rivoli 75004 Paris/.test((document.querySelector('.sugg-adr') || {}).innerText || '')));
    await p.click('.sugg-adr button >> nth=0'); await p.waitForTimeout(200);
    ok(scheme + ' : rue, code postal, ville remplis', await p.evaluate(() => document.getElementById('f_adresse').value === '82 Rue de Rivoli' && document.getElementById('f_cp').value === '75004' && /Paris/.test(document.getElementById('f_ville').value)));
    ok(scheme + ' : rien enregistré avant "Enregistrer"', await p.evaluate(() => !S.biens[0].banId));
    await p.click('#mform button.primary'); await p.waitForTimeout(400);
    ok(scheme + ' : adresse et identifiant gardés après validation', await p.evaluate(() => S.biens[0].banId === '75104_8249_00082' && !!S.biens[0].lat));
    // 2. DPE à l'adresse : plusieurs, il faut choisir
    await p.evaluate(id => trouverDpe(id), id); await p.waitForTimeout(3500);
    await p.screenshot({ path: OUT + `/2-dpe-${scheme}.png` });
    const n = await p.evaluate(() => document.querySelectorAll('#overlay input[name=dpe]').length);
    ok(scheme + ' : ' + n + ' DPE à cette adresse, à choisir', n >= 2 && await p.evaluate(() => /choisis le tien/.test(document.getElementById('overlay').innerText)));
    ok(scheme + ' : DPE pas encore noté', await p.evaluate(() => !S.biens[0].dpe));
    const choisi = await p.evaluate(() => DPE_L[0]);
    await p.evaluate(() => document.querySelector('#overlay input[name=dpe]').click()); await p.click('#mform button.primary'); await p.waitForTimeout(400);
    ok(scheme + ' : classe et date du DPE choisi notées (' + choisi.etiquette_dpe + ')', await p.evaluate(c => S.biens[0].dpe === c.etiquette_dpe && S.biens[0].dpeValidite === c.date_fin_validite_dpe && S.biens[0].dpeNumero === c.numero_dpe, choisi));
    // 3. DPE par numéro
    await p.evaluate(([id, num]) => trouverDpe(id, num), [id, choisi.numero_dpe]); await p.waitForTimeout(3000);
    ok(scheme + ' : recherche par numéro', await p.evaluate(num => document.querySelectorAll('#overlay input[name=dpe]').length === 1 && document.getElementById('overlay').innerText.includes(num), choisi.numero_dpe));
    await p.evaluate(() => closeOverlay());
    // 4. État des risques
    await p.evaluate(id => etatRisques(id), id); await p.waitForFunction(() => /Risques naturels/i.test(document.getElementById('overlay').innerText || ''), null, { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(300);
    await p.screenshot({ path: OUT + `/3-risques-${scheme}.png` });
    const t = await p.evaluate(() => document.getElementById('overlay').innerText);
    ok(scheme + ' : risques listés + ERP officiel (moins de 6 mois)', /Risques naturels/i.test(t) && /ERP officiel/i.test(t) && /moins de 6 mois/i.test(t) && await p.evaluate(() => !!document.querySelector('#overlay a[href^="https://errial.georisques.gouv.fr"]')));
    const avant = await p.evaluate(() => S.fichiers.length);
    await p.evaluate(() => document.querySelector('#mform button.primary').click()); await p.waitForTimeout(300);
    ok(scheme + ' : rangé dans les documents seulement si on le demande', await p.evaluate(a => S.fichiers.length === a + 1 && /Géorisques/.test(S.fichiers[S.fichiers.length - 1].nom), avant));
    // 5. Fiche du logement : boutons visibles, pas de débordement
    await p.evaluate(id => { location.hash = 'bien-' + id; render(); }, id); await p.waitForTimeout(300);
    ok(scheme + ' : boutons DPE et risques sur la fiche', await p.evaluate(() => /Vérifier le DPE/.test(document.body.innerText) && /État des risques/.test(document.body.innerText)));
    const sw = await p.evaluate(() => document.documentElement.scrollWidth); ok(scheme + ' : pas de débordement (' + sw + ')', sw <= 390);
    await p.close();
  }
  console.log('ERREURS', errs); console.log('KO', KO); await b.close();
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

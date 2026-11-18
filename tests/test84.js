// Logements remplis tout seuls : accueil d'un nouveau venu, nouveau logement (adresse -> DPE ADEME, document -> IA),
// "Et maintenant ?", fiche à compléter. Mode local ; services publics simulés (réponses fixes).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = __dirname + '/shots84'; fs.mkdirSync(OUT, { recursive: true });
const src = fs.readFileSync(__dirname + '/test4.js', 'utf8');
let FAKE = fs.readFileSync(__dirname + '/test2.js', 'utf8').split('const FAKE = `')[1].split('`;')[0];
const mcpBlock = src.split("FAKE = FAKE.replace(/const mcp = \\{[\\s\\S]*?\\};\\n/, `")[1].split("`);")[0];
FAKE = FAKE.replace(/const mcp = \{[\s\S]*?\};\n/, mcpBlock);
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
const ADR = { features: [{ properties: { label: '12 Rue de la Mer 50230 Agon-Coutainville', name: '12 Rue de la Mer', postcode: '50230', city: 'Agon-Coutainville', id: '50003_0420_00012', score: 0.9 }, geometry: { coordinates: [-1.59, 49.04] } }] };
const DPE = { results: [
  { numero_dpe: '2350E1960061Z', etiquette_dpe: 'D', etiquette_ges: 'B', date_etablissement_dpe: '2023-05-02', date_fin_validite_dpe: '2033-05-01', adresse_ban: '12 Rue de la Mer', complement_adresse_logement: 'Lot 1 RDC', type_batiment: 'appartement', surface_habitable_logement: 41.5 },
  { numero_dpe: '2350E1960062A', etiquette_dpe: 'E', etiquette_ges: 'C', date_etablissement_dpe: '2023-05-02', date_fin_validite_dpe: '2033-05-01', adresse_ban: '12 Rue de la Mer', complement_adresse_logement: 'Lot 2 étage', type_batiment: 'appartement', surface_habitable_logement: 63 }] };
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const scheme of ['light', 'dark']) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme, deviceScaleFactor: scheme === 'light' ? 2 : 1 });
    p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
    await p.route(/data\.geopf\.fr/, r => r.fulfill({ contentType: 'application/json', body: JSON.stringify(ADR) }));
    await p.route(/data\.ademe\.fr/, r => r.fulfill({ contentType: 'application/json', body: JSON.stringify(DPE) }));
    await p.addInitScript(FAKE);
    await p.goto('file://' + path.join(__dirname, '..', 'index.html')); await p.waitForTimeout(500);
    // 1. Nouveau venu : rien du tout
    await p.evaluate(() => { S = demo(); S.biens = []; S.baux = []; S.paiements = []; S.fichiers = []; S.taxes = []; save(); location.hash = 'locataires'; render(); });
    await p.waitForTimeout(300);
    if (scheme === 'light') await p.screenshot({ path: OUT + '/1-accueil-nouveau.png' });
    ok(scheme + " : accueil Bienvenue avec les façons de créer", await p.evaluate(() => /Bienvenue/.test(document.body.innerText) && /On commence par tes logements/.test(document.body.innerText) && document.querySelectorAll(".bienvenue .suite").length === 1));
    await p.evaluate(() => { location.hash = 'biens'; }); await p.waitForTimeout(300);
    ok(scheme + ' : page Biens vide guide aussi', await p.evaluate(() => /Crée tes logements/.test(document.body.innerText) && /À partir de l'adresse/.test(document.body.innerText)));
    // 2. Nouveau logement à partir de l'adresse
    await p.evaluate(() => editBien()); await p.waitForTimeout(300);
    ok(scheme + ' : explication du remplissage automatique', await p.evaluate(() => /L'appli remplit pour toi/.test(document.getElementById('overlay').innerText)));
    ok(scheme + ' : détails repliés (formulaire court)', await p.evaluate(() => !document.querySelector('#mform .plus-infos').open));
    await p.fill('#f_adresse', '12 rue de la mer agon'); await p.waitForTimeout(900);
    await p.click('.sugg-adr button >> nth=0'); await p.waitForTimeout(800);
    if (scheme === 'light') await p.screenshot({ path: OUT + '/2-dpe-trouves.png' });
    ok(scheme + ' : nom proposé tout seul', await p.evaluate(() => document.getElementById('f_nom').value === 'Appart Agon-Coutainville' && document.getElementById('f_nom').classList.contains('auto')));
    ok(scheme + ' : 2 DPE proposés à cette adresse', await p.evaluate(() => document.querySelectorAll('.dpe-chip').length === 2));
    await p.click('.dpe-chip >> nth=1'); await p.waitForTimeout(300);
    ok(scheme + ' : surface et DPE remplis en jaune', await p.evaluate(() => { const f = document.getElementById('mform'); return f.surface.value === '63' && f.dpe.value === 'E' && f.dpeNumero.value === '2350E1960062A' && f.surface.classList.contains('auto') && f.querySelector('.plus-infos').open; }));
    if (scheme === 'light') await p.screenshot({ path: OUT + '/3-rempli.png' });
    await p.click('#mform button.primary'); await p.waitForTimeout(500);
    const bi = await p.evaluate(() => S.biens[0]);
    ok(scheme + ' : logement enregistré avec tout', bi && bi.nom === 'Appart Agon-Coutainville' && bi.cp === '50230' && +bi.surface === 63 && bi.dpe === 'E' && bi.dpeGes === 'C' && bi.dpeDate === '2023-05-02' && bi.banId === '50003_0420_00012');
    ok(scheme + ' : "Et maintenant ?" proposé, sur la fiche du logement', await p.evaluate(id => location.hash === '#bien-' + id && /est créé/.test(document.getElementById('overlay').innerText) && /Mettre le locataire/.test(document.getElementById('overlay').innerText), bi.id));
    if (scheme === 'light') await p.screenshot({ path: OUT + '/4-et-maintenant.png' });
    await p.click('#mform button.primary'); await p.waitForTimeout(300);
    // 3. Fiche à compléter
    ok(scheme + ' : fiche remplie à X % avec ce qui manque', await p.evaluate(() => { const c = document.querySelector('.a-completer'); return c && /Fiche remplie à 33 %/.test(c.innerText) && /taxe foncière/i.test(c.innerText) && !/Le DPE/.test(c.innerText); }));
    if (scheme === 'light') await p.screenshot({ path: OUT + '/5-fiche.png', fullPage: false });
    await p.evaluate(() => { location.hash = 'biens'; }); await p.waitForTimeout(300);
    ok(scheme + ' : liste des biens : infos à compléter', await p.evaluate(() => /4 infos à compléter/.test(document.body.innerText)));
    // 4. Deuxième logement même ville : nom différent ; nom vide sans adresse refusé
    await p.evaluate(() => editBien()); await p.waitForTimeout(200);
    await p.click('#mform button.primary'); await p.waitForTimeout(300);
    ok(scheme + ' : rien sans adresse ni nom', await p.evaluate(() => S.biens.length === 1 && !document.getElementById('overlay').hidden));
    await p.fill('#f_adresse', '12 rue de la mer agon'); await p.waitForTimeout(900); await p.click('.sugg-adr button >> nth=0'); await p.waitForTimeout(600);
    ok(scheme + ' : 2e nom distinct', await p.evaluate(() => document.getElementById('f_nom').value === 'Appart Agon-Coutainville 2'));
    // 5. Document lu par l'IA (fonctions serveur simulées)
    await p.evaluate(() => { window.fnIA = async () => ({ doc: { type: 'dpe', resume: 'DPE', adresse_logement: '12 rue de la Mer 50230 Agon', surface: 41.5, pieces: 2, dpe_classe: 'D', dpe_ges: 'B', dpe_numero: '2350e1960061z', dpe_date: '2023-05-02', dpe_validite: '2033-05-01' }, credits: { docs_restants: 4 } }); window.corpsLectureIA = async () => ({}); window.choisirFichier = async () => new File(['x'], 'dpe.pdf', { type: 'application/pdf' }); closeOverlay(); editBien(); });
    await p.waitForTimeout(200);
    await p.evaluate(() => { const bt = document.createElement('button'); document.getElementById('mform').appendChild(bt); return remplirBienDepuisDoc(bt); }); await p.waitForTimeout(600);
    ok(scheme + ' : document : adresse, surface, pièces, DPE remplis', await p.evaluate(() => { const f = document.getElementById('mform'); return f.adresse.value === '12 Rue de la Mer' && f.cp.value === '50230' && f.surface.value === '41.5' && f.pieces.value === '2' && f.dpe.value === 'D' && f.dpeNumero.value === '2350E1960061Z' && /Rempli : adresse, surface, pièces, DPE D/.test(document.getElementById('bienLu').textContent); }));
    ok(scheme + ' : document gardé pour être rangé', await p.evaluate(() => BIEN_DOC && BIEN_DOC.cat === 'Diagnostics (DPE…)'));
    await p.evaluate(() => closeOverlay());
    // 6. Formulaire locataire : explication
    await p.evaluate(id => editBail(null, id), bi.id); await p.waitForTimeout(200);
    ok(scheme + ' : locataire : "donne le bail" expliqué', await p.evaluate(() => /Le plus rapide : donne le bail/.test(document.getElementById('overlay').innerText)));
    await p.evaluate(() => closeOverlay());
    // 7. Modifier un logement existant : tout est visible
    await p.evaluate(id => editBien(id), bi.id); await p.waitForTimeout(200);
    ok(scheme + ' : modification : détails ouverts, nom obligatoire', await p.evaluate(() => document.querySelector('#mform .plus-infos').open && document.getElementById('f_nom').required && !/L'appli remplit pour toi/.test(document.getElementById('overlay').innerText)));
    await p.evaluate(() => closeOverlay());
    // 8. Largeur : rien ne dépasse
    ok(scheme + ' : pas de défilement horizontal', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await p.close();
  }
  ok('aucune erreur JavaScript', !errs.length); if (errs.length) console.log(errs);
  await b.close(); console.log(KO ? `\n${KO} échec(s)` : '\nTout est bon'); process.exit(KO ? 1 : 0);
})();

// Parcours d'un débutant (audit du 19/11) : un seul guide sur l'accueil vide, démarrage honnête (étapes passées ↪),
// logement ajouté sans quitter le démarrage, nom pas coupé au milieu d'un mot, locataire pas "impayé" à tort,
// catégorie d'un papier devinée, bouton "Ajouter un document", papiers reçus lus et rangés seuls (sans IA), bon onglet.
// Vraie base, compte de test, espace temporaire. Aucune lecture IA, aucun e-mail.
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist'), OUT = __dirname + '/shots96'; fs.mkdirSync(OUT, { recursive: true });
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'application/javascript' : 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(8096);
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
const page = c => `<html><body style="font:14px Arial;padding:30px">${c}</body></html>`;
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const gen = await b.newPage(); const pdf = async h => { await gen.setContent(page(h)); return gen.pdf({ format: 'A4' }); };
  const DPE = await pdf('<h1>DIAGNOSTIC DE PERFORMANCE ÉNERGÉTIQUE</h1><p>Logement · surface 48 m²</p>');
  const FACT = await pdf('<p>PLOMBERIE MARTIN</p><h1>FACTURE N° 55</h1><p>Chantier : 147 avenue du Maréchal de Lattre de Tassigny, 69003 Lyon</p><p>TOTAL TTC 120,00 €</p>');
  const MUET = await pdf('<h1>Notes</h1><p>Rien de spécial ici.</p>');
  await gen.close();
  const p = await (await b.newContext({ ...devices['iPhone 13'], ignoreHTTPSErrors: true, serviceWorkers: 'block' })).newPage();
  p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
  await p.route('**/pdf.js/3.11.174/pdf.min.js', r => r.fulfill({ path: __dirname + '/vendor/pdfjs/pdf.min.js', contentType: 'application/javascript' }));
  await p.route('**/pdf.js/3.11.174/pdf.worker.min.js', r => r.fulfill({ path: __dirname + '/vendor/pdfjs/pdf.worker.min.js', contentType: 'application/javascript' }));
  await p.route(/api-adresse\.data\.gouv\.fr|data\.ademe\.fr/, r => r.fulfill({ contentType: 'application/json', body: '{"features":[],"results":[]}' }));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|gsi|Failed to load resource/.test(m.text())) console.log('    console:', m.text().slice(0, 300)); });
  let ia = 0; p.on('request', r => { if (/functions\/v1\/ia/.test(r.url()) && r.method() === 'POST' && !/"credits"/.test(r.postData() || '')) ia++; });
  await p.goto('http://localhost:8096/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test Débutant'); await p.click('#esp_btn'); await p.waitForTimeout(3000);
  try {
    await p.evaluate(() => { location.hash = 'locataires'; render(); }); await p.waitForTimeout(400);
    await p.screenshot({ path: OUT + '/1-accueil.png', fullPage: true });
    ok('accueil vide : question "tu loues comment ?" et un seul choix, pas de "Bien démarrer 0/8"', await p.evaluate(() => !!document.querySelector('.forme-q') && !!document.querySelector('.bienvenue') && !/Bien démarrer/.test(document.body.innerText)));
    await p.click('.forme-q button:has-text("En mon nom")'); await p.waitForTimeout(400);
    ok('"En mon nom" retenu, la question disparaît', await p.evaluate(() => S.sci.forme === 'perso' && !document.querySelector('.forme-q')));
    // Démarrage sans Drive
    await p.evaluate(() => { location.hash = 'demarrage'; render(); }); await p.waitForTimeout(500);
    await p.click('.dem-e.cur button:has-text("Je n\'utilise pas Drive")'); await p.waitForTimeout(400);
    ok('sans Drive : étape "Tes logements" (pas "L\'IA trouve…"), Drive marqué passé ↪', await p.evaluate(() => /Tes logements/.test(document.querySelector('.dem-e.cur').innerText) && !/L'IA trouve/.test(document.body.innerText) && document.querySelector('.dem-e.passee .num').textContent === '↪'));
    await p.click('.dem-e.cur button:has-text("Ajouter un logement")'); await p.waitForTimeout(400);
    await p.fill('#mform input[name=adresse]', '147 avenue du Maréchal de Lattre de Tassigny'); await p.fill('#mform input[name=cp]', '69003'); await p.fill('#mform input[name=ville]', '');
    await p.evaluate(() => document.getElementById('mform').requestSubmit()); await p.waitForTimeout(1200);
    const nom = await p.evaluate(() => S.biens[0] && S.biens[0].nom);
    ok('logement ajouté, on reste sur le démarrage', await p.evaluate(() => S.biens.length === 1 && location.hash === '#demarrage' && document.getElementById('overlay').hidden));
    ok(`nom pas coupé au milieu d'un mot ("${nom}")`, /^Appart avenue du Maréchal$|^Appart avenue du Maréchal de Lattre$/.test(nom) || (nom && !/\S{0}Lat$|Tass$/.test(nom) && nom.split(' ').every(m => /^(Appart|avenue|du|Maréchal|de|Lattre|Tassigny)$/.test(m))));
    // Locataire déjà en place (bail de 2024)
    await p.evaluate(() => editBail(null, S.biens[0].id)); await p.waitForTimeout(400);
    const defaut = await p.evaluate(() => document.querySelector('#mform input[name=suiviDepuis]').value);
    ok('"Suivre les loyers à partir de" : le prochain loyer attendu', defaut === await p.evaluate(() => TODAY.getDate() > 5 ? addM(CUR, 1) : CUR));
    await p.fill('#mform input[name=nom]', 'Jeanne Roux'); await p.fill('#mform input[name=loyerHC]', '700'); await p.fill('#mform input[name=dateEntree]', '2024-03-01');
    await p.evaluate(() => document.getElementById('mform').requestSubmit()); await p.waitForTimeout(1200);
    ok('locataire créé, on reste sur le démarrage', await p.evaluate(() => S.baux.length === 1 && location.hash === '#demarrage'));
    await p.screenshot({ path: OUT + '/2-demarrage-fin.png', fullPage: true });
    ok('fin : "C\'est en place" (une étape passée), pas "C\'est prêt", fiches "–" (pas de papier)', await p.evaluate(() => /C'est en place/.test(document.body.innerText) && !/C'est prêt/.test(document.body.innerText) && /Étape passée/.test(document.body.innerText) && [...document.querySelectorAll('.dem-e')].map(x => x.className.replace('dem-e', '').trim()).join(',') === 'passee,ok,ok,passee'));
    await p.evaluate(() => { location.hash = 'locataires'; render(); }); await p.waitForTimeout(500);
    ok('accueil : la locataire n\'est pas "Impayé"', await p.evaluate(() => /Jeanne/.test(document.body.innerText) && !/Impayé/.test(document.body.innerText)));
    ok('pas de "Régulariser les charges 2025" (suivi commencé en 2026)', await p.evaluate(() => !taches().some(t => /^regul-/.test(t.key))));
    // Locataire qui entre ce mois-ci : son 1er loyer est suivi
    await p.evaluate(() => { editBail(null, S.biens[0].id); }); await p.waitForTimeout(300);
    await p.fill('#mform input[name=nom]', 'Paul Neuf'); await p.fill('#mform input[name=loyerHC]', '500'); await p.fill('#mform input[name=dateEntree]', await p.evaluate(() => CUR + '-02'));
    await p.evaluate(() => document.getElementById('mform').requestSubmit()); await p.waitForTimeout(800);
    ok('entrée ce mois-ci : suivi dès ce mois (prorata compté)', await p.evaluate(() => S.baux.find(x => x.nom === 'Paul Neuf').suiviDepuis === CUR));
    await p.evaluate(() => { S.baux = S.baux.filter(x => x.nom !== 'Paul Neuf'); save(); });
    // Documents : bouton d'ajout, pas d'"Actualiser" sans Drive, bon onglet sur la page d'ajout
    await p.evaluate(() => { location.hash = 'docs'; render(); }); await p.waitForTimeout(500);
    ok('Documents : "+ Ajouter un document", pas d\'"Actualiser" sans Drive', await p.evaluate(() => /Ajouter un document/.test(document.querySelector('.head').innerText) && !/Actualiser/.test(document.querySelector('.head').innerText)));
    await p.click('.head button:has-text("Ajouter un document")'); await p.waitForTimeout(400);
    ok('page d\'ajout : l\'onglet "Docs" est allumé', await p.evaluate(() => location.hash === '#ajouter-doc' && pageCourante() === 'docs'));
    // Catégorie devinée dans "Ajouter un document"
    const bid = await p.evaluate(() => S.biens[0].id);
    await p.evaluate(id => ajouterDocument(id, ''), bid); await p.waitForTimeout(300);
    ok('catégorie par défaut : "Autre" (plus "Bail")', await p.evaluate(() => document.querySelector('#mform [name=cat]').value === 'Autre'));
    await p.setInputFiles('#mform input[name=fichier]', { name: 'taxe foncière 2026.pdf', mimeType: 'application/pdf', buffer: MUET }); await p.waitForTimeout(600);
    ok('"taxe foncière 2026.pdf" → Taxe foncière (d\'après le nom)', await p.evaluate(() => document.querySelector('#mform [name=cat]').value === 'Taxe foncière' && /son nom/.test(document.getElementById('cat_devinee').textContent)));
    await p.evaluate(() => { const s = document.querySelector('#mform [name=cat]'); delete s.dataset.choisi; });
    await p.setInputFiles('#mform input[name=fichier]', { name: 'Scan0007.pdf', mimeType: 'application/pdf', buffer: DPE });
    await p.waitForFunction(() => /écrit dedans/.test((document.getElementById('cat_devinee') || {}).textContent || ''), null, { timeout: 20000 }).catch(() => {});
    ok('"Scan0007.pdf" (un DPE) → Diagnostics (d\'après ce qui est écrit dedans)', await p.evaluate(() => document.querySelector('#mform [name=cat]').value === 'Diagnostics (DPE…)'));
    await p.evaluate(() => { const s = document.querySelector('#mform [name=cat]'); s.value = 'Bail'; s.dispatchEvent(new Event('change')); delete document.getElementById('cat_devinee').dataset; });
    await p.setInputFiles('#mform input[name=fichier]', { name: 'dpe.pdf', mimeType: 'application/pdf', buffer: DPE }); await p.waitForTimeout(600);
    ok('une catégorie choisie à la main n\'est jamais changée', await p.evaluate(() => document.querySelector('#mform [name=cat]').value === 'Bail'));
    await p.evaluate(() => closeOverlay());
    // Papiers envoyés par photo / fichier (sans adresse de boîte) : lus et rangés tout seuls, sinon visibles "À ranger"
    await p.evaluate(async ([a, c]) => { const mk = (b64, n) => new File([Uint8Array.from(atob(b64), x => x.charCodeAt(0))], n, { type: 'application/pdf' }); await deposerDansBoite([mk(a, 'Document.pdf'), mk(c, 'Scan.pdf')], 'ton téléphone'); location.hash = 'docs'; render(); }, [FACT.toString('base64'), MUET.toString('base64')]);
    await p.waitForFunction(() => S.fichiers.some(f => f.nom === 'Document' && f.bienId), null, { timeout: 30000 }).catch(() => {});
    await p.waitForFunction(() => !LECTURE_RECUS, null, { timeout: 30000 }).catch(() => {});
    ok('facture (chantier à l\'adresse du logement) rangée toute seule, en "Factures et travaux"', await p.evaluate(() => { const f = S.fichiers.find(f => f.nom === 'Document'); return f && f.bienId === S.biens[0].id && f.cat === 'Factures et travaux' && f.rangeSeul; }));
    ok('toast avec "Annuler"', await p.evaluate(() => /rangé/.test(document.getElementById('toast').innerText) && /Annuler/.test(document.getElementById('toast').innerText)));
    await p.waitForTimeout(500); await p.screenshot({ path: OUT + '/3-docs-a-ranger.png', fullPage: true });
    ok('le papier non reconnu reste visible "À ranger" (même sans adresse de boîte)', await p.evaluate(() => !!document.querySelector('.a-ranger-recus') && /Scan/.test(document.querySelector('.a-ranger-recus').innerText)));
    await p.evaluate(() => remettreDansBoite(S.fichiers.find(f => f.nom === 'Document').id)); await p.waitForTimeout(400);
    ok('Annuler remet la facture dans "À ranger", avec la proposition "Oui, ranger"', await p.evaluate(() => !S.fichiers.find(f => f.nom === 'Document').bienId && /sûrement pour/.test(document.querySelector('.a-ranger-recus').innerText)));
    await p.click('.a-ranger-recus button:has-text("Oui, ranger")'); await p.waitForTimeout(400);
    ok('"Oui, ranger" range en un geste', await p.evaluate(() => S.fichiers.find(f => f.nom === 'Document').bienId === S.biens[0].id));
    // Un même papier n'est lu qu'une fois
    ok('papiersUtiles : "dpe-appart" rangé en Bail compté une seule fois', await p.evaluate(() => { const bi = S.biens[0]; S.fichiers.push({ id: 'x1', bienId: bi.id, cat: 'Bail', nom: 'dpe-appart', chemin: 'faux/x.pdf', type: 'application/pdf' }); const n = papiersUtiles(bi).filter(t => t.f.id === 'x1').length; S.fichiers = S.fichiers.filter(f => f.id !== 'x1'); return n === 1; }));
    ok('sans IA', ia === 0);
    ok('pas de débordement', await p.evaluate(() => document.documentElement.scrollWidth <= 390));
  } finally { await p.evaluate(async () => { const c = S.fichiers.filter(f => f.chemin).map(f => f.chemin); if (c.length) await SB.storage.from('documents').remove(c); await SB.from('espaces').delete().eq('id', ESPACE); }); }
  ok('aucune erreur JavaScript', !errs.length); if (errs.length) console.log(errs);
  await b.close(); srv.close(); console.log(KO ? `\n${KO} échec(s)` : '\nTout est bon'); process.exit(KO ? 1 : 0);
})();

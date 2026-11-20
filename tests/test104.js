// Documents de bout en bout (retour de Théo, 20/11 : "hyper fluide, on n'est bloqué à aucun moment") — vraie base, compte de test,
// espace temporaire, iPhone 13. Ajouter 1 puis 2 fichiers d'un coup, Annuler un ajout, ouvrir, renommer, déplacer vers un autre logement
// et une autre catégorie, supprimer puis Annuler, supprimer pour de bon (fichier effacé du stockage après le délai), retour arrière.
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', 'dist'), OUT = __dirname + '/shots104'; fs.mkdirSync(OUT, { recursive: true });
const srv = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'application/javascript' : 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(8104);
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const gen = await b.newPage(); const pdf = async h => { await gen.setContent(`<html><body style="font:14px Arial;padding:30px">${h}</body></html>`); return gen.pdf({ format: 'A4' }); };
  fs.writeFileSync(OUT + '/Facture plombier.pdf', await pdf('<h1>FACTURE</h1><p>Plomberie · TOTAL TTC 90,00 €</p>'));
  fs.writeFileSync(OUT + '/Attestation assurance.pdf', await pdf('<h1>ATTESTATION D ASSURANCE</h1>'));
  fs.writeFileSync(OUT + '/Notes.pdf', await pdf('<h1>Notes</h1>')); await gen.close();
  const ctx = await b.newContext({ ...devices['iPhone 13'], ignoreHTTPSErrors: true, serviceWorkers: 'block' }), p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
  await p.route('**/pdf.js/3.11.174/pdf.min.js', r => r.fulfill({ path: __dirname + '/vendor/pdfjs/pdf.min.js', contentType: 'application/javascript' }));
  await p.route('**/pdf.js/3.11.174/pdf.worker.min.js', r => r.fulfill({ path: __dirname + '/vendor/pdfjs/pdf.worker.min.js', contentType: 'application/javascript' }));
  await p.goto('http://localhost:8104/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500); await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', 'Test Documents'); await p.click('#esp_btn'); await p.waitForTimeout(3000);
  const toastTxt = () => p.evaluate(() => { const t = document.getElementById('toast'); return t && !t.hidden ? t.innerText : ''; });
  const clicToast = async l => p.evaluate(l => { const b = [...document.querySelectorAll('#toast .toast-undo')].find(x => x.textContent === l); if (b) b.click(); return !!b; }, l);
  try {
    await p.evaluate(() => { S.biens = [{ id: 'b1', nom: 'T2 Gare', adresse: '3 rue de la Gare', cp: '35000', ville: 'Rennes', type: 'Appartement' }, { id: 'b2', nom: 'Studio Port', adresse: '8 quai du Port', cp: '35000', ville: 'Rennes', type: 'Studio' }];
      S.baux = [{ id: 'l1', bienId: 'b1', nom: 'Léa Martin', typeBail: 'vide', dateEntree: '2024-03-01', loyerHC: 700, charges: 50, jourPaiement: 5, revisions: [], suiviDepuis: CUR }]; save(); go('bien-b1'); });
    await p.waitForTimeout(600);
    // 1. un fichier depuis la fiche du logement
    await p.click('#app button:has-text("+ Ajouter un fichier")'); await p.waitForTimeout(300);
    await p.setInputFiles('#overlay input[name=fichier]', OUT + '/Facture plombier.pdf'); await p.waitForTimeout(1200);
    ok('catégorie devinée d\'après le nom (Factures)', await p.inputValue('#overlay select[name=cat]') === 'Factures et travaux');
    await p.click('#overlay button.primary'); await p.waitForTimeout(3500);
    const t1 = await toastTxt(); ok(`après l'ajout : "Voir", "En ajouter", "Annuler" (${t1.replace(/\s+/g, ' ')})`, /Document ajouté/.test(t1) && /Voir/.test(t1) && /En ajouter/.test(t1) && /Annuler/.test(t1));
    ok('le document est dans le logement', await p.evaluate(() => S.fichiers.some(f => f.bienId === 'b1' && f.nom === 'Facture plombier' && f.chemin)));
    // 2. deux fichiers d'un coup, puis Annuler
    await p.evaluate(() => ajouterDocument('b1', '')); await p.waitForTimeout(300);
    await p.setInputFiles('#overlay input[name=fichier]', [OUT + '/Attestation assurance.pdf', OUT + '/Notes.pdf']); await p.waitForTimeout(600);
    await p.click('#overlay button.primary'); await p.waitForTimeout(6000);
    ok('deux fichiers d\'un coup : "2 documents ajoutés", chacun avec sa catégorie', /2 documents ajoutés/.test(await toastTxt()) && await p.evaluate(() => S.fichiers.find(f => f.nom === 'Attestation assurance').cat === 'Assurance' && !!S.fichiers.find(f => f.nom === 'Notes')));
    await clicToast('Annuler'); await p.waitForTimeout(600);
    ok('Annuler l\'ajout : les 2 disparaissent, la facture reste', await p.evaluate(() => !S.fichiers.some(f => /Attestation|Notes/.test(f.nom)) && S.fichiers.some(f => f.nom === 'Facture plombier')));
    // 3. la liste des documents : ouvrir, modifier, supprimer
    await p.evaluate(() => go(lienDocs('b1', -1, '').slice(1))); await p.waitForTimeout(500);
    await p.screenshot({ path: OUT + '/1-liste.png' });
    const fid = await p.evaluate(() => S.fichiers.find(f => f.nom === 'Facture plombier').id);
    ok('chaque document : ✏️ (modifier) et ✕ (supprimer)', await p.locator(`#app button[onclick="editDocument('${fid}')"]`).count() === 1 && await p.locator(`#app button[onclick="supprimerDocument('${fid}')"]`).count() === 1);
    console.log('    lien signé :', JSON.stringify(await p.evaluate(async id => { const f = S.fichiers.find(x => x.id === id); const r = await SB.storage.from('documents').createSignedUrl(f.chemin, 60); return r.error ? r.error.message : r.data.signedUrl.slice(0, 80); }, fid)));
    let demande = null; ctx.on('request', r => { if (/storage\/v1\/object\/sign\/documents\//.test(r.url())) demande = r.url(); });
    const [pop] = await Promise.all([ctx.waitForEvent('page', { timeout: 15000 }).catch(() => null), p.click(`#app a:has-text("Facture plombier")`)]);
    if (pop) { await pop.waitForURL(/^https?:/, { timeout: 15000 }).catch(() => {}); console.log('    ouvert :', pop.url().slice(0, 90), '| page :', p.url().slice(0, 60), '| toast :', await toastTxt()); }
    ok('toucher le nom ouvre le document (nouvel onglet, fichier demandé)', !!pop && !!demande); if (pop) await pop.close();
    // 4. modifier : renommer, changer de logement, de catégorie
    await p.click(`#app button[onclick="editDocument('${fid}')"]`); await p.waitForTimeout(300);
    await p.screenshot({ path: OUT + '/2-modifier.png' });
    ok('fiche du document : Ouvrir, Nom, Logement, Concerne, Catégorie, Supprimer', await p.evaluate(() => { const o = document.getElementById('overlay'); return /Ouvrir/.test(o.innerText) && !!o.querySelector('[name=nom]') && !!o.querySelector('[name=bienId]') && !!o.querySelector('[name=bailId]') && !!o.querySelector('[name=cat]') && !!o.querySelector('#mdel'); }));
    await p.fill('#overlay [name=nom]', 'Facture fuite cuisine');
    await p.selectOption('#overlay [name=bienId]', 'b2'); await p.waitForTimeout(100);
    ok('changer de logement met à jour "Concerne" (plus Léa, du T2)', await p.evaluate(() => ![...document.querySelectorAll('#overlay [name=bailId] option')].some(o => /Léa/.test(o.textContent))));
    await p.selectOption('#overlay [name=cat]', 'Autre'); await p.click('#overlay button.primary'); await p.waitForTimeout(800);
    ok('renommé et déplacé vers le Studio, catégorie Autre', await p.evaluate(id => { const f = S.fichiers.find(x => x.id === id); return f.nom === 'Facture fuite cuisine' && f.bienId === 'b2' && f.cat === 'Autre'; }, fid));
    const enBase = await p.evaluate(async id => { await new Promise(r => setTimeout(r, 4000)); const r = await SB.from('docs').select('data').eq('espace_id', ESPACE).eq('coll', 'fichiers').eq('doc_id', id).maybeSingle(); return r.data && r.data.data; }, fid);
    ok('modification enregistrée en ligne', enBase && enBase.bienId === 'b2' && enBase.nom === 'Facture fuite cuisine');
    // 5. supprimer puis Annuler, puis supprimer pour de bon
    await p.evaluate(() => go(lienDocs('b2', -1, '').slice(1))); await p.waitForTimeout(400);
    await p.click(`#app button[onclick="supprimerDocument('${fid}')"]`); await p.waitForTimeout(300);
    await p.evaluate(() => { const b = [...document.querySelectorAll('#overlay button')].find(x => /Supprimer|Oui|Confirmer/.test(x.textContent) && !/Annuler/.test(x.textContent)); b.click(); }); await p.waitForTimeout(600);
    ok('supprimé, avec "Annuler" proposé', /supprimé/.test(await toastTxt()) && await p.evaluate(id => !S.fichiers.some(f => f.id === id), fid));
    await clicToast('Annuler'); await p.waitForTimeout(600);
    ok('Annuler : le document revient', await p.evaluate(id => S.fichiers.some(f => f.id === id), fid));
    const chemin = await p.evaluate(id => S.fichiers.find(f => f.id === id).chemin, fid);
    await p.evaluate(id => retirerDocuments(id), fid); await p.waitForTimeout(13500);
    const reste = await p.evaluate(async c => { const [dos, nom] = [c.split('/').slice(0, -1).join('/'), c.split('/').pop()]; const r = await SB.storage.from('documents').list(dos); return (r.data || []).some(x => x.name === nom); }, chemin);
    ok('supprimé pour de bon : le fichier est effacé du stockage après le délai', !reste);
    // 6. retour arrière : depuis Docs › logement › retour = Docs
    await p.click('#bottomnav a[href="#docs"]'); await p.waitForTimeout(500);
    await p.evaluate(() => go(lienDocs('b1', -1, '').slice(1))); await p.waitForTimeout(300);
    ok('retour arrière depuis les documents du logement → Documents', await p.evaluate(() => /#docs$/.test(document.querySelector('#app a.back').getAttribute('href'))));
    // 7. Ranger un papier quand il n'y a aucun logement : pas d'impasse
    ok('aucune impasse "ajoute d\'abord un logement" (bouton proposé)', /Ajouter un logement/.test(await p.evaluate(() => { const sv = S.biens; S.biens = []; S.fichiers.push({ id: 'x9', boite: true, nom: 'scan', type: 'application/pdf', date: iso(TODAY) }); rangerRecu('x9'); S.biens = sv; S.fichiers = S.fichiers.filter(f => f.id !== 'x9'); return document.getElementById('toast').innerText; })));
  } finally { await p.evaluate(async () => { const c = S.fichiers.filter(f => f.chemin).map(f => f.chemin); if (c.length) await SB.storage.from('documents').remove(c); await SB.from('espaces').delete().eq('id', ESPACE); }); }
  ok('aucune erreur', !errs.length); if (errs.length) console.log(errs);
  await b.close(); srv.close(); console.log(KO ? `\n${KO} échec(s)` : '\nTout est bon'); process.exit(KO ? 1 : 0);
})();

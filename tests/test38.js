// Quittances du mois en un geste : une fenêtre, adresses modifiables et décochables, "Pas besoin" et sansQuittance respectés,
// sans e-mail = "Télécharger le PDF", avertissement "ne s'annule pas", un seul "Oui, envoyer les N". Mode local, envoi simulé.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = __dirname + '/shots38'; fs.mkdirSync(OUT, { recursive: true });
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
    await p.route('**/jspdf.umd.min.js', r => r.fulfill({ path: __dirname + '/vendor/jspdfpkg/package/dist/jspdf.umd.min.js', contentType: 'application/javascript' }));
    await p.goto('file://' + path.join(__dirname, '..', 'index.html')); await p.waitForTimeout(600);
    // 5 locataires qui ont payé ce mois : A, B, C avec e-mail ; D "pas besoin" ce mois ; E jamais de quittance ; F sans e-mail
    const r0 = await p.evaluate(() => {
      S = demo(); S.quittances = {}; S.faits = {};
      const ech = () => toutesEcheances().filter(e => e.m === CUR);
      S.baux.forEach(b => { const e = echeance(b, CUR); if (e && e.du > 0 && e.statut !== 'paye') S.paiements.push({ id: uid(), bailId: b.id, mois: CUR, montant: e.reste, date: iso(TODAY) }); });
      S.baux.forEach((b, i) => { b.email = 'loc' + i + '@exemple.fr'; });
      const L = S.baux.filter(b => (echeance(b, CUR) || {}).statut === 'paye');
      if (L.length < 4) return { erreur: 'pas assez de locataires payés : ' + L.length };
      S.faits['qno-' + L[0].id + '|' + CUR] = iso(TODAY);   // "Pas besoin" pour ce mois
      L[1].sansQuittance = true;                             // jamais de quittance
      L[2].email = '';                                       // pas d'e-mail
      window.ENVOYES = []; envoyerMailBrut = async o => { ENVOYES.push(o.to); return true; };
      save(); render();
      return { payes: L.length, attendus: toutesEcheances().filter(qAFaire).filter(e => e.m === CUR).length, ids: L.map(b => b.id) };
    });
    if (r0.erreur) { ok(r0.erreur, false); continue; }
    // accueil : bouton "Envoyer les N quittances"
    const nAFaire = await p.evaluate(() => toutesEcheances().filter(qAFaire).length);
    await p.waitForTimeout(200);
    ok(`${scheme} : accueil "Envoyer les ${nAFaire} quittances"`, await p.evaluate(n => document.body.innerText.includes(`Envoyer les ${n} quittances`), nAFaire));
    await p.evaluate(() => { location.hash = 'afaire'; }); await p.waitForTimeout(300);
    ok(`${scheme} : À faire "Envoyer les ${nAFaire} quittances"`, await p.evaluate(n => document.body.innerText.includes(`Envoyer les ${n} quittances`), nAFaire));
    await p.evaluate(() => { envoyerToutesQuittances(); }); await p.waitForTimeout(400);
    await p.screenshot({ path: OUT + `/1-fenetre-${scheme}.png` });
    const t = await p.evaluate(() => document.getElementById('overlay').innerText);
    const ex = await p.evaluate(ids => { const ov = document.getElementById('overlay').innerText; const l = n => nomCourt(bail(n).nom) + ' · ' + fm(CUR); return { qno: ov.includes(l(ids[0])), sansQ: ov.includes(nomCourt(bail(ids[1]).nom)), sansMail: ov.includes(l(ids[2])) }; }, r0.ids);
    ok(scheme + ' : "Pas besoin" respecté (absent)', !ex.qno);
    ok(scheme + ' : "sans quittance" respecté (absent)', !ex.sansQ);
    ok(scheme + ' : sans e-mail listé à part avec "Télécharger le PDF"', ex.sansMail && /Sans adresse e-mail \(\d+\)/i.test(t) && /Télécharger le PDF/.test(t));
    ok(scheme + ' : "Un e-mail envoyé ne peut pas être annulé"', /ne peut pas être annulé/.test(t));
    const nMail = await p.evaluate(() => document.querySelectorAll('#mform .lot-q input[type=checkbox]').length);
    ok(scheme + ` : bouton "Oui, envoyer les ${nMail}"`, await p.evaluate(n => document.querySelector('#mform button.primary').textContent.trim() === `Oui, envoyer les ${n}`, nMail));
    // décocher la 1re ligne, corriger l'adresse de la 2e
    await p.evaluate(() => { const c = document.querySelector('#mform .lot-q input[type=checkbox]'); c.checked = false; c.dispatchEvent(new Event('change')); });
    await p.fill('#mform .lot-q input[name=m1]', 'nouvelle@exemple.fr');
    ok(scheme + ` : décoché -> "Oui, envoyer les ${nMail - 1}"`, await p.evaluate(n => document.querySelector('#mform button.primary').textContent.trim() === (n > 1 ? `Oui, envoyer les ${n}` : 'Oui, envoyer la quittance'), nMail - 1));
    ok(scheme + ' : rien envoyé avant de valider', await p.evaluate(() => ENVOYES.length === 0));
    await p.click('#mform button.primary'); await p.waitForTimeout(2500);
    console.log('    envoyés :', await p.evaluate(() => [ENVOYES.length, (document.getElementById('toast') || {}).innerText]));
    const env = await p.evaluate(() => ENVOYES);
    ok(scheme + ` : ${env.length} envoyées, dont l'adresse corrigée`, env.length === nMail - 1 && env.includes('nouvelle@exemple.fr'));
    ok(scheme + ' : adresse corrigée gardée sur la fiche', await p.evaluate(() => S.baux.some(b => b.email === 'nouvelle@exemple.fr')));
    ok(scheme + ' : la ligne décochée reste à envoyer', await p.evaluate(() => toutesEcheances().filter(qAFaire).filter(e => e.b.email).length === 1));
    const sw = await p.evaluate(() => document.documentElement.scrollWidth); ok(scheme + ' : pas de débordement (' + sw + ')', sw <= 390);
    await p.close();
  }
  console.log('ERREURS', errs); console.log('KO', KO); await b.close();
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });

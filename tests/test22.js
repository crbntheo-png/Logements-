const { chromium } = require('playwright');
const fs = require('fs');
let FAKE = fs.readFileSync(__dirname + '/test2.js', 'utf8').split('const FAKE = `')[1].split('`;')[0];
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.addInitScript(FAKE); await p.route('**/jspdf.umd.min.js', r => r.fulfill({ path: __dirname + '/vendor/jspdfpkg/package/dist/jspdf.umd.min.js', contentType: 'application/javascript' }));
  await p.goto('file://' + require('path').join(__dirname, '..', 'index.html') + ''); await p.waitForTimeout(600);
  await p.evaluate(() => { window.ENVOYES = []; window.envoyerMailBrut = async o => { ENVOYES.push(o); return true; }; S = demo(); S.paiements = []; save(); render(); });
  const id = await p.evaluate(() => { const b = S.baux.find(x => echeance(x, CUR)); b.email = ''; save(); return b.id; });
  // 1. marquer payé : rien ne part
  await p.evaluate(id => encaisser(id, CUR), id); await p.waitForTimeout(800);
  console.log('après "A payé" envoyés =', await p.evaluate(() => ENVOYES.length));
  // 2. Envoyer la quittance = aperçu
  await p.evaluate(id => envoyerQuittance(id, CUR), id); await p.waitForTimeout(400);
  console.log('aperçu ouvert', await p.evaluate(() => !document.getElementById('overlay').hidden && !!document.getElementById('maildest')), 'envoyés =', await p.evaluate(() => ENVOYES.length));
  await p.click('#dsend'); await p.waitForTimeout(200);
  console.log('sans adresse : bloqué', await p.evaluate(() => !document.getElementById('confEnvoi') && ENVOYES.length === 0));
  await p.fill('#maildest', 'locataire@test.fr'); await p.click('#dsend'); await p.waitForTimeout(300);
  await p.screenshot({ path: __dirname + '/b22-confirm.png' });
  console.log('bandeau de confirmation', await p.evaluate(() => document.getElementById('confEnvoi')?.innerText));
  await p.click('#confNon'); await p.waitForTimeout(200);
  console.log('annuler : envoyés =', await p.evaluate(() => ENVOYES.length), 'aperçu toujours là', await p.evaluate(() => !document.getElementById('overlay').hidden));
  await p.click('#dsend'); await p.waitForTimeout(200); await p.click('#confOui'); await p.waitForTimeout(1500);
  console.log('oui : envoyés =', await p.evaluate(() => ENVOYES.map(e => [e.to, e.objet, e.pieces.length])), 'email gardé dans la fiche', await p.evaluate(id => bail(id).email, id), 'quittance notée', await p.evaluate(id => !!S.quittances[id + '|' + CUR], id));
  // 3. lot : rien ne part avant validation
  await p.evaluate(() => { S.baux.forEach(b => { b.email = b.email || 'x' + b.id + '@test.fr'; }); toutesEcheances().filter(e => e.statut !== 'paye' && e.m === CUR).forEach(e => S.paiements.push({ id: uid(), bailId: e.b.id, mois: e.m, montant: e.reste, date: iso(TODAY), mode: 'virement' })); save(); render(); ENVOYES.length = 0; envoyerToutesQuittances(); });
  await p.waitForTimeout(400); await p.screenshot({ path: __dirname + '/b22-lot.png' });
  console.log('lot ouvert, envoyés =', await p.evaluate(() => ENVOYES.length), 'lignes', await p.evaluate(() => document.querySelectorAll('#overlay input[type=checkbox]').length));
  await p.click('#overlay button.primary >> nth=-1'); await p.waitForTimeout(3000);
  console.log('après validation du lot', await p.evaluate(() => ENVOYES.length));
  console.log('ERR', errs); await b.close();
})();

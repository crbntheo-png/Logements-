const { chromium } = require('playwright');
const fs = require('fs');
let FAKE = fs.readFileSync(__dirname + '/test2.js', 'utf8').split('const FAKE = `')[1].split('`;')[0];
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.addInitScript(FAKE); await p.route('**/jspdf.umd.min.js', r => r.fulfill({ path: __dirname + '/vendor/jspdfpkg/package/dist/jspdf.umd.min.js', contentType: 'application/javascript' }));
  await p.goto('file://' + require('path').join(__dirname, '..', 'index.html') + ''); await p.waitForTimeout(500);
  // Steve : loyer 510 le 10, suivi depuis septembre, rien payé en sept/oct
  await p.evaluate(() => { S = demo(); S.paiements = []; S.relances = []; S.biens.push({ id: 'bs', nom: 'Beauchamps 43', type: 'Maison', adresse: '43 rue X', cp: '95250', ville: 'Beauchamp', meuble: 'vide' });
    S.baux.push({ id: 'steve', bienId: 'bs', nom: 'Steve Godefroy', email: 'steve@test.fr', typeBail: 'vide', dateEntree: '2025-09-01', suiviDepuis: '2026-09', loyerHC: '510', charges: '0', jourPaiement: '10', revisions: [] }); save(); render(); location.hash = 'bail-steve'; });
  await p.waitForTimeout(400);
  const st = () => p.evaluate(() => ({ dette: detteBail(bail('steve')), mois: echeancesBail(bail('steve'), addM(CUR, 1)).map(e => e.m + ':' + e.statut + ':' + e.paye), plan: planEtat(bail('steve')) && (({ dette, attendu, ok, manque, fin, pct }) => ({ dette, attendu, ok, manque, fin, pct }))(planEtat(bail('steve'))) }));
  console.log('départ', JSON.stringify(await st()));
  // il verse 200
  await p.evaluate(() => verserSomme('steve')); await p.waitForTimeout(200); await p.fill('#f_montant', '200'); await p.screenshot({ path: __dirname + '/b15-verser.png' }); await p.click('.modal button.primary, #overlay button.primary >> nth=-1'); await p.waitForTimeout(400);
  console.log('après 200', JSON.stringify(await st()));
  // plan 50/mois dès décembre
  await p.evaluate(() => editPlan('steve')); await p.waitForTimeout(200); await p.click('#overlay button.primary >> nth=-1'); await p.waitForTimeout(400);
  console.log('plan', JSON.stringify(await st()));
  await p.evaluate(() => location.hash = 'bail-steve'); await p.waitForTimeout(300); await p.screenshot({ path: __dirname + '/b15-fiche.png', fullPage: true });
  console.log('tâches', await p.evaluate(() => taches().filter(t => t.bailId === 'steve').map(t => t.prio + ' ' + t.t)));
  // simuler 2 mois plus tard sans rien payer : TODAY avancé
  await p.evaluate(() => { bail('steve').plan.debut = addM(CUR, -1); save(); });
  console.log('plan commencé le mois dernier, rien payé', JSON.stringify(await st()), await p.evaluate(() => taches().filter(t => t.bailId === 'steve').map(t => t.prio + ' ' + t.t)));
  await p.evaluate(() => { S.paiements.push(); verserSomme('steve'); }); await p.waitForTimeout(200); await p.fill('#f_montant', '50'); await p.click('#overlay button.primary >> nth=-1'); await p.waitForTimeout(300);
  console.log('il verse 50', JSON.stringify(await st()));
  await p.evaluate(() => docPlan('steve')); await p.waitForTimeout(300); await p.screenshot({ path: __dirname + '/b15-accord.png', fullPage: true });
  console.log('pdf pages', await p.evaluate(() => fairePdf(CURDOC.html).getNumberOfPages()));
  console.log('ERR', errs); await b.close();
})();

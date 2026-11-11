const { chromium } = require('playwright');
const fs = require('fs');
const out = __dirname + '/shots4';
fs.mkdirSync(out, { recursive: true });
let FAKE = fs.readFileSync(__dirname + '/test2.js', 'utf8').split('const FAKE = `')[1].split('`;')[0];
// replace mcp with richer fake
FAKE = FAKE.replace(/const mcp = \{[\s\S]*?\};\n/, `const tree = { '1Bcx1xiH7q1C88nPE-zxgOYV0uw108-vW': [{id:'f1',title:'Agon',mimeType:'application/vnd.google-apps.folder'},{id:'f2',title:'Beauchamps',mimeType:'application/vnd.google-apps.folder'},{id:'k1',title:'Kbis GTP.pdf',mimeType:'application/pdf',fileSize:'21000',modifiedTime:'2026-05-29T00:00:00Z'}], f1: [{id:'a1',title:'Bail Martin Camille.pdf',mimeType:'application/pdf',fileSize:'300000',modifiedTime:'2026-09-01T00:00:00Z'},{id:'f3',title:'Travaux',mimeType:'application/vnd.google-apps.folder'}], f2:[{id:'b1',title:'Contrat de prêt Beauchamps',mimeType:'application/pdf',fileSize:'18000000',modifiedTime:'2026-09-18T00:00:00Z'}], f3:[{id:'t1',title:'Devis plombier.pdf',mimeType:'application/pdf',fileSize:'5000',modifiedTime:'2026-10-01T00:00:00Z'}] };
  window.__calls = [];
  const mcp = { listTools: async () => ({ servers: [], fileArgs: true }), callTool: async (srv, tool, input) => { window.__calls.push([srv, tool, JSON.stringify(input).slice(0, 200)]);
    if (srv === 'Gmail') { window.__mails.push({ to: input.to, subject: input.subject, att: (input.attachments||[]).map(a => a.filename + ':' + (typeof a.content === 'string' ? a.content.length : 'FILEARG')) }); return { payload: { id: 'x' } }; }
    if (tool === 'search_files') { const m = /parentId = '([^']+)'/.exec(input.query); const t = /title = /.test(input.query); if (t) return { payload: { files: [] } }; return { payload: { files: (tree[m[1]]||[]).map(f => ({...f, parentId: m[1], viewUrl: 'https://drive.google.com/x/' + f.id})) } }; }
    if (tool === 'download_file_content') { const big = input.fileId === 'b1'; return { payload: { content: big ? 'A'.repeat(1200000) : 'JVBERi0xLjQK', mimeType: 'application/pdf', title: 'x' } }; }
    if (tool === 'create_file') { return { payload: { id: 'new' + Math.random(), title: input.title, viewUrl: 'u' } }; }
    return { payload: {} }; } };
`);
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const route = r => r.fulfill({ path: __dirname + '/jspdfpkg/package/dist/jspdf.umd.min.js', contentType: 'application/javascript' });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.addInitScript(FAKE); await p.route('**/jspdf.umd.min.js', route);
  await p.goto('file:///home/user/Logements-/index.html'); await p.waitForTimeout(600);
  await p.evaluate(() => { S = demo(); S.baux[0].email = 'camille@test.fr'; S.sci.contacts = [{ nom: 'Cabinet X', role: 'Comptable', email: 'compta@x.fr' }]; save(); render(); }); await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/accueil.png`, fullPage: true });
  await p.evaluate(() => location.hash = 'docs'); await p.waitForTimeout(800);
  console.log('DOCS', await p.evaluate(() => [DOCS.etat, DOCS.fichiers.map(f => f.titre + ' @ ' + f.chemin.join('/'))]));
  await p.screenshot({ path: `${out}/docs.png`, fullPage: true });
  await p.fill('#docq', 'plomb'); await p.waitForTimeout(200);
  console.log('SEARCH', await p.textContent('#docres'));
  await p.evaluate(() => envoyerFichier('a1')); await p.waitForTimeout(200);
  await p.screenshot({ path: `${out}/envoyer.png` });
  await p.check('#mform input[name="dest0"]'); await p.click('#mform button.primary'); await p.waitForTimeout(500);
  await p.evaluate(() => envoyerFichier('b1')); await p.waitForTimeout(100); await p.fill('#f_autre', 'notaire@x.fr'); await p.click('#mform button.primary'); await p.waitForTimeout(500);
  console.log('MAILS', JSON.stringify(await p.evaluate(() => window.__mails)));
  // quittance send -> archive
  const id0 = await p.evaluate(() => S.baux[0].id);
  await p.evaluate(id => envoyerQuittance(id, CUR), id0); await p.waitForTimeout(800);
  console.log('CREATE calls', await p.evaluate(() => window.__calls.filter(c => c[1] === 'create_file').map(c => c[2])));
  // bank import
  const csv = 'Date;Libellé;Débit;Crédit\n04/11/2026;VIR SEPA RECU DE M LUCAS BERNARD LOYER;;480,00\n05/11/2026;VIR SEPA DURAND SARAH;;1050,00\n06/11/2026;PRLV SEPA FONCIA SYNDIC COPRO;312,40;\n06/11/2026;FRAIS TENUE DE COMPTE;8,00;\n07/11/2026;VIR INCONNU XYZ;;50,00';
  await p.evaluate(c => { RELEVE = rapprocher(lireReleve(c)); }, csv);
  console.log('RELEVE', JSON.stringify(await p.evaluate(() => RELEVE.map(o => [o.type, o.montant, o.bailId && bail(o.bailId).nom, o.mois, o.categorie]))));
  await p.evaluate(() => revueReleve()); await p.waitForTimeout(200);
  await p.screenshot({ path: `${out}/releve.png`, fullPage: true });
  await p.click('#mform button.primary'); await p.waitForTimeout(1200);
  console.log('after import: paiements', await p.evaluate(() => S.paiements.length), 'deps', await p.evaluate(() => S.depenses.filter(d => d.banque).length), 'vus', await p.evaluate(() => Object.keys(S.banqueVus).length));
  console.log('re-import new ops', await p.evaluate(c => rapprocher(lireReleve(c)).length, csv));
  // paste format
  const paste = '04/11/2026  VIREMENT DE MARTIN CAMILLE  +600,00\n03/11/2026 PRLV ASSURANCE AXA PNO 45,90\n02/11/2026 CB LEROY MERLIN -89,99';
  console.log('PASTE', JSON.stringify(await p.evaluate(c => lireReleve(c).map(o => [o.date, o.montant, o.lib]), paste)));
  await p.evaluate(id => documentsPour(id), id0); await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/docs-locataire.png`, fullPage: true }); await p.evaluate(() => closeOverlay());
  await p.evaluate(() => location.hash = 'reglages'); await p.waitForTimeout(200);
  await p.screenshot({ path: `${out}/reglages.png`, fullPage: true });
  const m = await b.newPage({ viewport: { width: 390, height: 844 } });
  m.on('pageerror', e => errs.push('M:' + e.message));
  await m.addInitScript(FAKE); await m.route('**/jspdf.umd.min.js', route);
  await m.goto('file:///home/user/Logements-/index.html'); await m.waitForTimeout(500);
  await m.evaluate(() => { S = demo(); render(); }); await m.waitForTimeout(200);
  await m.screenshot({ path: `${out}/mob-accueil.png` });
  await m.evaluate(() => location.hash = 'docs'); await m.waitForTimeout(700);
  await m.screenshot({ path: `${out}/mob-docs.png` });
  console.log('mob sw', await m.evaluate(() => document.documentElement.scrollWidth));
  console.log('ERRORS', errs);
  await b.close();
})();

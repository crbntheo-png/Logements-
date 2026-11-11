const { chromium } = require('playwright');
const fs = require('fs');
const out = __dirname + '/shots2';
fs.mkdirSync(out, { recursive: true });
const FAKE = `
(() => {
  const store = {}; const subs = [];
  const notify = () => subs.forEach(s => s());
  const snapColl = c => { const docs = Object.keys(store).filter(p => p.startsWith(c + '/') && p.split('/').length === 2).map(p => ({ id: p.split('/')[1], exists: true, data: () => store[p] })); return { docs, size: docs.length, empty: !docs.length }; };
  const db = {
    collection: c => ({ onSnapshot: (fn) => { const s = () => fn(snapColl(c)); subs.push(s); setTimeout(s, 10); return () => {}; } }),
    doc: p => ({ onSnapshot: fn => { const s = () => fn({ exists: !!store[p], data: () => store[p] }); subs.push(s); setTimeout(s, 10); return () => {}; },
      set: async v => { window.__writes = (window.__writes||0)+1; store[p] = JSON.parse(JSON.stringify(v)); setTimeout(notify, 5); },
      delete: async () => { delete store[p]; setTimeout(notify, 5); } })
  };
  window.__store = store; window.__mails = [];
  const mcp = { callTool: async (srv, tool, input) => { window.__mails.push({ srv, tool, to: input.to, subject: input.subject, att: input.attachments[0].filename, len: input.attachments[0].content.length, b64: input.attachments[0].content }); return { payload: { id: 'x' } }; } };
  window.claude = { use: async n => n === 'db' ? db : n === 'mcp' ? mcp : n === 'downloads' ? { save: async r => { window.__dl = r.filename; return { status: 'saved' }; } } : null };
})();`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.addInitScript(FAKE);
  const route = r => r.fulfill({ path: __dirname + '/vendor/jspdfpkg/package/dist/jspdf.umd.min.js', contentType: 'application/javascript' });
  await p.route('**/jspdf.umd.min.js', route);
  await p.goto('file://' + require('path').join(__dirname, '..', 'index.html') + ''); await p.waitForTimeout(800);
  await p.screenshot({ path: `${out}/bienvenue.png`, fullPage: true });
  console.log('MODE', await p.evaluate(() => MODE));
  await p.evaluate(() => { S = demo(); save(); render(); }); await p.waitForTimeout(400);
  console.log('docs in store', await p.evaluate(() => Object.keys(window.__store).length));
  // give one tenant an email
  await p.evaluate(() => { S.baux[0].email = 'camille@test.fr'; S.baux[3].email = 'sarah@test.fr'; save(); render(); }); await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/accueil.png`, fullPage: true });
  // A payé for Sarah previous month late
  const sid = await p.evaluate(() => S.baux[3].id);
  await p.evaluate(id => encaisser(id, addM(CUR, -1)), sid); await p.waitForTimeout(800);
  console.log('MAILS', JSON.stringify(await p.evaluate(() => window.__mails.map(m => ({ to: m.to, subject: m.subject, att: m.att, len: m.len })))));
  const b64 = await p.evaluate(() => window.__mails[0] && window.__mails[0].b64);
  if (b64) fs.writeFileSync(out + '/quittance-mail.pdf', Buffer.from(b64, 'base64'));
  console.log('quittance flag', await p.evaluate(id => S.quittances[id + '|' + addM(CUR, -1)], sid));
  // bulk send
  await p.evaluate(() => envoyerToutesQuittances()); await p.waitForTimeout(1500);
  console.log('MAILS after bulk', await p.evaluate(() => window.__mails.length));
  // revisions tasks
  await p.evaluate(() => location.hash = 'afaire'); await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/afaire.png`, fullPage: true });
  console.log('REV', JSON.stringify(await p.evaluate(() => S.baux.map(b => { const r = revInfo(b); return r && { nom: b.nom, statut: r.statut, anniv: iso(r.anniv), newKey: r.newKey, oldKey: r.oldKey, ancien: r.ancien, nouveau: r.nouveau }; }))));
  // apply revision on first pret
  const rid = await p.evaluate(() => (S.baux.find(b => { const r = revInfo(b); return r && r.statut === 'pret'; }) || {}).id);
  if (rid) { await p.evaluate(id => revision(id), rid); await p.waitForTimeout(200); await p.screenshot({ path: `${out}/revision-modal.png` }); await p.click('#mform button.primary'); await p.waitForTimeout(400); await p.screenshot({ path: `${out}/revision-doc.png`, fullPage: true }); await p.evaluate(() => telechargerPdf()); await p.waitForTimeout(200); console.log('DL', await p.evaluate(() => window.__dl)); await p.evaluate(() => closeOverlay()); }
  // bail pdf
  const id0 = await p.evaluate(() => S.baux[0].id);
  await p.evaluate(id => docBailOpen(id), id0); await p.waitForTimeout(200);
  const bailB64 = await p.evaluate(() => fairePdf(CURDOC.html).output('datauristring').split(',')[1]);
  fs.writeFileSync(out + '/bail.pdf', Buffer.from(bailB64, 'base64'));
  await p.evaluate(() => closeOverlay());
  await p.evaluate(id => relance(id, addM(CUR, 0)), sid); await p.waitForTimeout(200);
  const relB64 = await p.evaluate(() => fairePdf(CURDOC.html).output('datauristring').split(',')[1]);
  fs.writeFileSync(out + '/relance.pdf', Buffer.from(relB64, 'base64'));
  await p.evaluate(() => closeOverlay());
  // new bail form
  await p.evaluate(() => editBail()); await p.fill('#f_dateEntree', '2023-03-10'); await p.dispatchEvent('#f_dateEntree', 'change'); console.log('IRL auto', await p.inputValue('#f_irlTrimestre')); await p.screenshot({ path: `${out}/form.png`, fullPage: true }); await p.evaluate(() => closeOverlay());
  for (const h of ['reglages', 'biens', 'compta', 'loyers']) { await p.evaluate(h => location.hash = h, h); await p.waitForTimeout(200); await p.screenshot({ path: `${out}/${h}.png`, fullPage: true }); }
  // clear demo -> store empty
  await p.evaluate(() => { S = blank(); save(); }); await p.waitForTimeout(500);
  console.log('store after clear', await p.evaluate(() => Object.keys(window.__store)));
  // mobile
  const m = await b.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
  await m.route('**/jspdf.umd.min.js', route);
  m.on('pageerror', e => errs.push('M:' + e.message));
  await m.goto('file://' + require('path').join(__dirname, '..', 'index.html') + ''); await m.waitForTimeout(600);
  await m.evaluate(() => { S = demo(); S.baux[0].email = 'a@b.fr'; render(); }); await m.waitForTimeout(200);
  await m.screenshot({ path: `${out}/mobile.png`, fullPage: true });
  console.log('MOBILE sw', await m.evaluate(() => document.documentElement.scrollWidth), 'MODE', await m.evaluate(() => MODE));
  console.log('ERRORS', errs);
  await b.close();
})();

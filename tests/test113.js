// Contrôle visuel de toutes les pages (mode local, exemple) : iPhone 390×844 et Android 412×915, clair et sombre.
// Repère : page plus large que l'écran, élément qui dépasse à droite, texte coupé, bouton trop petit pour le doigt, erreurs JS,
// fenêtres (modales) qui débordent. Usage : node tests/test113.js [--detail]
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const src = fs.readFileSync(__dirname + '/test4.js', 'utf8');
let FAKE = fs.readFileSync(__dirname + '/test2.js', 'utf8').split('const FAKE = `')[1].split('`;')[0];
const mcpBlock = src.split("FAKE = FAKE.replace(/const mcp = \\{[\\s\\S]*?\\};\\n/, `")[1].split("`);")[0];
FAKE = FAKE.replace(/const mcp = \{[\s\S]*?\};\n/, mcpBlock);
const DETAIL = process.argv.includes('--detail');
const ECRANS = [['iPhone', 390, 844, 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'], ['Android', 412, 915, 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36'], ['Petit', 320, 640, '']];
const PAGES = ['locataires', 'afaire', 'biens', 'docs', 'compta:resume', 'compta:depenses', 'compta:banque', 'compta:comptable', 'reglages', 'loyers', 'aide', 'demarrage', 'legal', 'integrations', 'historique', 'bientot', 'nouveautes', 'ajouter-doc', 'BIEN', 'BAIL', 'DOCSBIEN', 'IMMEUBLE'];
const MODALES = ['editBien()', 'editBail()', 'editBien(S.biens[0].id)', 'editBail(S.baux[0].id)', 'choisirEspace && SB ? 0 : 0'];
let KO = 0; const pb = {};
(async () => {
  const b = await chromium.launch();
  for (const [nom, w, h, ua] of ECRANS) for (const theme of ['light', 'dark']) {
    if (nom === 'Petit' && theme === 'dark') continue;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: theme, ...(ua ? { userAgent: ua } : {}) });
    const p = await ctx.newPage(), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(FAKE); await p.goto('file://' + path.join(__dirname, '..', 'index.html')); await p.waitForTimeout(500);
    await p.evaluate(() => { S = demo(); save(); });
    for (const pg of PAGES) {
      await p.evaluate(pg => {
        closeOverlay && closeOverlay();
        const bi = S.biens.find(x => !x.immeuble) || S.biens[0], ba = S.baux.find(x => isActive(x)) || S.baux[0], im = S.biens.find(x => x.immeuble);
        if (pg.startsWith('compta:')) { view.comptaOnglet = pg.slice(7); location.hash = 'compta'; }
        else if (pg === 'BIEN') location.hash = 'bien-' + bi.id;
        else if (pg === 'BAIL') location.hash = 'bail-' + ba.id;
        else if (pg === 'DOCSBIEN') location.hash = lienDocs(bi.id, -1, '').slice(1);
        else if (pg === 'IMMEUBLE') { if (!im) return; location.hash = 'bien-' + im.id; }
        else location.hash = pg;
        render();
      }, pg);
      await p.waitForTimeout(250);
      const r = await p.evaluate(({ W }) => {
        const out = [], vw = document.documentElement.clientWidth;
        if (document.documentElement.scrollWidth > vw + 1) out.push(`page plus large que l'écran (${document.documentElement.scrollWidth}px)`);
        const desc = el => { const t = (el.innerText || el.value || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40); return `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''} "${t}"`; };
        const cache = el => { for (let x = el; x && x !== document.body; x = x.parentElement) { const s = getComputedStyle(x); if (s.display === 'none' || s.visibility === 'hidden') return true; if (x.tagName === 'DETAILS' && !x.open && !el.closest('summary')) return true; if (/(auto|scroll|hidden)/.test(s.overflowX) && x !== el && x.scrollWidth > x.clientWidth + 1) return 'scroll'; } return false; };
        document.querySelectorAll('#app *, nav *, header *').forEach(el => {
          const rc = el.getBoundingClientRect(); if (!rc.width || !rc.height) return;
          const c = cache(el); if (c === true) return;
          if (rc.right > vw + 1 && c !== 'scroll') out.push(`dépasse à droite de ${Math.round(rc.right - vw)}px : ${desc(el)}`);
          if (rc.left < -1 && c !== 'scroll') out.push(`dépasse à gauche : ${desc(el)}`);
          const s = getComputedStyle(el);
          if (el.children.length === 0 && el.scrollWidth > el.clientWidth + 2 && s.overflow === 'hidden' && s.textOverflow !== 'ellipsis' && el.clientWidth > 0) out.push(`texte coupé : ${desc(el)}`);
          if (el.matches('button, a.btn, .btn, select, input:not([type=hidden]):not([type=checkbox]):not([type=radio]), [role=link]') && !el.closest('.toast, #toast') && c !== 'scroll') { if (rc.height < 28 && rc.width > 0 && !el.matches('a:not(.btn), .cq')) out.push(`trop petit pour le doigt (${Math.round(rc.width)}×${Math.round(rc.height)}) : ${desc(el)}`); }
        });
        return [...new Set(out)];
      }, { W: w });
      if (r.length) { const k = `${nom}/${theme}/${pg}`; pb[k] = r; }
    }
    // fenêtres
    for (const m of ['editBien()', 'editBien(S.biens[0].id)', 'editBail(S.baux.find(x=>isActive(x)).id)', 'editBail()']) {
      const r = await p.evaluate(m => { try { closeOverlay(); location.hash = 'biens'; render(); eval(m); } catch (e) { return ['erreur : ' + e.message]; }
        const o = document.getElementById('overlay'); if (!o || !o.innerHTML) return []; const vw = document.documentElement.clientWidth, out = [];
        o.querySelectorAll('*').forEach(el => { const rc = el.getBoundingClientRect(); if (rc.width && rc.right > vw + 1) out.push(`dépasse à droite de ${Math.round(rc.right - vw)}px : ${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} "${(el.innerText || '').trim().slice(0, 30)}"`); });
        return [...new Set(out)]; }, m);
      if (r.length) pb[`${nom}/${theme}/fenêtre ${m}`] = r;
    }
    if (errs.length) pb[`${nom}/${theme}/erreurs JS`] = [...new Set(errs)].filter(e => !/file:|URL scheme/.test(e));
    await ctx.close();
  }
  await b.close();
  const cles = Object.keys(pb).filter(k => pb[k].length);
  // regroupe les problèmes identiques entre écrans
  const parPb = {}; cles.forEach(k => pb[k].forEach(x => { (parPb[x] = parPb[x] || []).push(k); }));
  Object.entries(parPb).forEach(([x, ou]) => { KO++; console.log('  ✗ ' + x + '\n      ' + (DETAIL ? ou.join(', ') : ou.slice(0, 3).join(', ') + (ou.length > 3 ? ` (+${ou.length - 3})` : ''))); });
  console.log(KO ? `\n${KO} problème(s)` : '\nTout est propre'); process.exit(KO ? 1 : 0);
})();

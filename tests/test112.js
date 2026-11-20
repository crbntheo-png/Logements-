// Plusieurs espaces et Drive partagé (21/11) — vraie base, compte de test, deux espaces temporaires.
// Chaque dossier partagé appartient à un espace ; un sous-dossier peut aller dans un autre ; "pour quel espace ?" ;
// un dossier déjà utilisé reste dans son espace ; ce qu'on vient de partager va dans l'espace ouvert ;
// le tri du serveur (filtrerEspace, testé à part) ; papier à l'adresse d'un immeuble → fiche de l'immeuble.
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const DIST = path.join(__dirname, '..', 'dist');
let KO = 0; const ok = (n, v) => { console.log((v ? '  ✓ ' : '  ✗ ') + n); if (!v) KO++; };

// 1. Le tri du serveur, avec le vrai code de la fonction "partage"
const src = fs.readFileSync(path.join(__dirname, '..', 'supabase/functions/partage/index.ts'), 'utf8');
const fn = src.slice(src.indexOf('// == filtrerEspace =='), src.indexOf('// == fin =='));
const tmp = path.join(os.tmpdir(), 'filtre-' + process.pid + '.ts');
fs.writeFileSync(tmp, `const DOSSIER = "application/vnd.google-apps.folder";\n${fn}\nconst F = "application/vnd.google-apps.folder";
const racines = [{ id: "P", name: "SCI Paul", mimeType: F }, { id: "M", name: "SCI Marc", mimeType: F }, { id: "X", name: "Immobilier", mimeType: F }, { id: "solo", name: "bail.pdf", mimeType: "application/pdf" }];
const dossiers = { P: { ancetres: [] }, M: { ancetres: [] }, X: { ancetres: [] }, XA: { ancetres: ["X"] }, XB: { ancetres: ["X"] }, XB1: { ancetres: ["X", "XB"] } };
const fichiers = [{ id: "p1", racine: "P", ancetres: ["P"] }, { id: "m1", racine: "M", ancetres: ["M"] }, { id: "xa", racine: "X", ancetres: ["X", "XA"] }, { id: "xb", racine: "X", ancetres: ["X", "XB", "XB1"] }, { id: "solo", racine: "", ancetres: [] }];
const A = { P: "E1", M: "E2", X: "E1", XB: "E2", solo: "E2" };
const e1 = filtrerEspace(racines, dossiers, fichiers, A, "E1"), e2 = filtrerEspace(racines, dossiers, fichiers, A, "E2"), sans = filtrerEspace(racines, dossiers, fichiers, null, "");
const libre = filtrerEspace(racines, dossiers, fichiers, { P: "E1" }, "E2");
console.log(JSON.stringify({ e1: e1.F.map(f => f.id), e2: e2.F.map(f => f.id), e1R: e1.R.map(r => r.id), e2R: e2.R.map(r => r.id), e2D: Object.keys(e2.D), sans: sans.F.length, libre: libre.F.map(f => f.id), libreR: libre.R.map(r => r.id + ":" + r.espace) }));\n`);
const r = JSON.parse(execFileSync(process.execPath, [tmp], { encoding: 'utf8' }).trim().split('\n').pop()); fs.unlinkSync(tmp);
ok(`serveur, espace 1 : Paul et le sous-dossier gardé (${r.e1})`, r.e1.join() === 'p1,xa');
ok(`serveur, espace 2 : Marc, le sous-dossier envoyé et le fichier seul (${r.e2})`, r.e2.join() === 'm1,xb,solo');
ok(`serveur, espace 2 : le dossier "Immobilier" reste visible pour son sous-dossier, pas "SCI Paul" (${r.e2R})`, r.e2R.join() === 'M,X,solo' && !r.e2D.includes('XA') && r.e2D.includes('XB1'));
ok('serveur, ancienne appli (sans espace) : tout comme avant', r.sans === 5);
ok(`serveur : ce qui n'est attribué nulle part est rendu, marqué libre (${r.libreR})`, r.libre.join() === 'm1,xa,xb,solo' && r.libreR.join() === 'M:null,X:null,solo:null');

// 2. L'appli, sur la vraie base
const srv = http.createServer((q, rs) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { rs.writeHead(404); return rs.end(); } rs.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'application/javascript' : f.endsWith('.json') ? 'application/json' : 'application/octet-stream' }); fs.createReadStream(f).pipe(rs); }).listen(8112);
const id = c => (c + 'x'.repeat(28)).slice(0, 28);
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}); const errs = [];
  const p = await (await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' })).newPage();
  p.on('pageerror', e => errs.push(e.message)); await p.route(/accounts\.google\.com\/gsi/, r => r.abort());
  await p.goto('http://localhost:8112/'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const r = await SB.auth.signInWithPassword({ email: 'test-a@gestion-test.fr', password: 'TestMotDePasse-2026!' }); await apresConnexion(r.data.user); });
  await p.waitForTimeout(1500);
  const creer = async nom => { await p.evaluate(() => { MODE = 'nouvel-espace'; render(); }); await p.fill('#esp_nom', nom); await p.click('#esp_btn'); await p.waitForTimeout(2500); return p.evaluate(() => ESPACE); };
  const E1 = await creer('Test SCI Paul'), E2 = await creer('Test SCI Marc');
  const IDS = { P: id('P'), M: id('M'), X: id('X'), XA: id('XA'), XB: id('XB'), p1: id('p1'), m1: id('m1'), xa: id('xa'), xb: id('xb'), N: id('N'), n1: id('n1'), L: id('L'), l1: id('l1') };
  try {
    /* Drive simulé : le serveur rend ce qui est à cet espace ou pas attribué (même règle que filtrerEspace) */
    await p.evaluate(I => {
      window.__racines = [['P', 'SCI Paul'], ['M', 'SCI Marc'], ['X', 'Immobilier']];
      window.fnPartage = async (action, extra) => {
        if (action === 'config') return { pret: true, adresse: 'appli@exemple.iam.gserviceaccount.com', adresses: ['test-a@gestion-test.fr'], client_id: 'x' };
        if (action !== 'lister') throw new Error('?');
        const cl = (await SB.from('partage_dossiers').select('dossier_id, espace_id')).data || [], A = {}; cl.forEach(x => { A[x.dossier_id] = x.espace_id; });
        const F = [['p1', 'P', ['P'], 'Facture plombier.pdf'], ['m1', 'M', ['M'], 'Taxe fonciere 2025.pdf'], ['xa', 'X', ['X', 'XA'], 'Bail.pdf'], ['xb', 'X', ['X', 'XB'], 'Devis toiture.pdf'], ['n1', 'N', ['N'], 'Assurance PNO.pdf'], ['l1', 'L', ['L'], 'Quittance.pdf']];
        const D = { [I.P]: { titre: 'SCI Paul', chemin: ['SCI Paul'], ancetres: [], racine: true }, [I.M]: { titre: 'SCI Marc', chemin: ['SCI Marc'], ancetres: [], racine: true }, [I.X]: { titre: 'Immobilier', chemin: ['Immobilier'], ancetres: [], racine: true }, [I.XA]: { titre: 'Lyon', chemin: ['Immobilier', 'Lyon'], ancetres: [I.X] }, [I.XB]: { titre: 'Nantes', chemin: ['Immobilier', 'Nantes'], ancetres: [I.X] }, [I.N]: { titre: 'Nouveau', chemin: ['Nouveau'], ancetres: [], racine: true }, [I.L]: { titre: 'Ancien', chemin: ['Ancien'], ancetres: [], racine: true } };
        const roots = window.__racines.map(([k, n]) => ({ id: I[k], nom: n, dossier: true }));
        const esp = ch => { for (let i = ch.length - 1; i >= 0; i--) if (A[ch[i]]) return A[ch[i]]; return null; }, ici = e => !e || e === extra.espace;
        const vus = new Set(roots.map(r => r.id));
        const fichiers = F.filter(([, r]) => vus.has(I[r])).map(([f, r, anc, t]) => ({ id: I[f], titre: t, type: 'application/pdf', lien: 'https://drive.google.com/file/d/' + I[f] + '/view', chemin: anc.map(a => D[I[a]].titre), ancetres: anc.map(a => I[a]), racine: I[r], partage: true })).filter(f => ici(esp(f.ancetres)));
        const dossiers = {}; Object.entries(D).forEach(([k, d]) => { const r0 = d.ancetres[0] || k; if (vus.has(r0) && ici(esp([...d.ancetres, k]))) dossiers[k] = d; });
        const racines = roots.map(r => ({ ...r, espace: A[r.id] || null })).filter(r => !r.espace || r.espace === extra.espace || Object.values(dossiers).some(d => d.ancetres.includes(r.id)));
        return { ok: true, racines, dossiers, fichiers };
      };
    }, IDS);
    const lire = async () => { await p.evaluate(async () => { PARTAGE = { etat: 'inconnu' }; await chargerPartage(); DOCS = { etat: 'vide', fichiers: [], dossiers: {} }; await indexerAppli(true); location.hash = 'docs'; render(); }); await p.waitForTimeout(400);
      return p.evaluate(() => ({ f: DOCS.fichiers.map(f => f.titre).sort(), carte: (document.querySelector('.esp-libres') || {}).innerText || '', libres: (PARTAGE.libres || []).map(r => r.nom) })); };
    // espace 2 ouvert (le dernier créé) : rien n'est attribué → tout attend "pour quel espace ?"
    await p.evaluate(id => ouvrirEspace(id), E1); await p.waitForTimeout(2500);
    let v = await lire();
    ok(`plusieurs espaces, rien d'attribué : rien n'est lu ni rangé (${v.f.length} fichier)`, v.f.length === 0);
    ok(`carte "pour quel espace ?" avec les 3 dossiers et un bouton par espace`, v.libres.length === 3 && /pour quel espace/.test(v.carte) && /Ici : Test SCI Paul/.test(v.carte) && /Test SCI Marc/.test(v.carte));
    // P → ici ; M → espace 2
    await p.evaluate(id => choisirEspaceDossier(id, ESPACE), IDS.P); await p.waitForTimeout(800);
    await p.evaluate(([id, e]) => choisirEspaceDossier(id, e), [IDS.M, E2]); await p.waitForTimeout(800);
    const toastM = await p.evaluate(() => document.getElementById('toast').innerText);
    ok(`"SCI Marc" envoyé dans l'autre espace : message avec Annuler et Ouvrir (${toastM.replace(/\n/g, ' ')})`, /va dans Test SCI Marc/.test(toastM) && /Annuler/.test(toastM) && /Ouvrir/.test(toastM));
    await p.evaluate(id => choisirEspaceDossier(id, ESPACE), IDS.X); await p.waitForTimeout(800);
    v = await lire();
    ok(`espace Paul : ses fichiers seulement (${v.f})`, v.f.join() === 'Bail.pdf,Devis toiture.pdf,Facture plombier.pdf' && !v.carte);
    // sous-dossier "Nantes" → espace Marc, depuis "Dossiers et logements"
    const opt = await p.evaluate(id => { const d = document.createElement('div'); S.biens = S.biens.length ? S.biens : [{ id: 'b1', nom: 'Lyon T2' }]; d.innerHTML = sectionDossiersLogements(); const sel = [...d.querySelectorAll('select')].find(s => /Nantes/.test(s.closest('li').innerText)); return sel ? [...sel.options].map(o => o.textContent).join(' | ') : ''; }, IDS.XB);
    ok(`"Ce dossier =" propose "📦 Test SCI Marc" (${opt})`, /📦 Test SCI Marc/.test(opt));
    await p.evaluate(([id, e]) => choisirEspaceDossier(id, e), [IDS.XB, E2]); await p.waitForTimeout(800);
    v = await lire();
    ok(`le sous-dossier "Nantes" a quitté l'espace Paul (${v.f})`, v.f.join() === 'Bail.pdf,Facture plombier.pdf');
    // droits : impossible d'attribuer à un espace dont on n'est pas membre
    const refus = await p.evaluate(async () => (await SB.from('partage_dossiers').insert({ dossier_id: 'zz-test', espace_id: '00000000-0000-0000-0000-000000000001' })).error ? 'refusé' : 'accepté');
    ok('attribuer à un espace dont on n\'est pas membre : refusé', refus === 'refusé');
    // espace Marc
    await p.evaluate(id => ouvrirEspace(id), E2); await p.waitForTimeout(2500);
    v = await lire();
    ok(`espace Marc : Marc et "Nantes", rien de Paul (${v.f})`, v.f.join() === 'Devis toiture.pdf,Taxe fonciere 2025.pdf' && !v.carte);
    // un dossier qu'on vient de partager depuis l'espace Marc va dans l'espace Marc
    await p.evaluate(() => { window.__racines.push(['N', 'Nouveau']); }); await p.evaluate(() => verifierPartage()); await p.waitForTimeout(1500);
    const n = await p.evaluate(async id => (await SB.from('partage_dossiers').select('espace_id').eq('dossier_id', id).maybeSingle()).data, IDS.N);
    ok('dossier qu\'on vient de partager : rangé dans l\'espace ouvert, sans question', n && n.espace_id === E2);
    // ancien dossier déjà utilisé dans l'espace Paul (un document rangé vient de lui) : il y reste tout seul
    await p.evaluate(id => ouvrirEspace(id), E1); await p.waitForTimeout(2500);
    await p.evaluate(I => { S.fichiers.push({ id: 'f-l1', bienId: (S.biens[0] || {}).id || '', cat: 'Autre', nom: 'Quittance', url: 'https://drive.google.com/file/d/' + I.l1 + '/view', date: iso(TODAY) }); window.__racines.push(['L', 'Ancien']); }, IDS);
    v = await lire();
    const l = await p.evaluate(async id => (await SB.from('partage_dossiers').select('espace_id').eq('dossier_id', id).maybeSingle()).data, IDS.L);
    ok(`dossier déjà utilisé ici : gardé dans cet espace sans question (${v.f.includes('Quittance.pdf') ? 'lu' : 'pas lu'})`, l && l.espace_id === E1 && v.f.includes('Quittance.pdf') && !v.carte);
    // Réglages et "Ajouter un dossier" : comptes Google reconnus + "Un autre compte Google"
    const modale = await p.evaluate(() => { ajouterDossierPartage(); const t = document.getElementById('overlay').innerText; closeOverlay(); return t; });
    ok('"Ajouter un dossier" : comptes reconnus et "+ Un autre compte Google"', /test-a@gestion-test\.fr/.test(modale) && /Un autre compte Google/.test(modale));
    const aucun = await p.evaluate(async () => { window.__racines = []; PARTAGE.racines = []; await verifierPartage(); return document.getElementById('toast').innerText; });
    ok(`rien de partagé : bouton "Il est sur un autre compte Google" (${aucun.replace(/\n/g, ' ')})`, /autre compte Google/.test(aucun));
    // le serveur refuse un faux code Google pour ajouter une adresse
    const faux = await p.evaluate(async () => { const s = (await SB.auth.getSession()).data.session; const r = await fetch(APP_SUPABASE.url + '/functions/v1/partage', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: APP_SUPABASE.cle, Authorization: 'Bearer ' + s.access_token }, body: JSON.stringify({ action: 'adresse', code: 'faux' }) }); return (await r.json()).erreur || 'accepté'; });
    ok(`ajouter une adresse avec un faux code Google : refusé (${faux})`, /refusé/.test(faux));
    const ecrire = await p.evaluate(async () => (await SB.from('google_adresses').insert({ user_id: SB_USER.id, adresse: 'pirate@gmail.com' })).error ? 'refusé' : 'accepté');
    ok('ajouter une adresse Google soi-même, sans passer par Google : refusé', ecrire === 'refusé');
    // immeuble : un papier qui ne cite que l'adresse commune va dans la fiche de l'immeuble
    const im = await p.evaluate(() => { S.biens = [{ id: 'im', nom: 'Immeuble Lilas', adresse: '12 rue des Lilas', immeuble: true }, { id: 'l1', nom: 'T2 premier', adresse: '12 rue des Lilas', immeubleId: 'im' }, { id: 'l2', nom: 'T3 second', adresse: '12 rue des Lilas', immeubleId: 'im' }, { id: 'aut', nom: 'Maison', adresse: '4 chemin Vert' }]; S.baux = [];
      const a = deviner({ titre: 'Facture plombier 12 rue des Lilas.pdf' }), b = deviner({ titre: 'Facture T3 second 12 rue des Lilas.pdf' });
      S.biens = [{ id: 'l1', nom: 'T2', adresse: '12 rue des Lilas' }, { id: 'l2', nom: 'T3', adresse: '12 rue des Lilas' }]; const c = deviner({ titre: 'Facture 12 rue des Lilas.pdf' });
      return { a: a.bienId, sur: a.sur, b: b.bienId, c: c.bienId }; });
    ok(`immeuble : "Facture plombier 12 rue des Lilas" → fiche de l'immeuble, rangée tout seul (${im.a}, sûr : ${im.sur})`, im.a === 'im' && im.sur);
    ok(`immeuble : "Facture T3 second…" → le lot (${im.b})`, im.b === 'l2');
    ok(`deux logements à la même adresse sans fiche immeuble : pas de devinette (${im.c})`, !im.c);
  } finally {
    await p.evaluate(async ([a, c, I]) => { await SB.from('partage_dossiers').delete().in('dossier_id', Object.values(I)); await SB.from('espaces').delete().eq('id', a); await SB.from('espaces').delete().eq('id', c); }, [E1, E2, IDS]);
  }
  ok('aucune erreur', !errs.length); if (errs.length) console.log(errs);
  await b.close(); srv.close(); console.log(KO ? `\n${KO} échec(s)` : '\nTout est bon'); process.exit(KO ? 1 : 0);
})();

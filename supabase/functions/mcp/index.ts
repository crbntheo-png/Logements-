// Connecteur MCP (Model Context Protocol, transport HTTP) pour Claude et les autres assistants compatibles.
// Adresse : https://bcfcrqmpeyaoovluvhhn.supabase.co/functions/v1/mcp/JETON — lecture seule des chiffres publiés par l'appli.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, mcp-session-id, mcp-protocol-version", "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS", "Access-Control-Expose-Headers": "mcp-session-id" };
const json = (c: unknown, s = 200) => new Response(JSON.stringify(c), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const empreinte = async (t: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)))).map(b => b.toString(16).padStart(2, "0")).join("");
const VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
const RIEN = { type: "object", properties: {}, additionalProperties: false };
const OUTILS = [
  { name: "resume_du_mois", description: "Vue d'ensemble de l'espace pour le mois en cours : loyers attendus et reçus, locataires en retard, quittances à envoyer, nombre de tâches urgentes. À appeler en premier.", inputSchema: RIEN },
  { name: "locataires", description: "Liste des locataires actuels (logement, loyer, charges, jour de paiement, ce qu'ils doivent, contact, fin d'assurance, prochaine révision). Avec 'nom', le détail d'un locataire et ses mois impayés.", inputSchema: { type: "object", properties: { nom: { type: "string", description: "Tout ou partie du nom du locataire" } }, additionalProperties: false } },
  { name: "logements", description: "Liste des logements (adresse, type, surface, DPE, locataire en place, loyer).", inputSchema: RIEN },
  { name: "impayes", description: "Tous les loyers en retard, mois par mois (dû, payé, reste).", inputSchema: RIEN },
  { name: "a_faire", description: "La liste des tâches de l'appli (urgentes d'abord) : relances, quittances, révisions, assurances, déclarations…", inputSchema: RIEN },
  { name: "echeances", description: "Les dates à venir sur 90 jours : loyers attendus, révisions, fins d'assurance, préavis, taxe foncière, déclarations.", inputSchema: RIEN },
  { name: "tresorerie", description: "Prévision du solde du compte sur 12 mois (loyers attendus, prêts, taxe foncière, dépenses courantes).", inputSchema: RIEN },
  { name: "compta", description: "Compta de l'année en cours : loyers encaissés et dépenses par catégorie et par logement.", inputSchema: RIEN },
  { name: "documents", description: "Liste des documents rangés dans l'appli (nom, catégorie, logement, date), sans leur contenu. Avec 'logement', seulement ceux d'un logement.", inputSchema: { type: "object", properties: { logement: { type: "string", description: "Tout ou partie du nom du logement" } }, additionalProperties: false } },
];
// ---- Ranger avec Claude (seulement si le propriétaire l'a autorisé) : créer et ranger, jamais supprimer ni envoyer ----
const CATS_DOC = ["Bail", "État des lieux", "Diagnostics (DPE…)", "Assurance", "Taxe foncière", "Factures et travaux", "Acte d'achat / prêt", "Copropriété", "Locataire (pièces, garant…)", "Autre"];
const CATS = ["Taxe foncière", "Charges de copropriété", "Assurance propriétaire (PNO)", "Assurance loyers impayés", "Travaux d'entretien / réparation", "Travaux d'amélioration", "Intérêts d'emprunt", "Assurance emprunteur", "Remboursement capital emprunt", "Échéance de prêt (capital + intérêts, à ventiler)", "Achat du bien / frais d'acquisition", "Frais bancaires", "Honoraires (comptable, notaire, avocat…)", "Diagnostics", "Eau / électricité / gaz", "Frais de gestion / annonces", "Autre"];
const ECRIRE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };
const OUTILS_ECRITURE = [
  { name: "creer_logement", description: "Crée un logement dans l'appli (appartement, studio, maison, parking…). Vérifie d'abord avec 'logements' qu'il n'existe pas déjà.", annotations: ECRIRE, inputSchema: { type: "object", additionalProperties: false, required: ["nom"], properties: {
    nom: { type: "string", description: "Nom court et parlant, ex : « T2 Beauchamps »" }, adresse: { type: "string", description: "Numéro et rue" }, code_postal: { type: "string" }, ville: { type: "string" },
    type: { type: "string", enum: ["Appartement", "Studio", "Maison", "Parking", "Local commercial", "Autre"] }, meuble: { type: "boolean", description: "true si location meublée" }, surface: { type: "number", description: "en m²" } } } },
  { name: "creer_locataire", description: "Crée un locataire ACTUEL (son bail) dans un logement existant. Les loyers sont suivis à partir du prochain loyer à payer : rien n'est compté comme impayé avant.", annotations: ECRIRE, inputSchema: { type: "object", additionalProperties: false, required: ["nom", "logement", "date_entree", "loyer_hc"], properties: {
    nom: { type: "string", description: "Prénom Nom (les colocataires dans 'colocataires')" }, logement: { type: "string", description: "Nom (ou identifiant) du logement" }, date_entree: { type: "string", description: "AAAA-MM-JJ" },
    loyer_hc: { type: "number", description: "Loyer mensuel hors charges" }, charges: { type: "number" }, jour_paiement: { type: "number", description: "Jour du mois (1 à 31)" }, depot: { type: "number", description: "Dépôt de garantie" },
    type_bail: { type: "string", enum: ["vide", "meuble", "etudiant", "mobilite"] }, email: { type: "string" }, telephone: { type: "string" }, colocataires: { type: "string" } } } },
  { name: "ajouter_document", description: "Ajoute un document au bon logement, sous forme de LIEN (ex : lien Google Drive du bail, du DPE, d'une facture). Le fichier reste là où il est.", annotations: ECRIRE, inputSchema: { type: "object", additionalProperties: false, required: ["nom", "lien", "logement", "categorie"], properties: {
    nom: { type: "string", description: "Nom clair, ex : « Bail Jean Dupont 2025 »" }, lien: { type: "string", description: "Adresse https du document" }, logement: { type: "string" }, categorie: { type: "string", enum: CATS_DOC },
    locataire: { type: "string", description: "Si le document concerne un locataire précis" }, date: { type: "string", description: "AAAA-MM-JJ (date du document)" } } } },
  { name: "ranger_document", description: "Range un document déjà dans l'appli (par exemple reçu dans la boîte à documents, « à ranger ») dans un logement et une catégorie.", annotations: ECRIRE, inputSchema: { type: "object", additionalProperties: false, required: ["document", "logement"], properties: {
    document: { type: "string", description: "Nom ou identifiant du document (voir l'outil documents)" }, logement: { type: "string" }, categorie: { type: "string", enum: CATS_DOC }, locataire: { type: "string" } } } },
  { name: "ajouter_depense", description: "Ajoute une dépense dans la compta de l'appli (facture, assurance, travaux…). Vérifie avec 'compta' qu'elle n'y est pas déjà.", annotations: ECRIRE, inputSchema: { type: "object", additionalProperties: false, required: ["date", "montant", "categorie", "libelle"], properties: {
    date: { type: "string", description: "AAAA-MM-JJ" }, montant: { type: "number", description: "Montant TTC en euros, positif" }, categorie: { type: "string", enum: CATS }, libelle: { type: "string" }, logement: { type: "string", description: "Vide = la SCI en général" } } } },
  { name: "ajouter_rappel", description: "Ajoute un rappel dans « À faire » à une date (ex : « Demander l'attestation d'assurance de Jean »).", annotations: ECRIRE, inputSchema: { type: "object", additionalProperties: false, required: ["titre", "date"], properties: {
    titre: { type: "string" }, date: { type: "string", description: "AAAA-MM-JJ" }, logement: { type: "string" } } } },
];
const uidc = () => crypto.randomUUID().replace(/-/g, "").slice(0, 10);
const dateOk = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));
const parisAuj = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" }));
const moisDe = (d: Date) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
async function ecrire(admin: any, e: string, nom: string, a: any, cx: any) {
  const lire = async (coll: string) => ((await admin.from("docs").select("data").eq("espace_id", e).eq("coll", coll)).data || []).map((r: any) => r.data);
  const R = (o: unknown) => ({ content: [{ type: "text", text: JSON.stringify(o, null, 1) }] }), err = (m: string) => ({ isError: true, content: [{ type: "text", text: m }] });
  const trouver = (L: any[], ref: string, quoi: string) => { const r = norm(ref).trim(); if (!r) return { e: `Indique le ${quoi}.` };
    const exact = L.filter(x => x.id === ref || norm(x.nom) === r); if (exact.length === 1) return { x: exact[0] };
    const p = L.filter(x => norm(x.nom).includes(r) || r.includes(norm(x.nom))); if (p.length === 1) return { x: p[0] };
    return { e: p.length ? `Plusieurs ${quoi}s correspondent à « ${ref} » : ${p.map(x => x.nom).join(", ")}. Précise.` : `Aucun ${quoi} ne correspond à « ${ref} ». Existants : ${L.map(x => x.nom).join(", ") || "aucun"}.` }; };
  const inserer = async (coll: string, data: any) => { const { error } = await admin.from("docs").insert({ espace_id: e, coll, doc_id: data.id, data: { ...data, parClaude: true }, maj_le: new Date().toISOString() }); if (error) throw new Error(error.message); };
  const maj = async (coll: string, data: any) => { const { error } = await admin.from("docs").update({ data, maj_le: new Date().toISOString() }).eq("espace_id", e).eq("coll", coll).eq("doc_id", data.id); if (error) throw new Error(error.message); };
  const snap = (cle: string, o: any) => { cx.d[cle] = [...(cx.d[cle] || []), o]; cx.modifie = true; };
  if (nom === "creer_logement") {
    const L = await lire("biens"); if (L.some((b: any) => norm(b.nom) === norm(a.nom))) return err(`Le logement « ${a.nom} » existe déjà.`);
    const b = { id: uidc(), nom: String(a.nom).slice(0, 80), adresse: String(a.adresse || "").slice(0, 160), cp: String(a.code_postal || "").slice(0, 10), ville: String(a.ville || "").slice(0, 80), type: a.type || "Appartement", meuble: a.meuble ? "meuble" : "vide", surface: +a.surface > 0 ? +a.surface : "" };
    await inserer("biens", b); snap("logements", { id: b.id, nom: b.nom, adresse: [b.adresse, [b.cp, b.ville].filter(Boolean).join(" ")].filter(Boolean).join(", "), type: b.type, meuble: b.meuble, surface: b.surface, locataire: "vacant", loyer_total: 0 });
    return R({ ok: true, cree: "logement", id: b.id, nom: b.nom });
  }
  if (nom === "creer_locataire") {
    const B = await lire("biens"), t = trouver(B, a.logement, "logement"); if (t.e) return err(t.e);
    if (!dateOk(a.date_entree)) return err("date_entree doit être au format AAAA-MM-JJ.");
    if (!(+a.loyer_hc > 0)) return err("loyer_hc doit être un montant positif.");
    const baux = await lire("baux"); if (baux.some((x: any) => x.bienId === t.x.id && norm(x.nom) === norm(a.nom) && !x.dateSortie)) return err(`${a.nom} est déjà locataire de ${t.x.nom}.`);
    const jour = +a.jour_paiement >= 1 && +a.jour_paiement <= 31 ? Math.round(+a.jour_paiement) : 5, auj = parisAuj(), cur = moisDe(auj), entree = String(a.date_entree);
    const suivi = entree.slice(0, 7) > cur ? entree.slice(0, 7) : (auj.getDate() > jour ? moisDe(new Date(auj.getFullYear(), auj.getMonth() + 1, 1)) : cur);
    const l = { id: uidc(), bienId: t.x.id, nom: String(a.nom).slice(0, 120), colocataires: String(a.colocataires || ""), email: String(a.email || ""), tel: String(a.telephone || ""), typeBail: ["vide", "meuble", "etudiant", "mobilite"].includes(a.type_bail) ? a.type_bail : (t.x.meuble === "meuble" ? "meuble" : "vide"),
      dateEntree: entree, suiviDepuis: suivi, loyerHC: String(+a.loyer_hc), charges: String(+a.charges || 0), jourPaiement: String(jour), depot: +a.depot > 0 ? +a.depot : "", revisions: [] };
    await inserer("baux", l); snap("locataires", { id: l.id, nom: l.nom, logement: t.x.nom, entree, loyer_hc: +a.loyer_hc, charges: +a.charges || 0, jour_paiement: jour, doit: 0, email: l.email, telephone: l.tel });
    return R({ ok: true, cree: "locataire", id: l.id, nom: l.nom, logement: t.x.nom, loyers_suivis_a_partir_de: suivi });
  }
  if (nom === "ajouter_document") {
    if (!/^https:\/\/\S+$/.test(String(a.lien || ""))) return err("Le lien doit commencer par https://");
    if (!CATS_DOC.includes(a.categorie)) return err("Catégorie inconnue. Choix : " + CATS_DOC.join(", "));
    const B = await lire("biens"), t = trouver(B, a.logement, "logement"); if (t.e) return err(t.e);
    const F = await lire("fichiers"); if (F.some((f: any) => f.url === a.lien && f.bienId === t.x.id)) return R({ ok: true, deja: true, info: "Ce document est déjà rangé dans ce logement." });
    let bailId = ""; if (a.locataire) { const tl = trouver((await lire("baux")).filter((x: any) => x.bienId === t.x.id), a.locataire, "locataire"); if (tl.e) return err(tl.e); bailId = tl.x.id; }
    const f = { id: uidc(), bienId: t.x.id, cat: a.categorie, nom: String(a.nom).slice(0, 140), url: String(a.lien), date: dateOk(a.date) ? a.date : moisDe(parisAuj()) + "-" + String(parisAuj().getDate()).padStart(2, "0"), bailId };
    await inserer("fichiers", f); snap("documents", { id: f.id, nom: f.nom, categorie: f.cat, logement: t.x.nom, date: f.date });
    return R({ ok: true, cree: "document", id: f.id, nom: f.nom, logement: t.x.nom, categorie: f.cat });
  }
  if (nom === "ranger_document") {
    const F = await lire("fichiers"), td = trouver(F, a.document, "document"); if (td.e) return err(td.e);
    const B = await lire("biens"), t = trouver(B, a.logement, "logement"); if (t.e) return err(t.e);
    if (a.categorie && !CATS_DOC.includes(a.categorie)) return err("Catégorie inconnue. Choix : " + CATS_DOC.join(", "));
    let bailId = td.x.bailId || ""; if (a.locataire) { const tl = trouver((await lire("baux")).filter((x: any) => x.bienId === t.x.id), a.locataire, "locataire"); if (tl.e) return err(tl.e); bailId = tl.x.id; }
    await maj("fichiers", { ...td.x, bienId: t.x.id, cat: a.categorie || td.x.cat || "Autre", bailId, rangeParClaude: true });
    return R({ ok: true, range: td.x.nom, logement: t.x.nom, categorie: a.categorie || td.x.cat });
  }
  if (nom === "ajouter_depense") {
    if (!dateOk(a.date)) return err("date doit être au format AAAA-MM-JJ."); if (!(+a.montant > 0)) return err("montant doit être positif.");
    if (!CATS.includes(a.categorie)) return err("Catégorie inconnue. Choix : " + CATS.join(", "));
    let bienId = ""; if (a.logement) { const t = trouver(await lire("biens"), a.logement, "logement"); if (t.e) return err(t.e); bienId = t.x.id; }
    const D = await lire("depenses"); if (D.some((x: any) => x.date === a.date && Math.abs(+x.montant - +a.montant) < 0.01 && (x.bienId || "") === bienId)) return R({ ok: true, deja: true, info: "Une dépense du même montant à la même date existe déjà : rien ajouté." });
    const dep = { id: uidc(), date: a.date, montant: Math.round(+a.montant * 100) / 100, categorie: a.categorie, bienId, libelle: String(a.libelle).slice(0, 80), recuperable: false };
    await inserer("depenses", dep); return R({ ok: true, cree: "dépense", id: dep.id, montant: dep.montant, categorie: dep.categorie });
  }
  if (nom === "ajouter_rappel") {
    if (!dateOk(a.date)) return err("date doit être au format AAAA-MM-JJ.");
    let bienId = ""; if (a.logement) { const t = trouver(await lire("biens"), a.logement, "logement"); if (t.e) return err(t.e); bienId = t.x.id; }
    const r = { id: uidc(), titre: String(a.titre).slice(0, 140), date: a.date, bienId, fait: false };
    await inserer("rappels", r); return R({ ok: true, cree: "rappel", titre: r.titre, date: r.date });
  }
  return null;
}
const PROMPT_RANGER = `Aide-moi à ranger mon espace de gestion locative, avec les outils « Gestion locative ».
1. Regarde ce qui existe déjà : resume_du_mois, logements, locataires, documents.
2. Cherche mes documents de location dans mes autres outils (Google Drive, Gmail…) : baux, états des lieux, DPE, assurances, avis de taxe foncière, factures.
3. Montre-moi d'abord un plan clair : logements à créer, locataires actuels à créer (avec loyer, charges, date d'entrée), documents à ajouter dans chaque logement (avec leur lien), dépenses à ajouter. Attends que je dise OK.
4. Ensuite seulement, fais-le avec les outils, puis fais-moi un bilan.
Règles : ne crée jamais un doublon, ne devine pas un montant (demande-moi), et ne range que les locataires actuels.`;
const norm = (s: unknown) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
function appeler(nom: string, a: any, d: any) {
  const T = (o: unknown) => ({ content: [{ type: "text", text: JSON.stringify(o, null, 1) }] });
  switch (nom) {
    case "resume_du_mois": return T({ espace: d.espace, mise_a_jour: d.maj, ...d.resume });
    case "locataires": { const L = d.locataires || []; if (!a?.nom) return T(L); const f = L.filter((x: any) => norm(x.nom).includes(norm(a.nom))); return T(f.length ? f.map((x: any) => ({ ...x, impayes: (d.impayes || []).filter((i: any) => i.locataire === x.nom) })) : { erreur: "Aucun locataire ne correspond à « " + a.nom + " »", locataires: L.map((x: any) => x.nom) }); }
    case "logements": return T(d.logements || []);
    case "impayes": return T(d.impayes || []);
    case "a_faire": return T(d.taches || []);
    case "echeances": return T(d.echeances || []);
    case "tresorerie": return T(d.tresorerie || { info: "Trésorerie pas encore disponible : indique le solde du compte dans l'appli (Compta) ou branche la banque." });
    case "compta": return T(d.compta || {});
    case "documents": { const L = d.documents || []; return T(a?.logement ? L.filter((x: any) => norm(x.logement).includes(norm(a.logement))) : L); }
  }
  return null;
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const jeton = new URL(req.url).pathname.split("/").filter(Boolean).pop() || "";
  if (!/^[A-Za-z0-9_-]{30,80}$/.test(jeton)) return json({ erreur: "Lien de connecteur incomplet" }, 400);
  if (req.method !== "POST") return new Response(null, { status: 405, headers: { ...CORS, Allow: "POST" } });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const h = await empreinte(jeton);
  const { data: c } = await admin.from("connecteurs").select("donnees, espace_id, ecriture").eq("jeton_hash", h).maybeSingle();
  if (!c) return json({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "Ce lien de connecteur n'est plus valable : recrée-le dans l'appli (Réglages › Brancher sur Claude)." } }, 404);
  let corps: any; try { corps = await req.json(); } catch (_) { return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "JSON illisible" } }, 400); }
  const d: any = c.donnees || {}, cx = { d, modifie: false };
  const traiter = async (m: any) => {
    if (!m || m.jsonrpc !== "2.0" || typeof m.method !== "string") return { jsonrpc: "2.0", id: m?.id ?? null, error: { code: -32600, message: "Requête invalide" } };
    if (m.id === undefined || m.id === null) return null; // notification
    const ok = (result: unknown) => ({ jsonrpc: "2.0", id: m.id, result });
    switch (m.method) {
      case "initialize": { const v = m.params?.protocolVersion; return ok({ protocolVersion: VERSIONS.includes(v) ? v : VERSIONS[1], capabilities: { tools: { listChanged: false }, prompts: { listChanged: false } }, serverInfo: { name: "gestion-locative", title: "Gestion locative", version: "1.0.0" },
        instructions: `Données de gestion locative de « ${d.espace || "l'espace"} » (propriétaire bailleur${d.sci ? ", " + d.sci : ""}), mises à jour le ${d.maj || "?"}. Montants en euros. ${c.ecriture ? "Tu peux aussi RANGER l'espace (créer logements, locataires, ajouter des documents en lien, des dépenses, des rappels) : montre toujours ton plan et attends l'accord de l'utilisateur avant d'écrire ; jamais de doublon ; tu ne peux ni supprimer ni envoyer de message." : "Lecture seule : pour modifier, l'utilisateur passe par l'appli https://sci-gestion-locative.com."} Commence par resume_du_mois.` }); }
      case "ping": return ok({});
      case "tools/list": return ok({ tools: c.ecriture ? [...OUTILS, ...OUTILS_ECRITURE] : OUTILS });
      case "tools/call": { const n = String(m.params?.name || ""), a = m.params?.arguments || {};
        if (OUTILS_ECRITURE.some(o => o.name === n)) { if (!c.ecriture) return ok({ isError: true, content: [{ type: "text", text: "Le propriétaire n'a pas autorisé Claude à ranger cet espace (appli › Réglages › Brancher sur Claude › « Autoriser Claude à ranger »)." }] });
          try { return ok(await ecrire(admin, c.espace_id, n, a, cx)); } catch (e: any) { return ok({ isError: true, content: [{ type: "text", text: "Impossible : " + (e?.message || e) }] }); } }
        const r = appeler(n, a, d); return r ? ok(r) : { jsonrpc: "2.0", id: m.id, error: { code: -32602, message: "Outil inconnu : " + n } }; }
      case "resources/list": return ok({ resources: [] });
      case "prompts/list": return ok({ prompts: c.ecriture ? [{ name: "ranger_mon_appli", title: "Ranger mon appli avec Claude", description: "Claude cherche tes documents, te propose un plan, puis crée et range tout dans l'appli." }] : [] });
      case "prompts/get": return m.params?.name === "ranger_mon_appli" && c.ecriture ? ok({ description: "Ranger mon appli avec Claude", messages: [{ role: "user", content: { type: "text", text: PROMPT_RANGER } }] }) : { jsonrpc: "2.0", id: m.id, error: { code: -32602, message: "Invite inconnue" } };
    }
    return { jsonrpc: "2.0", id: m.id, error: { code: -32601, message: "Méthode inconnue : " + m.method } };
  };
  const rep = Array.isArray(corps) ? (await Promise.all(corps.map(traiter))).filter(Boolean) : await traiter(corps);
  if (cx.modifie) await admin.from("connecteurs").update({ donnees: cx.d }).eq("jeton_hash", h);
  if (!rep || (Array.isArray(rep) && !rep.length)) return new Response(null, { status: 202, headers: CORS });
  if (!Array.isArray(corps) && (corps.method === "tools/call" || corps.method === "initialize")) await admin.from("connecteurs").update({ lu_le: new Date().toISOString() }).eq("jeton_hash", h);
  return json(rep);
});

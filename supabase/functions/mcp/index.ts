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
  const { data: c } = await admin.from("connecteurs").select("donnees").eq("jeton_hash", h).maybeSingle();
  if (!c) return json({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "Ce lien de connecteur n'est plus valable : recrée-le dans l'appli (Réglages › Brancher sur Claude)." } }, 404);
  let corps: any; try { corps = await req.json(); } catch (_) { return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "JSON illisible" } }, 400); }
  const d: any = c.donnees || {};
  const traiter = (m: any) => {
    if (!m || m.jsonrpc !== "2.0" || typeof m.method !== "string") return { jsonrpc: "2.0", id: m?.id ?? null, error: { code: -32600, message: "Requête invalide" } };
    if (m.id === undefined || m.id === null) return null; // notification
    const ok = (result: unknown) => ({ jsonrpc: "2.0", id: m.id, result });
    switch (m.method) {
      case "initialize": { const v = m.params?.protocolVersion; return ok({ protocolVersion: VERSIONS.includes(v) ? v : VERSIONS[1], capabilities: { tools: { listChanged: false } }, serverInfo: { name: "gestion-locative", title: "Gestion locative", version: "1.0.0" },
        instructions: `Données de gestion locative de « ${d.espace || "l'espace"} » (propriétaire bailleur${d.sci ? ", " + d.sci : ""}), mises à jour le ${d.maj || "?"}. Montants en euros. Lecture seule : pour modifier, l'utilisateur passe par l'appli https://sci-gestion-locative.com. Commence par resume_du_mois.` }); }
      case "ping": return ok({});
      case "tools/list": return ok({ tools: OUTILS });
      case "tools/call": { const r = appeler(String(m.params?.name || ""), m.params?.arguments || {}, d); return r ? ok(r) : { jsonrpc: "2.0", id: m.id, error: { code: -32602, message: "Outil inconnu : " + m.params?.name } }; }
      case "resources/list": return ok({ resources: [] });
      case "prompts/list": return ok({ prompts: [] });
    }
    return { jsonrpc: "2.0", id: m.id, error: { code: -32601, message: "Méthode inconnue : " + m.method } };
  };
  const rep = Array.isArray(corps) ? corps.map(traiter).filter(Boolean) : traiter(corps);
  if (!rep || (Array.isArray(rep) && !rep.length)) return new Response(null, { status: 202, headers: CORS });
  if (!Array.isArray(corps) && (corps.method === "tools/call" || corps.method === "initialize")) await admin.from("connecteurs").update({ lu_le: new Date().toISOString() }).eq("jeton_hash", h);
  return json(rep);
});

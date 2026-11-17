// L'IA de l'appli (Claude, Anthropic) : comprend l'organisation d'un Drive de propriétaire.
// Reçoit SEULEMENT les noms des dossiers (et quelques noms de fichiers par dossier), les logements et les locataires de l'espace.
// Rend des PROPOSITIONS (relier un dossier à un logement, logements à créer, anciens locataires, logements sans dossier) :
// l'appli les montre avec des cases à cocher, rien n'est appliqué sans la personne.
// Secret : ANTHROPIC_API_KEY. Crédits : IA_JOUR (2) et IA_MOIS (5) analyses par personne, IA_BUDGET_MOIS (3 $) pour toute l'appli,
// IA_SANS_LIMITE = adresses e-mail sans limite (séparées par des virgules). Coût Claude Opus 5.5 : 4 $ / 20 $ par million de jetons lus / écrits.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import Anthropic from "npm:@anthropic-ai/sdk@1.4.0";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const rep = (corps: unknown, statut = 200) => new Response(JSON.stringify(corps), { status: statut, headers: { ...CORS, "Content-Type": "application/json" } });
const court = (s: unknown, n = 120) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const NB_JOUR = () => +(Deno.env.get("IA_JOUR") || 2), NB_MOIS = () => +(Deno.env.get("IA_MOIS") || 5), BUDGET = () => Math.round(+(Deno.env.get("IA_BUDGET_MOIS") || 3) * 1e6);
const sansLimite = (email?: string) => (Deno.env.get("IA_SANS_LIMITE") || "").toLowerCase().split(",").map(x => x.trim()).filter(Boolean).includes(String(email || "").toLowerCase());
async function credits(admin: any, u: any) {
  const { data: e } = await admin.rpc("ia_etat", { u: u.id }), illimite = sansLimite(u.email);
  return { illimite, jour_restant: illimite ? 99 : Math.max(0, NB_JOUR() - e.jour), mois_restant: illimite ? 99 : Math.max(0, NB_MOIS() - e.mois), par_jour: NB_JOUR(), par_mois: NB_MOIS(), pause: !illimite && e.global_cout >= BUDGET() };
}
const TYPES = ["Appartement", "Studio", "Maison", "Parking", "Local commercial", "Autre"];

const SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["liens", "biens_a_creer", "anciens_locataires", "locataires_actuels", "biens_sans_dossier", "resume"],
  properties: {
    liens: { type: "array", items: { type: "object", additionalProperties: false, required: ["dossier", "bien_id", "raison"], properties: { dossier: { type: "string" }, bien_id: { type: "string" }, raison: { type: "string" } } } },
    biens_a_creer: { type: "array", items: { type: "object", additionalProperties: false, required: ["nom", "adresse", "type", "dossiers", "raison"], properties: { nom: { type: "string" }, adresse: { type: "string" }, type: { type: "string", enum: TYPES }, dossiers: { type: "array", items: { type: "string" } }, raison: { type: "string" } } } },
    anciens_locataires: { type: "array", items: { type: "object", additionalProperties: false, required: ["nom", "bien_id", "bien_a_creer", "raison"], properties: { nom: { type: "string" }, bien_id: { type: "string" }, bien_a_creer: { type: "string" }, raison: { type: "string" } } } },
    locataires_actuels: { type: "array", items: { type: "object", additionalProperties: false, required: ["nom", "bien_id", "bien_a_creer", "raison"], properties: { nom: { type: "string" }, bien_id: { type: "string" }, bien_a_creer: { type: "string" }, raison: { type: "string" } } } },
    biens_sans_dossier: { type: "array", items: { type: "object", additionalProperties: false, required: ["bien_id", "remarque"], properties: { bien_id: { type: "string" }, remarque: { type: "string" } } } },
    resume: { type: "string" },
  },
};

const CONSIGNE = `Tu aides un propriétaire (souvent une SCI familiale) à brancher son Google Drive sur son appli de gestion locative.
Tu reçois : les logements déjà dans l'appli (id, nom, adresse), les locataires déjà dans l'appli (actuels et anciens), et l'arborescence des dossiers partagés (id, chemin, nombre de fichiers, quelques noms de fichiers).
Propose, en français, ce qui permet de bien ranger les documents :
- liens : chaque dossier qui contient les documents d'UN SEUL logement existant (bail, état des lieux, DPE, factures de ce logement…). Mets le dossier le plus haut qui ne concerne que ce logement, pas ses sous-dossiers. Jamais un dossier général (compta, banque, statuts de la SCI…).
- biens_a_creer : les logements qui ont clairement leur dossier mais ne sont pas dans l'appli. Nom court et parlant, adresse si elle se lit dans les noms (sinon ""), et les ids de leurs dossiers. Ne crée pas un logement pour un dossier de compta, de banque, de travaux généraux ou d'archives sans logement précis. Un immeuble avec plusieurs lots = un logement par lot si les lots ont des dossiers séparés.
- anciens_locataires : personnes qui ont visiblement eu un bail terminé (dossier "ancien", bail ancien, état des lieux de sortie…) et qui ne sont pas déjà dans l'appli. bien_id si le logement existe, sinon bien_a_creer = le nom exact donné dans biens_a_creer, sinon les deux vides.
- locataires_actuels : personnes qui semblent louer en ce moment (bail récent, quittances récentes) et qui ne sont pas déjà dans l'appli. Même règle pour bien_id / bien_a_creer.
- biens_sans_dossier : logements de l'appli pour lesquels aucun dossier ne correspond (peut-être vendus, ou rangés ailleurs). Remarque courte, sans rien affirmer.
- resume : 1 à 3 phrases simples sur l'organisation du Drive.
Raisons : une phrase courte qui cite le nom du dossier ou du fichier. N'invente rien : en cas de doute, ne propose pas. Utilise uniquement les ids fournis.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const url = Deno.env.get("SUPABASE_URL")!, admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const jeton = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = await admin.auth.getUser(jeton);
    if (!u?.user) return rep({ erreur: "Connexion requise" }, 401);
    const c = await req.json().catch(() => ({}));
    if (!Deno.env.get("ANTHROPIC_API_KEY")) return rep({ erreur: "L'IA n'est pas encore installée sur le serveur." }, 400);
    if (c.action === "credits") return rep({ ok: true, ...(await credits(admin, u.user)) });
    const moi = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: "Bearer " + jeton } } });
    const { data: membre } = await moi.rpc("est_editeur", { e: c.espace });
    if (!membre) return rep({ erreur: "Accès refusé" }, 403);
    const illimite = sansLimite(u.user.email);
    const { data: ok } = await admin.rpc("ia_reserver", { u: u.user.id, max_jour: illimite ? 100000 : NB_JOUR(), max_mois: illimite ? 100000 : NB_MOIS(), budget: illimite ? 1e15 : BUDGET() });
    if (ok !== "ok") return rep({ erreur: ok === "jour" ? `Tu as utilisé tes ${NB_JOUR()} analyses d'aujourd'hui. Reviens demain.` : ok === "mois" ? `Tu as utilisé tes ${NB_MOIS()} analyses de ce mois-ci. Elles reviennent le 1er du mois.` : "L'IA est en pause pour tout le monde jusqu'au 1er du mois (budget de l'appli atteint).", raison: ok, credits: await credits(admin, u.user) }, 429);

    // Ce qu'on envoie à l'IA : des noms, rien d'autre (pas le contenu des documents)
    const biens = (c.biens || []).slice(0, 200).map((b: any) => ({ id: court(b.id, 40), nom: court(b.nom), adresse: court(b.adresse) }));
    const locs = (c.locataires || []).slice(0, 400).map((l: any) => ({ nom: court(l.nom, 80), bien_id: court(l.bienId, 40), statut: l.actif ? "actuel" : "ancien" }));
    const dossiers = (c.dossiers || []).slice(0, 400).map((d: any) => ({ id: court(d.id, 80), chemin: court(d.chemin, 300), fichiers: +d.n || 0, exemples: (d.exemples || []).slice(0, 10).map((x: string) => court(x, 100)) }));
    if (!dossiers.length) return rep({ erreur: "Aucun dossier à analyser." }, 400);

    const client = new Anthropic();
    const stream = client.beta.messages.stream({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      system: CONSIGNE,
      messages: [{ role: "user", content: JSON.stringify({ logements_de_l_appli: biens, locataires_de_l_appli: locs, dossiers_du_drive: dossiers }) }],
    } as any);
    let m: any;
    try { m = await stream.finalMessage(); } catch (e) { await admin.rpc("ia_rembourser", { u: u.user.id }); throw e; } // échec : l'analyse n'est pas comptée
    await admin.rpc("ia_cout", { u: u.user.id, c: (m.usage?.input_tokens || 0) * 4 + (m.usage?.output_tokens || 0) * 20 });
    if (m.stop_reason === "refusal") { await admin.rpc("ia_rembourser", { u: u.user.id }); return rep({ erreur: "L'IA n'a pas pu analyser ce Drive." }, 400); }
    const texte = (m.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    let res: any; try { res = JSON.parse(texte); } catch (_) { return rep({ erreur: "Réponse de l'IA illisible, réessaie." }, 400); }
    // On ne garde que des ids connus
    const idsB = new Set(biens.map((b: any) => b.id)), idsD = new Set(dossiers.map((d: any) => d.id));
    res.liens = (res.liens || []).filter((x: any) => idsB.has(x.bien_id) && idsD.has(x.dossier));
    res.biens_a_creer = (res.biens_a_creer || []).map((x: any) => ({ ...x, dossiers: (x.dossiers || []).filter((d: string) => idsD.has(d)) }));
    res.biens_sans_dossier = (res.biens_sans_dossier || []).filter((x: any) => idsB.has(x.bien_id));
    for (const k of ["anciens_locataires", "locataires_actuels"]) res[k] = (res[k] || []).map((x: any) => ({ ...x, bien_id: idsB.has(x.bien_id) ? x.bien_id : "" }));
    return rep({ ok: true, ...res, credits: await credits(admin, u.user), usage: { entree: m.usage?.input_tokens || 0, sortie: m.usage?.output_tokens || 0 } });
  } catch (e) {
    const msg = String((e as Error)?.message || e);
    return rep({ erreur: /credit|billing/i.test(msg) ? "Le crédit de l'IA est épuisé (console.anthropic.com › Billing)." : msg.slice(0, 200) }, 400);
  }
});

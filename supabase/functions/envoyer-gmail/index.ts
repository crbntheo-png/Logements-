// Envoie un e-mail depuis le Gmail de la personne connectée (mot de passe d'application rangé dans le coffre du serveur).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import nodemailer from "npm:nodemailer@6.9.14";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const rep = (corps: unknown, statut = 200) => new Response(JSON.stringify(corps), { status: statut, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const url = Deno.env.get("SUPABASE_URL")!, admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const jeton = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = await admin.auth.getUser(jeton);
    if (!u?.user) return rep({ erreur: "Connexion requise" }, 401);
    const moi = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: "Bearer " + jeton } } });
    const c = await req.json();
    let adresse = c.adresse, mdp = c.mdp;
    if (c.action !== "tester") {
      const { data: s, error } = await admin.rpc("gmail_secret", { u: u.user.id });
      if (error || !s?.mdp) return rep({ erreur: "Gmail pas branché" }, 400);
      adresse = s.adresse; mdp = s.mdp;
    }
    const tr = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: adresse, pass: String(mdp || "").replace(/\s+/g, "") } });
    if (c.action === "tester") { await tr.verify(); return rep({ ok: true }); }
    const { data: membre } = await moi.rpc("est_editeur", { e: c.espace });
    if (!membre) return rep({ erreur: "Accès refusé" }, 403);
    const a = (c.a || []).filter((x: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x));
    if (!a.length) return rep({ erreur: "Destinataire manquant" }, 400);
    const info = await tr.sendMail({
      from: c.nom ? `"${String(c.nom).replace(/"/g, "")}" <${adresse}>` : adresse, to: a.join(", "), subject: c.objet || "", text: c.texte || "",
      attachments: c.pdf_base64 ? [{ filename: c.nom_fichier || "document.pdf", content: c.pdf_base64, encoding: "base64", contentType: "application/pdf" }] : [],
    });
    await admin.from("envois").insert({ espace_id: c.espace, par: u.user.id, destinataires: a, objet: c.objet, requete_id: null });
    return rep({ ok: true, id: info.messageId });
  } catch (e) {
    const m = String((e as Error)?.message || e);
    return rep({ erreur: /Invalid login|Username and Password|535/i.test(m) ? "Gmail refuse l'adresse ou le mot de passe d'application" : m.slice(0, 200) }, 400);
  }
});

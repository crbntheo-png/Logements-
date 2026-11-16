// Envoie un e-mail depuis le Gmail de la personne connectée.
// Connexion Google "envoi seulement" (gmail.send) : l'appli peut envoyer, jamais lire les e-mails.
// La clé de renouvellement Google est rangée dans le coffre du serveur (gmailg_<user>), jamais visible par l'appli.
// Ancienne méthode (mot de passe d'application, gmail_<user>) : encore acceptée pour les comptes branchés avant, le temps qu'ils passent à Google.
// Secrets : GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (les mêmes que pour le Drive).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import nodemailer from "npm:nodemailer@6.9.14";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const rep = (corps: unknown, statut = 200) => new Response(JSON.stringify(corps), { status: statut, headers: { ...CORS, "Content-Type": "application/json" } });
const ID = () => Deno.env.get("GOOGLE_CLIENT_ID") || "", SECRET = () => Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
const SCOPE_ENVOI = "https://www.googleapis.com/auth/gmail.send";

async function google(params: Record<string, string>) {
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: ID(), client_secret: SECRET(), ...params }) });
  return { ok: r.ok, j: await r.json().catch(() => ({})) };
}
// Texte en UTF-8 dans un en-tête (accents)
const enTete = (s: string) => /^[\x20-\x7e]*$/.test(s) ? s : "=?UTF-8?B?" + b64(new TextEncoder().encode(s)) + "?=";
function b64(u8: Uint8Array) { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); }
const lignes76 = (s: string) => s.replace(/.{1,76}/g, "$&\r\n");
function mime(de: string, a: string[], objet: string, texte: string, pj?: { nom: string; b64: string; type?: string }) {
  const f = "f" + crypto.randomUUID().replace(/-/g, "");
  const corps = lignes76(b64(new TextEncoder().encode(texte || "")));
  const tete = [`From: ${de}`, `To: ${a.join(", ")}`, `Subject: ${enTete(objet || "")}`, "MIME-Version: 1.0"];
  const msg = !pj ? [...tete, 'Content-Type: text/plain; charset="UTF-8"', "Content-Transfer-Encoding: base64", "", corps].join("\r\n")
    : [...tete, `Content-Type: multipart/mixed; boundary="${f}"`, "", `--${f}`, 'Content-Type: text/plain; charset="UTF-8"', "Content-Transfer-Encoding: base64", "", corps,
      `--${f}`, `Content-Type: ${pj.type || "application/pdf"}; name="${enTete(pj.nom)}"`, `Content-Disposition: attachment; filename="${enTete(pj.nom)}"`, "Content-Transfer-Encoding: base64", "", lignes76(pj.b64.replace(/\s+/g, "")), `--${f}--`, ""].join("\r\n");
  return b64(new TextEncoder().encode(msg)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const url = Deno.env.get("SUPABASE_URL")!, admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const jeton = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = await admin.auth.getUser(jeton);
    if (!u?.user) return rep({ erreur: "Connexion requise" }, 401);
    const c = await req.json().catch(() => ({}));

    if (c.action === "config") return rep({ client_id: ID(), pret: !!(ID() && SECRET()), scope: "openid email " + SCOPE_ENVOI });

    if (c.action === "brancher_google") {
      if (!ID() || !SECRET()) return rep({ erreur: "La connexion Google n'est pas installée sur le serveur." }, 400);
      const { ok, j } = await google({ code: String(c.code || ""), grant_type: "authorization_code", redirect_uri: "postmessage" });
      if (!ok || !j.access_token) return rep({ erreur: "Google a refusé la connexion (" + (j.error_description || j.error || "inconnu") + ")" }, 400);
      if (!String(j.scope || "").includes("gmail.send")) return rep({ erreur: "Il faut cocher \"Envoyer des e-mails\" sur l'écran de Google." }, 400);
      if (!j.refresh_token) return rep({ erreur: "Google n'a pas donné l'accès durable. Réessaie." }, 400);
      let adresse = "";
      try { const p = await (await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: "Bearer " + j.access_token } })).json(); adresse = p.email || ""; } catch (_) { /* pas grave */ }
      const { error } = await admin.rpc("gmail_google_enregistrer", { u: u.user.id, adresse, rt: j.refresh_token });
      if (error) return rep({ erreur: error.message }, 400);
      return rep({ ok: true, adresse });
    }

    const { data: s } = await admin.rpc("gmail_secret", { u: u.user.id });

    if (c.action === "debrancher") {
      // Retirer l'accès chez Google retire toute l'autorisation de l'appli (Drive compris) : seulement si le Drive n'est pas branché
      const { data: dr } = await admin.from("drive_comptes").select("user_id").eq("user_id", u.user.id).maybeSingle();
      if (s?.rt && !dr) await fetch("https://oauth2.googleapis.com/revoke?token=" + encodeURIComponent(s.rt), { method: "POST" }).catch(() => {});
      await admin.rpc("gmail_oublier", { u: u.user.id });
      return rep({ ok: true });
    }

    if (!s || (!s.rt && !s.mdp)) return rep({ erreur: "Gmail pas branché" }, 400);
    const moi = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: "Bearer " + jeton } } });
    const { data: membre } = await moi.rpc("est_editeur", { e: c.espace });
    if (!membre) return rep({ erreur: "Accès refusé" }, 403);
    const a = (c.a || []).filter((x: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x));
    if (!a.length) return rep({ erreur: "Destinataire manquant" }, 400);
    const de = c.nom ? `${enTete(String(c.nom).replace(/["\r\n]/g, ""))} <${s.adresse}>` : s.adresse;
    const typePj = /^[\w.+-]+\/[\w.+-]+$/.test(String(c.type_fichier || "")) ? String(c.type_fichier) : "application/pdf";
    let id = "";
    if (s.rt) {
      const { ok, j } = await google({ refresh_token: s.rt, grant_type: "refresh_token" });
      if (!ok || !j.access_token) return rep({ erreur: j.error === "invalid_grant" ? "La connexion à ton Gmail s'est arrêtée : rebranche-la (Réglages › Envoi des e-mails)." : "Google ne répond pas, réessaie." }, 400);
      const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", { method: "POST", headers: { Authorization: "Bearer " + j.access_token, "Content-Type": "application/json" },
        body: JSON.stringify({ raw: mime(de, a, c.objet || "", c.texte || "", c.pdf_base64 ? { nom: c.nom_fichier || "document.pdf", b64: c.pdf_base64, type: typePj } : undefined) }) });
      const jr = await r.json().catch(() => ({}));
      if (!r.ok) return rep({ erreur: "Gmail a refusé l'envoi (" + (jr?.error?.message || r.status) + ")" }, 400);
      id = jr.id || "";
    } else {
      const tr = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: s.adresse, pass: String(s.mdp || "").replace(/\s+/g, "") } });
      const info = await tr.sendMail({ from: c.nom ? `"${String(c.nom).replace(/"/g, "")}" <${s.adresse}>` : s.adresse, to: a.join(", "), subject: c.objet || "", text: c.texte || "",
        attachments: c.pdf_base64 ? [{ filename: c.nom_fichier || "document.pdf", content: c.pdf_base64, encoding: "base64", contentType: typePj }] : [] });
      id = info.messageId;
    }
    await admin.from("envois").insert({ espace_id: c.espace, par: u.user.id, destinataires: a, objet: c.objet, requete_id: null });
    return rep({ ok: true, id });
  } catch (e) {
    const m = String((e as Error)?.message || e);
    return rep({ erreur: /Invalid login|Username and Password|535/i.test(m) ? "Gmail refuse l'ancien mot de passe d'application : rebranche ton Gmail avec Google." : m.slice(0, 200) }, 400);
  }
});

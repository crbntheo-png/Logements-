// Connexion Google Drive en lecture seule, gardée sur le serveur.
// L'appli n'a jamais la clé de renouvellement : elle demande ici un jeton valable 1 heure, puis lit le Drive elle-même.
// Secrets : GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const rep = (corps: unknown, statut = 200) => new Response(JSON.stringify(corps), { status: statut, headers: { ...CORS, "Content-Type": "application/json" } });
const ID = () => Deno.env.get("GOOGLE_CLIENT_ID") || "", SECRET = () => Deno.env.get("GOOGLE_CLIENT_SECRET") || "";

async function google(params: Record<string, string>) {
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: ID(), client_secret: SECRET(), ...params }) });
  return { ok: r.ok, j: await r.json().catch(() => ({})) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const url = Deno.env.get("SUPABASE_URL")!, admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const jeton = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = await admin.auth.getUser(jeton);
    if (!u?.user) return rep({ erreur: "Connexion requise" }, 401);
    const moi = u.user.id, c = await req.json().catch(() => ({}));
    if (c.action === "config") return rep({ client_id: ID(), pret: !!(ID() && SECRET()) });
    if (!ID() || !SECRET()) return rep({ erreur: "La connexion Google Drive n'est pas encore installée sur le serveur." }, 400);

    if (c.action === "brancher") {
      const { ok, j } = await google({ code: String(c.code || ""), grant_type: "authorization_code", redirect_uri: "postmessage" });
      if (!ok || !j.access_token) return rep({ erreur: "Google a refusé la connexion (" + (j.error_description || j.error || "inconnu") + ")" }, 400);
      if (!String(j.scope || "").includes("drive")) return rep({ erreur: "Il faut cocher l'accès au Drive sur l'écran de Google." }, 400);
      let adresse = "";
      try { const p = await (await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: "Bearer " + j.access_token } })).json(); adresse = p.email || ""; } catch (_) { /* pas grave */ }
      await admin.rpc("drive_enregistrer", { u: moi, adresse, rt: j.refresh_token || "" });
      return rep({ ok: true, adresse, access_token: j.access_token, expires_in: j.expires_in || 3600 });
    }

    if (c.action === "jeton") {
      const { data: rt } = await admin.rpc("drive_secret", { u: moi });
      if (!rt) return rep({ erreur: "reconnecter" }, 400);
      const { ok, j } = await google({ refresh_token: rt, grant_type: "refresh_token" });
      if (!ok || !j.access_token) {
        if (j.error === "invalid_grant") await admin.rpc("drive_oublier", { u: moi });
        return rep({ erreur: "reconnecter" }, 400);
      }
      return rep({ ok: true, access_token: j.access_token, expires_in: j.expires_in || 3600 });
    }

    if (c.action === "debrancher") {
      const { data: rt } = await admin.rpc("drive_secret", { u: moi });
      if (rt) await fetch("https://oauth2.googleapis.com/revoke?token=" + encodeURIComponent(rt), { method: "POST" }).catch(() => {});
      await admin.rpc("drive_oublier", { u: moi });
      return rep({ ok: true });
    }
    return rep({ erreur: "Action inconnue" }, 400);
  } catch (e) {
    return rep({ erreur: String((e as Error)?.message || e).slice(0, 200) }, 400);
  }
});

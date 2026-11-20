// Connexion Google Drive gardée sur le serveur. L'appli n'a jamais la clé de renouvellement : elle demande ici un jeton valable 1 heure, puis lit le Drive elle-même.
// Deux façons :
//  - "choix"   : droit drive.file (projet Google principal) : seulement les fichiers touchés dans le sélecteur de Google ;
//  - "complet" : droit drive.readonly (second projet Google, réservé au Drive) : lecture seule, l'appli lit le contenu des dossiers choisis, sous-dossiers compris.
// Secrets : GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET ; GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET (projet Drive).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const rep = (corps: unknown, statut = 200) => new Response(JSON.stringify(corps), { status: statut, headers: { ...CORS, "Content-Type": "application/json" } });
const ID = () => Deno.env.get("GOOGLE_CLIENT_ID") || "", SECRET = () => Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
const ID2 = () => Deno.env.get("GOOGLE_DRIVE_CLIENT_ID") || "", SECRET2 = () => Deno.env.get("GOOGLE_DRIVE_CLIENT_SECRET") || "";
const cles = (mode: string) => mode === "complet" ? { client_id: ID2(), client_secret: SECRET2() } : { client_id: ID(), client_secret: SECRET() };

async function google(params: Record<string, string>, mode = "choix") {
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ ...cles(mode), ...params }) });
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
    if (c.action === "config") return rep({ client_id: ID(), pret: !!(ID() && SECRET()), client_id_complet: ID2(), complet: !!(ID2() && SECRET2()) });
    if (!ID() || !SECRET()) return rep({ erreur: "La connexion Google Drive n'est pas encore installée sur le serveur." }, 400);

    if (c.action === "brancher") {
      const mode = c.mode === "complet" && ID2() && SECRET2() ? "complet" : "choix";
      const { ok, j } = await google({ code: String(c.code || ""), grant_type: "authorization_code", redirect_uri: "postmessage" }, mode);
      if (!ok || !j.access_token) return rep({ erreur: "Google a refusé la connexion (" + (j.error_description || j.error || "inconnu") + ")" }, 400);
      if (!String(j.scope || "").includes("drive")) return rep({ erreur: "Il faut cocher l'accès au Drive sur l'écran de Google." }, 400);
      let adresse = "";
      try { const p = await (await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: "Bearer " + j.access_token } })).json(); adresse = p.email || ""; } catch (_) { /* pas grave */ }
      if (mode === "complet" && !String(j.scope || "").includes("drive.readonly")) return rep({ erreur: "Il faut cocher la lecture de ton Drive sur l'écran de Google." }, 400);
      if (mode === "complet" && !j.refresh_token) return rep({ erreur: "Google n'a pas donné l'accès durable. Réessaie." }, 400);
      // Ancienne connexion d'un autre type : on la retire chez Google avant de la remplacer
      const { data: avant } = await admin.from("drive_comptes").select("mode").eq("user_id", moi).maybeSingle();
      if (avant && avant.mode !== mode && avant.mode === "complet") { const { data: vieux } = await admin.rpc("drive_secret", { u: moi }); if (vieux) await fetch("https://oauth2.googleapis.com/revoke?token=" + encodeURIComponent(vieux), { method: "POST" }).catch(() => {}); }
      await admin.rpc("drive_enregistrer", { u: moi, adresse, rt: j.refresh_token || "" });
      await admin.from("drive_comptes").update({ mode }).eq("user_id", moi);
      return rep({ ok: true, adresse, mode, access_token: j.access_token, expires_in: j.expires_in || 3600, scope: j.scope || "" });
    }

    if (c.action === "jeton") {
      const { data: rt } = await admin.rpc("drive_secret", { u: moi });
      if (!rt) return rep({ erreur: "reconnecter" }, 400);
      const { data: cpt } = await admin.from("drive_comptes").select("mode").eq("user_id", moi).maybeSingle(), mode = cpt?.mode || "choix";
      const { ok, j } = await google({ refresh_token: rt, grant_type: "refresh_token" }, mode);
      if (!ok || !j.access_token) {
        if (j.error === "invalid_grant") await admin.rpc("drive_oublier", { u: moi });
        return rep({ erreur: "reconnecter" }, 400);
      }
      return rep({ ok: true, access_token: j.access_token, expires_in: j.expires_in || 3600, scope: j.scope || "", mode });
    }

    if (c.action === "debrancher") {
      const { data: rt } = await admin.rpc("drive_secret", { u: moi });
      // Retirer l'accès chez Google retire toute l'autorisation de l'appli (Gmail compris) : seulement si Gmail n'est pas branché avec Google
      const { data: gm } = await admin.from("gmail_comptes").select("mode").eq("user_id", moi).maybeSingle();
      const { data: cpt } = await admin.from("drive_comptes").select("mode").eq("user_id", moi).maybeSingle();
      if (rt && (cpt?.mode === "complet" || gm?.mode !== "google")) /* projet Drive à part : le retirer ne touche pas à Gmail */ await fetch("https://oauth2.googleapis.com/revoke?token=" + encodeURIComponent(rt), { method: "POST" }).catch(() => {});
      await admin.rpc("drive_oublier", { u: moi });
      return rep({ ok: true });
    }
    return rep({ erreur: "Action inconnue" }, 400);
  } catch (e) {
    return rep({ erreur: String((e as Error)?.message || e).slice(0, 200) }, 400);
  }
});

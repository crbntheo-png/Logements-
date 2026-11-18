// Dossiers Drive PARTAGÉS avec l'appli (comme avec un associé, en "Lecteur").
// Pas d'écran Google, pas d'accès au reste du Drive : l'appli (un "compte de service" Google) ne voit que ce qu'on lui partage.
// Chaque personne ne reçoit que les dossiers qu'ELLE a partagés (vérifié par l'adresse de la personne qui a partagé).
// Secret : GOOGLE_PARTAGE_SA (le fichier .json de la clé du compte de service).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const rep = (corps: unknown, statut = 200) => new Response(JSON.stringify(corps), { status: statut, headers: { ...CORS, "Content-Type": "application/json" } });
const DOSSIER = "application/vnd.google-apps.folder";
const API = "https://www.googleapis.com/drive/v3/files";

function sa() { try { return JSON.parse(Deno.env.get("GOOGLE_PARTAGE_SA") || ""); } catch (_) { return null; } }
const b64u = (b: Uint8Array | string) => btoa(typeof b === "string" ? b : String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
let JETON: { t: string; exp: number } | null = null;
async function jetonAppli(): Promise<string> {
  if (JETON && Date.now() < JETON.exp - 60000) return JETON.t;
  const c = sa(); if (!c) throw new Error("Le partage de dossiers n'est pas encore installé sur le serveur.");
  const pem = String(c.private_key).replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const cle = await crypto.subtle.importKey("pkcs8", Uint8Array.from(atob(pem), x => x.charCodeAt(0)), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const corps = b64u(JSON.stringify({ alg: "RS256", typ: "JWT" })) + "." + b64u(JSON.stringify({ iss: c.client_email, scope: "https://www.googleapis.com/auth/drive.readonly", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cle, new TextEncoder().encode(corps)));
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: corps + "." + b64u(sig) }) });
  const j = await r.json().catch(() => ({}));
  if (!j.access_token) throw new Error("Google refuse la clé de l'appli (" + (j.error_description || j.error || r.status) + ")");
  JETON = { t: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return JETON.t;
}
async function liste(q: string, champs: string) {
  const out: any[] = []; let page = "";
  for (let i = 0; i < 20; i++) {
    const u = API + "?" + new URLSearchParams({ q, pageSize: "1000", fields: "nextPageToken,files(" + champs + ")", supportsAllDrives: "true", includeItemsFromAllDrives: "true", ...(page ? { pageToken: page } : {}) });
    const r = await fetch(u, { headers: { Authorization: "Bearer " + await jetonAppli() } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j.error && j.error.message) || "Google Drive ne répond pas");
    out.push(...(j.files || [])); page = j.nextPageToken || ""; if (!page) break;
  }
  return out;
}
// Ce que la personne a partagé avec l'appli (dossiers et fichiers), reconnu à son adresse Google
async function racinesDe(adresses: Set<string>) {
  const L = await liste("sharedWithMe and trashed = false", "id,name,mimeType,webViewLink,modifiedTime,size,sharingUser(emailAddress),owners(emailAddress)");
  return L.filter(f => [f.sharingUser?.emailAddress, ...(f.owners || []).map((o: any) => o.emailAddress)].some(a => a && adresses.has(String(a).toLowerCase())));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const url = Deno.env.get("SUPABASE_URL")!, admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const jeton = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = await admin.auth.getUser(jeton);
    if (!u?.user) return rep({ erreur: "Connexion requise" }, 401);
    const c = await req.json().catch(() => ({}));
    const cfg = sa();
    if (c.action === "config") return rep({ pret: !!cfg, adresse: cfg?.client_email || "" });
    if (!cfg) return rep({ erreur: "Le partage de dossiers n'est pas encore installé sur le serveur." }, 400);

    // Les adresses Google de la personne : connexion, identités Google, Drive et Gmail branchés
    const adresses = new Set<string>([u.user.email, ...(u.user.identities || []).map((i: any) => i.identity_data?.email)].filter(Boolean).map((x: string) => x.toLowerCase()));
    const [{ data: dr }, { data: gm }] = await Promise.all([admin.from("drive_comptes").select("adresse").eq("user_id", u.user.id).maybeSingle(), admin.from("gmail_comptes").select("adresse").eq("user_id", u.user.id).maybeSingle()]);
    [dr?.adresse, gm?.adresse].filter(Boolean).forEach(a => adresses.add(String(a).toLowerCase()));

    if (c.action === "lister") {
      const racines = await racinesDe(adresses);
      const dossiers: Record<string, any> = {}, fichiers: any[] = [], vus = new Set<string>();
      const file: any[] = [];
      racines.forEach(r => {
        vus.add(r.id);
        if (r.mimeType === DOSSIER) { dossiers[r.id] = { titre: r.name, chemin: [r.name], ancetres: [], racine: true, lien: r.webViewLink }; file.push({ id: r.id, racine: r.id, chemin: [r.name], ancetres: [r.id] }); }
        else fichiers.push({ id: r.id, titre: r.name, type: r.mimeType, lien: r.webViewLink, modif: r.modifiedTime, taille: +r.size || 0, chemin: [], ancetres: [], racine: "", partage: true });
      });
      const debut = Date.now();
      // toute la profondeur : jusqu'à 2 000 dossiers, 10 lus en même temps
      while (file.length && Object.keys(dossiers).length < 2000 && Date.now() - debut < 110000) {
        const lot = file.splice(0, 10);
        await Promise.all(lot.map(async f => {
          const L = await liste(`'${f.id}' in parents and trashed = false`, "id,name,mimeType,webViewLink,modifiedTime,size");
          L.forEach(x => {
            if (vus.has(x.id)) return; vus.add(x.id);
            if (x.mimeType === DOSSIER) { dossiers[x.id] = { titre: x.name, chemin: f.chemin.concat(x.name), lien: x.webViewLink, ancetres: f.ancetres }; file.push({ id: x.id, racine: f.racine, chemin: f.chemin.concat(x.name), ancetres: f.ancetres.concat(x.id) }); }
            else fichiers.push({ id: x.id, titre: x.name, type: x.mimeType, lien: x.webViewLink, modif: x.modifiedTime, taille: +x.size || 0, chemin: f.chemin, parent: f.id, ancetres: f.ancetres, racine: f.racine, partage: true });
          });
        }));
      }
      return rep({ ok: true, adresse: cfg.client_email, racines: racines.map(r => ({ id: r.id, nom: r.name, dossier: r.mimeType === DOSSIER })), dossiers, fichiers, incomplet: file.length > 0 });
    }

    if (c.action === "fichier") {
      // On remonte les dossiers parents jusqu'à un dossier partagé par CETTE personne, sinon refus
      const id = String(c.id || ""); if (!/^[-\w]{10,}$/.test(id)) return rep({ erreur: "Fichier inconnu" }, 400);
      const ids = new Set((await racinesDe(adresses)).map(r => r.id));
      const meta = async (x: string) => (await (await fetch(`${API}/${x}?fields=id,name,mimeType,parents&supportsAllDrives=true`, { headers: { Authorization: "Bearer " + await jetonAppli() } })).json());
      const m = await meta(id); if (!m.id) return rep({ erreur: "Fichier introuvable" }, 404);
      let ok = ids.has(id), courant = (m.parents || [])[0], n = 0;
      while (!ok && courant && n++ < 25) { if (ids.has(courant)) ok = true; else courant = ((await meta(courant)).parents || [])[0]; }
      if (!ok) return rep({ erreur: "Ce fichier n'est pas dans un dossier que tu as partagé avec l'appli." }, 403);
      const natif = /^application\/vnd\.google-apps\./.test(m.mimeType);
      const r = await fetch(natif ? `${API}/${id}/export?mimeType=application/pdf` : `${API}/${id}?alt=media&supportsAllDrives=true`, { headers: { Authorization: "Bearer " + await jetonAppli() } });
      if (!r.ok) return rep({ erreur: "Google Drive refuse ce fichier (" + r.status + ")" }, 400);
      return new Response(r.body, { headers: { ...CORS, "Content-Type": natif ? "application/pdf" : (r.headers.get("Content-Type") || "application/octet-stream") } });
    }
    return rep({ erreur: "Action inconnue" }, 400);
  } catch (e) {
    return rep({ erreur: String((e as Error)?.message || e).slice(0, 200) }, 400);
  }
});

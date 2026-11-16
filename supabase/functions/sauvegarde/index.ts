// Copie de sauvegarde par e-mail, envoyée depuis le Gmail branché du propriétaire, à lui-même : même contenu que "Télécharger une sauvegarde" (exportJSON).
// Appelée chaque lundi par la tâche planifiée « sauvegarde » (en-tête x-cle-cron), ou par le propriétaire connecté pour "Envoyer maintenant".
// Le fichier part en .json.txt (même contenu JSON), que l'appli sait rouvrir.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cle-cron", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const rep = (c: unknown, s = 200) => new Response(JSON.stringify(c), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const COLLS = ["biens", "baux", "paiements", "depenses", "relances", "rappels", "taxes", "edl", "fichiers", "prets"];
const slug = (s: string) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
const b64 = (t: string) => { const o = new TextEncoder().encode(t); let s = ""; for (let i = 0; i < o.length; i += 0x8000) s += String.fromCharCode(...o.subarray(i, i + 0x8000)); return btoa(s); };

// ---- Envoi depuis le Gmail branché de la personne (droit "envoyer" seulement). Aucun envoi par un serveur commun. ----
const enTete = (s: string) => /^[\x20-\x7e]*$/.test(s) ? s : "=?UTF-8?B?" + b64u8(new TextEncoder().encode(s)) + "?=";
function b64u8(u8: Uint8Array) { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); }
const l76 = (s: string) => s.replace(/.{1,76}/g, "$&\r\n");
async function envoyerParGmail(admin: any, userId: string, a: string[], objet: string, texte: string, pj?: { nom: string; b64: string; type: string }) {
  const { data: s } = await admin.rpc("gmail_secret", { u: userId });
  if (!s?.rt) throw new Error("Gmail pas branché avec Google (Réglages › Envoi des e-mails)");
  const t = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: Deno.env.get("GOOGLE_CLIENT_ID") || "", client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") || "", refresh_token: s.rt, grant_type: "refresh_token" }) });
  const j = await t.json().catch(() => ({}));
  if (!t.ok || !j.access_token) throw new Error("connexion Gmail arrêtée : rebranche-la");
  const f = "f" + crypto.randomUUID().replace(/-/g, ""), corps = l76(b64u8(new TextEncoder().encode(texte)));
  const tete = [`From: ${enTete("Gestion locative")} <${s.adresse}>`, `To: ${a.join(", ")}`, `Subject: ${enTete(objet)}`, "MIME-Version: 1.0"];
  const msg = !pj ? [...tete, 'Content-Type: text/plain; charset="UTF-8"', "Content-Transfer-Encoding: base64", "", corps].join("\r\n")
    : [...tete, `Content-Type: multipart/mixed; boundary="${f}"`, "", `--${f}`, 'Content-Type: text/plain; charset="UTF-8"', "Content-Transfer-Encoding: base64", "", corps,
      `--${f}`, `Content-Type: ${pj.type}; name="${enTete(pj.nom)}"`, `Content-Disposition: attachment; filename="${enTete(pj.nom)}"`, "Content-Transfer-Encoding: base64", "", l76(pj.b64), `--${f}--`, ""].join("\r\n");
  const raw = b64u8(new TextEncoder().encode(msg)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", { method: "POST", headers: { Authorization: "Bearer " + j.access_token, "Content-Type": "application/json" }, body: JSON.stringify({ raw }) });
  if (!r.ok) throw new Error("Gmail a refusé l'envoi (" + ((await r.json().catch(() => ({})))?.error?.message || r.status) + ")");
}

async function envoyer(admin: any, espace: string, userId: string, apercu = false) {
  const { data: m } = await admin.from("membres").select("role").eq("espace_id", espace).eq("user_id", userId).maybeSingle();
  if (!m || m.role !== "proprietaire") throw new Error("plus propriétaire de l'espace");
  const { data: u } = await admin.auth.admin.getUserById(userId); const dest = u?.user?.email;
  if (!dest) throw new Error("adresse e-mail introuvable");
  const lignes: any[] = [];
  for (let de = 0; ; de += 1000) { const r = await admin.from("docs").select("coll, doc_id, data").eq("espace_id", espace).range(de, de + 999); if (r.error) throw r.error; lignes.push(...r.data); if (r.data.length < 1000) break; }
  const S: any = {}; COLLS.forEach(c => S[c] = []);
  lignes.forEach(l => { if (l.coll === "meta") Object.assign(S, l.data); else (S[l.coll] = S[l.coll] || []).push(l.data); });
  const { data: esp } = await admin.from("espaces").select("nom").eq("id", espace).maybeSingle();
  const nom = (S.sci && S.sci.nom) || esp?.nom || "espace", jour = new Date().toISOString().slice(0, 10);
  const texte = JSON.stringify(S, null, 1), fichier = `sauvegarde-${slug(nom)}-${jour}.json.txt`;
  if (apercu) return { dest, taille: texte.length, fichier, logements: S.biens.length, locataires: S.baux.length, documents: S.fichiers.length };
  await envoyerParGmail(admin, userId, [dest], `Copie de sauvegarde · ${nom} · ${jour}`,
    `Bonjour,\n\nVoici la copie de sauvegarde de la semaine de "${nom}" (${S.biens.length} logement(s), ${S.baux.length} locataire(s), ${S.fichiers.length} document(s) rangé(s)).\n\nGarde ce mail. Pour la rouvrir : appli > Réglages > Sauvegarde et import > Ouvrir une sauvegarde, puis choisis ce fichier.\n\nTu reçois ce mail parce que tu as activé "M'envoyer une copie chaque semaine" (Réglages > Sauvegarde et import). Tu peux l'arrêter au même endroit.\n\nGestion locative`, { nom: fichier, b64: b64(texte), type: "text/plain" });
  await admin.from("sauvegarde_hebdo").update({ derniere: new Date().toISOString(), erreur: null }).eq("espace_id", espace);
  return { dest, taille: texte.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = Deno.env.get("SUPABASE_URL")!, admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let corps: any = {}; try { corps = await req.json(); } catch (_) { corps = {}; }
  try {
    if (req.headers.get("x-cle-cron") && req.headers.get("x-cle-cron") === Deno.env.get("CLE_CRON_NOTIFIER")) {
      const { data: L } = await admin.from("sauvegarde_hebdo").select("espace_id, user_id").eq("active", true);
      let n = 0;
      for (const x of L || []) { try { await envoyer(admin, x.espace_id, x.user_id); n++; } catch (e) { await admin.from("sauvegarde_hebdo").update({ erreur: String((e as Error).message || e).slice(0, 200) }).eq("espace_id", x.espace_id); } }
      return rep({ ok: true, envoyees: n });
    }
    // "Envoyer maintenant" : le propriétaire connecté, pour son espace
    const jeton = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = await admin.auth.getUser(jeton);
    if (!u?.user) return rep({ erreur: "Connexion requise" }, 401);
    if (!corps.espace) return rep({ erreur: "Espace manquant" }, 400);
    const r = await envoyer(admin, corps.espace, u.user.id, corps.apercu === true);
    return rep({ ok: true, ...r });
  } catch (e) { return rep({ erreur: String((e as Error).message || e).slice(0, 200) }, 400); }
});

// Copie de sauvegarde par e-mail (Brevo) au propriétaire de l'espace : même contenu que "Télécharger une sauvegarde" (exportJSON).
// Appelée chaque lundi par la tâche planifiée « sauvegarde » (en-tête x-cle-cron), ou par le propriétaire connecté pour "Envoyer maintenant".
// Brevo refuse les pièces jointes .json : le fichier part en .txt (même contenu JSON), que l'appli sait rouvrir.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cle-cron", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const rep = (c: unknown, s = 200) => new Response(JSON.stringify(c), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const COLLS = ["biens", "baux", "paiements", "depenses", "relances", "rappels", "taxes", "edl", "fichiers"];
const slug = (s: string) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
const b64 = (t: string) => { const o = new TextEncoder().encode(t); let s = ""; for (let i = 0; i < o.length; i += 0x8000) s += String.fromCharCode(...o.subarray(i, i + 0x8000)); return btoa(s); };

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
  const r = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "api-key": Deno.env.get("BREVO_API_KEY")!, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ sender: { name: "Gestion locative", email: Deno.env.get("BREVO_SENDER") }, to: [{ email: dest }], subject: `Copie de sauvegarde · ${nom} · ${jour}`,
      textContent: `Bonjour,\n\nVoici la copie de sauvegarde de la semaine de "${nom}" (${S.biens.length} logement(s), ${S.baux.length} locataire(s), ${S.fichiers.length} document(s) rangé(s)).\n\nGarde ce mail. Pour la rouvrir : appli > Réglages > Sauvegarde et import > Ouvrir une sauvegarde, puis choisis ce fichier.\n\nTu reçois ce mail parce que tu as activé "M'envoyer une copie chaque semaine" (Réglages > Sauvegarde et import). Tu peux l'arrêter au même endroit.\n\nGestion locative`,
      attachment: [{ name: fichier, content: b64(texte) }] }) });
  if (!r.ok) throw new Error("Brevo : " + (await r.text()).slice(0, 200));
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

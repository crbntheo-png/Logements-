// Candidature en ligne : le candidat ouvre https://sci-gestion-locative.com/#candidature=JETON, sans compte.
// Actions : "voir" (l'annonce publiée par le propriétaire) et "deposer" (son dossier, avec les pièces autorisées par la loi).
// Le jeton n'est jamais gardé en clair. Le candidat ne voit rien d'autre de l'espace, ni les autres candidatures.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const rep = (c: unknown, s = 200) => new Response(JSON.stringify(c), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const empreinte = async (t: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)))).map(b => b.toString(16).padStart(2, "0")).join("");
const TXT = (v: unknown, n: number) => String(v ?? "").replace(/[\u0000-\u0008\u000b-\u001f]/g, "").trim().slice(0, n);
const TYPES: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" };
const PIECES = ["identite", "domicile", "salaires", "impots", "travail", "garant", "autre"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return rep({ erreur: "Méthode refusée" }, 405);
  const url = Deno.env.get("SUPABASE_URL")!, admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let c: any = {}; try { c = await req.json(); } catch (_) { return rep({ erreur: "Demande illisible" }, 400); }
  const jeton = String(c.jeton || "");
  if (!/^[A-Za-z0-9_-]{30,80}$/.test(jeton)) return rep({ erreur: "Lien incomplet : redemandez le lien de l'annonce." }, 400);
  const { data: a } = await admin.from("annonces_publiques").select("espace_id, bien_id, donnees").eq("jeton_hash", await empreinte(jeton)).maybeSingle();
  if (!a) return rep({ erreur: "Cette annonce n'est plus en ligne : le logement est peut-être déjà loué." }, 404);

  if (c.action === "deposer") {
    const nom = TXT(c.nom, 200), email = TXT(c.email, 200), tel = TXT(c.tel, 40);
    if (!nom) return rep({ erreur: "Indiquez votre nom." }, 400);
    if (!email && !tel) return rep({ erreur: "Indiquez un e-mail ou un téléphone pour que le propriétaire puisse vous répondre." }, 400);
    if (!c.accord) return rep({ erreur: "Cochez la case d'accord pour envoyer votre dossier." }, 400);
    const depuis = new Date(Date.now() - 864e5).toISOString();
    const { count } = await admin.from("candidatures").select("id", { count: "exact", head: true }).eq("espace_id", a.espace_id).eq("bien_id", a.bien_id).gte("cree_le", depuis);
    if ((count || 0) >= 40) return rep({ erreur: "Beaucoup de candidatures aujourd'hui pour ce logement : réessayez demain." }, 429);
    const fichiers = Array.isArray(c.pieces) ? c.pieces.slice(0, 12) : [];
    let total = 0; const pieces: any[] = [];
    for (const f of fichiers) {
      const m = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(f?.data || "")); const ext = m && TYPES[m[1]];
      if (!m || !ext) continue; total += m[2].length; if (m[2].length > 7_000_000 || total > 28_000_000) return rep({ erreur: "Fichiers trop lourds : 5 Mo par pièce au maximum (prenez une photo plutôt qu'un scan)." }, 413);
      const octets = Uint8Array.from(atob(m[2]), x => x.charCodeAt(0)), chemin = `${a.espace_id}/candidatures/${crypto.randomUUID()}.${ext}`;
      const up = await admin.storage.from("documents").upload(chemin, octets, { contentType: m[1] });
      if (!up.error) pieces.push({ type: PIECES.includes(f.type) ? f.type : "autre", nom: TXT(f.nom, 120) || "Pièce", chemin, mime: m[1] });
    }
    const revenus = Math.max(0, Math.min(1e6, +c.revenus || 0)) || null, occupants = Math.max(1, Math.min(20, Math.round(+c.occupants || 1)));
    const { data: d, error } = await admin.from("candidatures").insert({ espace_id: a.espace_id, bien_id: a.bien_id, nom, email: email || null, tel: tel || null,
      situation: TXT(c.situation, 30) || null, revenus, garantie: TXT(c.garantie, 30) || null, garant_info: TXT(c.garantInfo, 300) || null, occupants, message: TXT(c.message, 3000) || null, pieces }).select("id").single();
    if (error) return rep({ erreur: "Envoi impossible, réessayez dans un moment." }, 500);
    try { await fetch(url + "/functions/v1/notifier", { method: "POST", headers: { "Content-Type": "application/json", "x-cle-cron": Deno.env.get("CLE_CRON_NOTIFIER") || "" }, body: JSON.stringify({ candidature: d.id }) }); } catch (_) { /* enregistrée quand même */ }
    return rep({ ok: true, id: d.id, pieces: pieces.length });
  }
  // voir
  return rep({ ok: true, annonce: a.donnees || {} });
});

// Boîte à documents : reçoit (du programme e-mail Cloudflare, avec la clé BOITE_SECRET) les pièces jointes d'un e-mail
// envoyé à code@sci-gestion-locative.com, vérifie l'expéditeur (membre de l'espace ou ajouté), range les fichiers "à ranger".
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
const rep = (c: unknown, s = 200) => new Response(JSON.stringify(c), { status: s, headers: { "Content-Type": "application/json" } });
const TYPES: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" };
Deno.serve(async (req) => {
  if (req.method !== "POST") return rep({ erreur: "Méthode refusée" }, 405);
  if (!Deno.env.get("BOITE_SECRET") || req.headers.get("x-boite-secret") !== Deno.env.get("BOITE_SECRET")) return rep({ erreur: "Accès refusé" }, 401);
  const url = Deno.env.get("SUPABASE_URL")!, admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let c: any = {}; try { c = await req.json(); } catch (_) { return rep({ erreur: "Illisible" }, 400); }
  const code = String(c.code || "").toLowerCase().replace(/\+.*$/, "");
  const { data: bx } = await admin.from("boites").select("code, espace_id, expediteurs").eq("code", code).maybeSingle();
  if (!bx) return rep({ erreur: "Adresse inconnue" }, 404);
  const de = String(c.de || "").toLowerCase().trim();
  const { data: mb } = await admin.from("membres").select("user_id, email").eq("espace_id", bx.espace_id);
  const ids = (mb || []).map((m: any) => m.user_id);
  const { data: gm } = ids.length ? await admin.from("gmail_comptes").select("adresse").in("user_id", ids) : { data: [] };
  const permis = new Set([...(mb || []).map((m: any) => m.email), ...(gm || []).map((g: any) => g.adresse), ...(bx.expediteurs || [])].filter(Boolean).map((x: string) => x.toLowerCase()));
  if (!permis.has(de)) return rep({ erreur: "Expéditeur non autorisé" }, 403);
  const pjs = (Array.isArray(c.pjs) ? c.pjs : []).filter((p: any) => TYPES[p.type] && typeof p.b64 === "string" && p.b64.length < 21_000_000).slice(0, 10);
  if (!pjs.length) return rep({ erreur: "Aucune pièce jointe PDF ou photo" }, 422);
  const auj = new Date().toISOString().slice(0, 10); let n = 0;
  for (const p of pjs) {
    const octets = Uint8Array.from(atob(p.b64), x => x.charCodeAt(0)), id = "bx-" + crypto.randomUUID().slice(0, 13), chemin = `${bx.espace_id}/boite/${id}.${TYPES[p.type]}`;
    const up = await admin.storage.from("documents").upload(chemin, octets, { contentType: p.type }); if (up.error) continue;
    const nom = String(p.nom || "document").replace(/\.[a-z0-9]{2,5}$/i, "").slice(0, 120) || "document";
    const { error } = await admin.from("docs").insert({ espace_id: bx.espace_id, coll: "fichiers", doc_id: id, data: { id, bienId: "", cat: "Autre", nom, chemin, type: p.type, taille: octets.length, date: auj, boite: true, de, objet: String(c.objet || "").slice(0, 200) } });
    if (!error) n++; else await admin.storage.from("documents").remove([chemin]);
  }
  try { await fetch(url + "/functions/v1/notifier", { method: "POST", headers: { "Content-Type": "application/json", "x-cle-cron": Deno.env.get("CLE_CRON_NOTIFIER") || "" }, body: JSON.stringify({ boite: bx.espace_id, n, objet: String(c.objet || "").slice(0, 80) }) }); } catch (_) {}
  return rep({ ok: true, n });
});

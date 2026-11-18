// Espace locataire : le locataire ouvre son lien privé (https://sci-gestion-locative.com/#locataire=JETON), sans compte.
// Actions : "voir" (ses infos publiées par le propriétaire, ses documents, ses demandes) et "signaler" (un problème, avec photo).
// Le jeton n'est jamais gardé en clair : seule son empreinte SHA-256 est en base. Le locataire ne voit rien d'autre de l'espace.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const rep = (c: unknown, s = 200) => new Response(JSON.stringify(c), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const empreinte = async (t: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)))).map(b => b.toString(16).padStart(2, "0")).join("");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return rep({ erreur: "Méthode refusée" }, 405);
  const url = Deno.env.get("SUPABASE_URL")!, admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let c: any = {}; try { c = await req.json(); } catch (_) { return rep({ erreur: "Demande illisible" }, 400); }
  const jeton = String(c.jeton || "");
  if (!/^[A-Za-z0-9_-]{30,80}$/.test(jeton)) return rep({ erreur: "Lien incomplet : demande un nouveau lien à ton propriétaire." }, 400);
  const { data: p } = await admin.from("portails_locataire").select("jeton_hash, espace_id, bail_id, donnees").eq("jeton_hash", await empreinte(jeton)).maybeSingle();
  if (!p) return rep({ erreur: "Ce lien n'est plus valable : demande un nouveau lien à ton propriétaire." }, 404);

  if (c.action === "signaler") {
    const texte = String(c.texte || "").trim().slice(0, 3000);
    if (!texte) return rep({ erreur: "Décris le problème en quelques mots." }, 400);
    const depuis = new Date(Date.now() - 864e5).toISOString();
    const { count } = await admin.from("demandes_locataire").select("id", { count: "exact", head: true }).eq("espace_id", p.espace_id).eq("bail_id", p.bail_id).gte("cree_le", depuis);
    if ((count || 0) >= 10) return rep({ erreur: "Trop de demandes aujourd'hui : réessaie demain, ou appelle ton propriétaire." }, 429);
    let photo: string | null = null;
    const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(c.photo || ""));
    if (m && m[2].length < 6_000_000) {
      const octets = Uint8Array.from(atob(m[2]), x => x.charCodeAt(0));
      const chemin = `${p.espace_id}/demandes/${crypto.randomUUID()}.${m[1] === "jpeg" ? "jpg" : m[1]}`;
      const up = await admin.storage.from("documents").upload(chemin, octets, { contentType: "image/" + m[1] });
      if (!up.error) photo = chemin;
    }
    const nom = String((p.donnees as any)?.locataire || "").slice(0, 200) || null;
    const { data: d, error } = await admin.from("demandes_locataire").insert({ espace_id: p.espace_id, bail_id: p.bail_id, nom, texte, photo }).select("id").single();
    if (error) return rep({ erreur: "Envoi impossible, réessaie dans un moment." }, 500);
    // prévenir le propriétaire et les associés (notification + e-mail depuis le Gmail du propriétaire)
    try { await fetch(url + "/functions/v1/notifier", { method: "POST", headers: { "Content-Type": "application/json", "x-cle-cron": Deno.env.get("CLE_CRON_NOTIFIER") || "" }, body: JSON.stringify({ demande: d.id }) }); } catch (_) { /* la demande est enregistrée quand même */ }
    return rep({ ok: true, id: d.id });
  }

  if (c.action === "deposer") {
    // le locataire envoie un document (attestation d'assurance habitation) : PDF ou photo, 6 Mo au plus
    const m = /^data:(application\/pdf|image\/jpeg|image\/png|image\/webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(c.data || ""));
    if (!m) return rep({ erreur: "Fichier illisible : envoyez un PDF ou une photo." }, 400);
    if (m[2].length > 8_000_000) return rep({ erreur: "Fichier trop lourd : prenez plutôt une photo de l'attestation." }, 413);
    const depuis = new Date(Date.now() - 864e5).toISOString();
    const { count } = await admin.from("depots_locataire").select("id", { count: "exact", head: true }).eq("espace_id", p.espace_id).eq("bail_id", p.bail_id).gte("cree_le", depuis);
    if ((count || 0) >= 10) return rep({ erreur: "Trop d'envois aujourd'hui : réessayez demain." }, 429);
    const ext = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[m[1]], chemin = `${p.espace_id}/locataires/${crypto.randomUUID()}.${ext}`;
    const up = await admin.storage.from("documents").upload(chemin, Uint8Array.from(atob(m[2]), x => x.charCodeAt(0)), { contentType: m[1] });
    if (up.error) return rep({ erreur: "Envoi impossible, réessayez dans un moment." }, 500);
    const type = c.type === "assurance" ? "assurance" : "autre", nom = String(c.nom || "").slice(0, 120) || (type === "assurance" ? "Attestation d'assurance" : "Document");
    const { data: d, error } = await admin.from("depots_locataire").insert({ espace_id: p.espace_id, bail_id: p.bail_id, type, nom, chemin, mime: m[1] }).select("id").single();
    if (error) return rep({ erreur: "Envoi impossible, réessayez dans un moment." }, 500);
    try { await fetch(url + "/functions/v1/notifier", { method: "POST", headers: { "Content-Type": "application/json", "x-cle-cron": Deno.env.get("CLE_CRON_NOTIFIER") || "" }, body: JSON.stringify({ depot: d.id }) }); } catch (_) { /* envoyé quand même */ }
    return rep({ ok: true });
  }

  if (c.action === "signer") {
    // signature à distance d'un document envoyé par le propriétaire (bail, avenant, état des lieux)
    const id = String(c.id || ""), nom = String(c.nom || "").trim().slice(0, 120);
    if (!/^[0-9a-f-]{36}$/.test(id)) return rep({ erreur: "Document introuvable." }, 400);
    if (!nom) return rep({ erreur: "Indiquez votre nom." }, 400);
    if (!c.accord) return rep({ erreur: "Cochez la case : vous avez lu le document et vous l'approuvez." }, 400);
    const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(String(c.img || ""));
    if (!m || m[1].length > 700_000) return rep({ erreur: "Signature illisible : recommencez." }, 400);
    const { data: d } = await admin.from("signatures_distance").select("id, statut, index_locataire, titre").eq("id", id).eq("espace_id", p.espace_id).eq("bail_id", p.bail_id).maybeSingle();
    if (!d) return rep({ erreur: "Document introuvable." }, 404);
    if (d.statut !== "attente") return rep({ erreur: d.statut === "annule" ? "Ce document a été retiré par votre propriétaire." : "Ce document est déjà signé." }, 409);
    const quand = new Date().toISOString(), ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim().slice(0, 60), appareil = (req.headers.get("user-agent") || "").slice(0, 300);
    const signature = { img: "data:image/png;base64," + m[1], w: Math.max(1, Math.min(2000, +c.w || 300)), h: Math.max(1, Math.min(2000, +c.h || 100)), nom, lu: !!c.lu, quand, distance: true };
    const { error } = await admin.from("signatures_distance").update({ statut: "signe", signature, signe_le: quand, ip, appareil }).eq("id", id).eq("statut", "attente");
    if (error) return rep({ erreur: "Signature impossible, réessayez dans un moment." }, 500);
    try { await fetch(url + "/functions/v1/notifier", { method: "POST", headers: { "Content-Type": "application/json", "x-cle-cron": Deno.env.get("CLE_CRON_NOTIFIER") || "" }, body: JSON.stringify({ signature: id }) }); } catch (_) { /* signé quand même */ }
    return rep({ ok: true });
  }

  // voir
  await admin.from("portails_locataire").update({ vu_le: new Date().toISOString() }).eq("jeton_hash", p.jeton_hash);
  const don: any = p.donnees || {};
  const docs = [];
  for (const x of (Array.isArray(don.docs) ? don.docs : []).slice(0, 40)) {
    if (!x || typeof x.chemin !== "string" || !x.chemin.startsWith(p.espace_id + "/") || x.chemin.includes("..")) continue;
    const s = await admin.storage.from("documents").createSignedUrl(x.chemin, 3600);
    if (s.data?.signedUrl) docs.push({ nom: String(x.nom || "Document"), cat: String(x.cat || ""), date: String(x.date || ""), url: s.data.signedUrl });
  }
  const { data: dem } = await admin.from("demandes_locataire").select("id, texte, statut, cree_le, traite_le").eq("espace_id", p.espace_id).eq("bail_id", p.bail_id).order("cree_le", { ascending: false }).limit(20);
  const { docs: _d, ...reste } = don;
  const { data: sig } = await admin.from("signatures_distance").select("id, titre, base_html, sigs, index_locataire, nom_locataire, statut, signe_le, cree_le").eq("espace_id", p.espace_id).eq("bail_id", p.bail_id).in("statut", ["attente", "signe", "range"]).order("cree_le", { ascending: false }).limit(10);
  const a_signer = (sig || []).map((x: any) => x.statut === "attente" ? x : { id: x.id, titre: x.titre, statut: x.statut, signe_le: x.signe_le, cree_le: x.cree_le });
  const { data: dep } = await admin.from("depots_locataire").select("id, type, nom, statut, cree_le").eq("espace_id", p.espace_id).eq("bail_id", p.bail_id).order("cree_le", { ascending: false }).limit(10);
  return rep({ ok: true, donnees: reste, docs, demandes: dem || [], a_signer, depots: dep || [] });
});

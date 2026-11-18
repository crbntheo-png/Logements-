// Banque en direct par Enable Banking (DSP2, lecture seule). Actions : banques, connecter, valider, actualiser, debrancher ; "toutes" (tâche planifiée).
// Clés : ENABLEBANKING_APP_ID, ENABLEBANKING_KEY (clé privée de l'application). Les opérations vont dans les tables de la banque (comme Pennylane).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cle-cron", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const rep = (c: unknown, s = 200) => new Response(JSON.stringify(c), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const API = "https://api.enablebanking.com", RETOUR = "https://sci-gestion-locative.com/";
const b64u = (b: Uint8Array | string) => btoa(typeof b === "string" ? unescape(encodeURIComponent(b)) : String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
let JWT: { t: string; exp: number } | null = null;
async function jwt() {
  if (JWT && Date.now() < JWT.exp - 60000) return JWT.t;
  const kid = Deno.env.get("ENABLEBANKING_APP_ID") || "", pem = (Deno.env.get("ENABLEBANKING_KEY") || "").replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  if (!kid || !pem) throw new Error("La banque en direct n'est pas encore installée sur le serveur.");
  const cle = await crypto.subtle.importKey("pkcs8", Uint8Array.from(atob(pem), x => x.charCodeAt(0)), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const iat = Math.floor(Date.now() / 1000), corps = b64u(JSON.stringify({ typ: "JWT", alg: "RS256", kid })) + "." + b64u(JSON.stringify({ iss: "enablebanking.com", aud: "api.enablebanking.com", iat, exp: iat + 3600 }));
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cle, new TextEncoder().encode(corps)));
  JWT = { t: corps + "." + b64u(sig), exp: (iat + 3600) * 1000 }; return JWT.t;
}
async function eb(chemin: string, init: RequestInit = {}) {
  const r = await fetch(API + chemin, { ...init, headers: { Authorization: "Bearer " + await jwt(), "Content-Type": "application/json", ...(init.headers || {}) } });
  const j = await r.json().catch(() => ({})); return { s: r.status, j };
}
// identifiants numériques stables (les tables de la banque attendent des nombres)
const num = async (t: string) => { const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t))); let n = 0n; for (let i = 0; i < 7; i++) n = (n << 8n) | BigInt(h[i]); return (n & 0x1fffffffffffffn).toString(); };
const jour = (d: Date) => d.toISOString().slice(0, 10);
async function synchro(admin: any, e: string) {
  const { data: bd } = await admin.from("banque_directe").select("*").eq("espace_id", e).maybeSingle();
  if (!bd || !bd.session_id) return { n: 0, erreur: "pas connectée" };
  let n = 0, erreur: string | null = null;
  const depuis = jour(new Date(Date.now() - 120 * 864e5));
  for (const c of bd.comptes || []) {
    const cid = await num("eb-compte-" + c.uid);
    const b = await eb(`/accounts/${c.uid}/balances`);
    if (b.s === 401 || b.s === 403 || b.s === 422) { erreur = "L'accès à ta banque a expiré ou a été retiré : reconnecte-la (Réglages › Banque)."; break; }
    if (b.s === 429) { erreur = null; break; } // la banque limite à 4 lectures par jour sans toi : on réessaie plus tard
    const bal = (b.j.balances || []); const pref = ["CLBD", "ITAV", "XPCD", "ITBD", "CLAV", "OPBD"]; bal.sort((x: any, y: any) => (pref.indexOf(x.balance_type) + 99) % 99 - (pref.indexOf(y.balance_type) + 99) % 99);
    const solde = bal[0] ? +bal[0].balance_amount.amount : null;
    await admin.from("banque_comptes").upsert({ espace_id: e, compte_id: cid, nom: c.nom, solde, maj_le: new Date().toISOString(), source: "enablebanking" });
    let suite: string | null = null, pages = 0;
    do {
      const t = await eb(`/accounts/${c.uid}/transactions?date_from=${depuis}${suite ? "&continuation_key=" + encodeURIComponent(suite) : ""}`);
      if (t.s !== 200) { if (t.s === 401 || t.s === 403) erreur = "L'accès à ta banque a expiré : reconnecte-la (Réglages › Banque)."; break; }
      const lignes = [];
      for (const x of t.j.transactions || []) {
        if (x.status && x.status !== "BOOK") continue;
        const m = +(x.transaction_amount?.amount || 0) * (x.credit_debit_indicator === "DBIT" ? -1 : 1);
        const date = x.booking_date || x.value_date || x.transaction_date; if (!date || !m) continue;
        const qui = x.credit_debit_indicator === "CRDT" ? x.debtor?.name : x.creditor?.name;
        const libelle = [qui, ...(x.remittance_information || [])].filter(Boolean).join(" · ").slice(0, 300) || x.bank_transaction_code?.description || "Opération";
        const ref = x.entry_reference || x.transaction_id || `${date}|${m}|${libelle}`;
        lignes.push({ espace_id: e, tx_id: await num("eb-" + c.uid + "-" + ref), date, montant: Math.round(m * 100) / 100, libelle, compte: cid, source: "enablebanking" });
      }
      if (lignes.length) { const r = await admin.from("banque").upsert(lignes); if (!r.error) n += lignes.length; }
      suite = t.j.continuation_key || null; pages++;
    } while (suite && pages < 10);
  }
  await admin.from("banque_directe").update(erreur ? { erreur } : { erreur: null, derniere_synchro: new Date().toISOString() }).eq("espace_id", e);
  return { n, erreur };
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const url = Deno.env.get("SUPABASE_URL")!, admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const c = await req.json().catch(() => ({}));
    if (c.action === "toutes") {
      if (req.headers.get("x-cle-cron") !== Deno.env.get("CLE_CRON_NOTIFIER")) return rep({ erreur: "Accès refusé" }, 401);
      const { data } = await admin.from("banque_directe").select("espace_id").not("session_id", "is", null);
      const bilan = []; for (const x of data || []) bilan.push(await synchro(admin, x.espace_id)); return rep({ ok: true, bilan });
    }
    const jeton = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = await admin.auth.getUser(jeton); if (!u?.user) return rep({ erreur: "Connexion requise" }, 401);
    if (c.action === "banques") {
      const r = await eb("/aspsps?country=FR&service=AIS"); if (r.s !== 200) return rep({ erreur: "Liste des banques indisponible, réessaie." }, 502);
      return rep({ ok: true, banques: (r.j.aspsps || []).map((a: any) => ({ nom: a.name, logo: a.logo, types: a.psu_types, duree: a.maximum_consent_validity })) });
    }
    const moi = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: "Bearer " + jeton } } });
    if (c.action === "valider") {
      const { data: bd } = await admin.from("banque_directe").select("*").eq("etat", String(c.state || "")).maybeSingle();
      if (!bd) return rep({ erreur: "Retour de la banque inconnu ou déjà utilisé : recommence la connexion." }, 400);
      const { data: p } = await moi.rpc("est_proprietaire", { e: bd.espace_id }); if (!p) return rep({ erreur: "Seul le propriétaire de l'espace peut relier la banque." }, 403);
      const s = await eb("/sessions", { method: "POST", body: JSON.stringify({ code: String(c.code || "") }) });
      if (s.s !== 200) return rep({ erreur: "La banque n'a pas confirmé l'accès (le lien de retour a peut-être expiré ou déjà servi). Recommence la connexion.", detail: s.j.message || s.j.detail || s.s }, 400);
      const comptes = (s.j.accounts || []).map((a: any) => ({ uid: a.uid, nom: [a.name || a.product || "Compte", a.account_id?.iban ? "…" + String(a.account_id.iban).slice(-4) : ""].filter(Boolean).join(" ") }));
      const { data: ancien } = await admin.from("banque_directe").select("session_id").eq("espace_id", bd.espace_id).maybeSingle();
      await admin.from("banque_directe").update({ session_id: s.j.session_id, comptes, etat: null, valide_jusqua: s.j.access?.valid_until || null, maj_le: new Date().toISOString() }).eq("espace_id", bd.espace_id);
      if (ancien?.session_id && ancien.session_id !== s.j.session_id) await eb(`/sessions/${ancien.session_id}`, { method: "DELETE" }).catch(() => {});
      // Pennylane reste branché s'il l'était : les deux sources sont gardées et comparées dans l'appli
      const r = await synchro(admin, bd.espace_id);
      return rep({ ok: true, espace: bd.espace_id, comptes: comptes.length, operations: r.n, erreur: r.erreur });
    }
    const e = String(c.espace || "");
    const { data: p } = await moi.rpc(c.action === "actualiser" ? "est_membre" : "est_proprietaire", { e });
    if (!p) return rep({ erreur: c.action === "actualiser" ? "Accès refusé" : "Seul le propriétaire de l'espace peut relier ou débrancher la banque." }, 403);
    if (c.action === "connecter") {
      const b = await eb("/aspsps?country=FR&service=AIS"), a = (b.j.aspsps || []).find((x: any) => x.name === c.banque);
      if (!a) return rep({ erreur: "Banque inconnue." }, 400);
      const type = (a.psu_types || []).includes(c.type) ? c.type : (a.psu_types || ["personal"])[0];
      const duree = Math.min(+a.maximum_consent_validity || 7776000, 180 * 86400), etat = "eb-" + crypto.randomUUID();
      const r = await eb("/auth", { method: "POST", body: JSON.stringify({ access: { valid_until: new Date(Date.now() + duree * 1000 - 3600000).toISOString() }, aspsp: { name: a.name, country: "FR" }, state: etat, redirect_url: RETOUR, psu_type: type, language: "fr" }) });
      if (r.s !== 200 || !r.j.url) return rep({ erreur: "La banque ne répond pas (" + (r.j.message || r.s) + "), réessaie." }, 502);
      await admin.from("banque_directe").upsert({ espace_id: e, banque: a.name, type_compte: type, etat, maj_le: new Date().toISOString() }, { onConflict: "espace_id", ignoreDuplicates: false });
      return rep({ ok: true, url: r.j.url });
    }
    if (c.action === "actualiser") { const { data: l } = await admin.from("banque_directe").select("derniere_synchro, session_id").eq("espace_id", e).maybeSingle();
      if (!l || !l.session_id) return rep({ ok: true, n: 0 });
      if (l.derniere_synchro && Date.now() - new Date(l.derniere_synchro).getTime() < 6 * 3600e3 && !c.force) return rep({ ok: true, n: 0, recent: true });
      return rep({ ok: true, ...(await synchro(admin, e)) }); }
    if (c.action === "debrancher") {
      const { data: bd } = await admin.from("banque_directe").select("session_id").eq("espace_id", e).maybeSingle();
      if (bd?.session_id) await eb(`/sessions/${bd.session_id}`, { method: "DELETE" }).catch(() => {});
      await admin.from("banque_directe").delete().eq("espace_id", e);
      await admin.from("banque").delete().eq("espace_id", e).eq("source", "enablebanking"); await admin.from("banque_comptes").delete().eq("espace_id", e).eq("source", "enablebanking");
      return rep({ ok: true });
    }
    return rep({ erreur: "Action inconnue" }, 400);
  } catch (err: any) { return rep({ erreur: err?.message || String(err) }, 500); }
});

// Tous les matins : alertes sur le téléphone (virement reçu, loyer en retard) et, le 1er et le 5 du mois, résumé par e-mail (depuis le Gmail branché de chacun, à lui-même).
// Aussi : nouveau signalement ({ signalement: id }, en-tête x-cle-cron) -> alerte et e-mail à l'administrateur, depuis son propre Gmail.
// Appelée par la tâche planifiée « notifier » (en-tête x-cle-cron), ou par un membre connecté pour un essai ({ essai: true }).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cle-cron", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const rep = (c: unknown, s = 200) => new Response(JSON.stringify(c), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const APP = Deno.env.get("APP_URL") || "https://gestion-locative-sci.pages.dev";
const r2 = (n: number) => Math.round(n * 100) / 100;
const eur = (n: number) => r2(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const paris = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" }));
const mk = (d: Date) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
const P = (s: string) => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const addM = (m: string, n: number) => { const [y, mo] = m.split("-").map(Number); const d = new Date(y, mo - 1 + n, 1); return mk(d); };
const dim = (m: string) => { const [y, mo] = m.split("-").map(Number); return new Date(y, mo, 0).getDate(); };
const prenom = (n: string) => String(n || "").replace(/\s*\(.*?\)/g, "").trim().split(/\s+/)[0];

// Même calcul que l'appli (simplifié) : ce qui est dû ce mois-ci, ce qui est reçu, le statut
function loyerAt(b: any, m: string) { const r = (b.revisions || []).filter((x: any) => x.depuis <= m).sort((a: any, c: any) => a.depuis.localeCompare(c.depuis)).pop(); return r ? { hc: +r.loyerHC, ch: +r.charges } : { hc: +b.loyerHC || 0, ch: +b.charges || 0 }; }
function echeance(b: any, m: string, pays: any[], auj: Date) {
  const start = mk(P(b.dateEntree)), suivi = b.suiviDepuis || start;
  if (m < start || m < suivi || (b.dateSortie && m > mk(P(b.dateSortie)))) return null;
  const days = dim(m); let from = 1, to = days;
  if (m === start) from = P(b.dateEntree).getDate();
  if (b.dateSortie && m === mk(P(b.dateSortie))) to = P(b.dateSortie).getDate();
  const f = (to - from + 1) / days, L = loyerAt(b, m), ex = (b.extras || []).filter((x: any) => x.mois === m).reduce((s: number, x: any) => s + (+x.montant || 0), 0);
  const du = r2(r2(L.hc * f) + r2(L.ch * f) + ex), paye = r2(pays.filter(p => p.bailId === b.id && p.mois === m).reduce((s, p) => s + (+p.montant || 0), 0));
  const due = new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, Math.min(+b.jourPaiement || 1, days));
  let statut = du <= 0 || paye >= du - 0.009 ? "paye" : auj > due ? "retard" : paye > 0 ? "partiel" : "avenir";
  if (statut !== "paye" && (statut === "retard" || statut === "partiel") && b.plan && +b.plan.mensualite > 0 && m <= (b.plan.jusqua || addM(b.plan.debut, -1))) statut = "etale";
  return { du, paye, reste: r2(Math.max(0, du - paye)), statut, due, jours: Math.floor((+auj - +due) / 864e5) };
}

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = Deno.env.get("SUPABASE_URL")!, admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let corps: any = {}; try { corps = await req.json(); } catch (_) { corps = {}; }
  let seulUser: string | null = null;
  if (req.headers.get("x-cle-cron") !== Deno.env.get("CLE_CRON_NOTIFIER")) {
    const { data: u } = await admin.auth.getUser((req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, ""));
    if (!u?.user || !corps.essai) return rep({ erreur: "Accès refusé" }, 401);
    seulUser = u.user.id;
  }
  webpush.setVapidDetails(APP, Deno.env.get("VAPID_PUBLIC")!, Deno.env.get("VAPID_PRIVATE")!);
  if (corps.signalement && !seulUser) {
    const { data: sg } = await admin.from("signalements").select("id, email, type, message, page").eq("id", corps.signalement).maybeSingle();
    const { data: ad } = await admin.rpc("admin_destinataire");
    if (!sg || !ad?.user_id) return rep({ ok: true, rien: true });
    const titre = `[${sg.type === "bug" ? "Problème" : sg.type === "idee" ? "Idée" : "Question"} n°${sg.id}] ${String(sg.message || "").replace(/\s+/g, " ").slice(0, 70)}`;
    await envoyerParGmail(admin, ad.user_id, [ad.email], titre, `Envoyé par ${sg.email || "?"}\n\n${sg.message}\n\n— Page : ${sg.page || "?"}\n\nRéponds à ${sg.email || "la personne"} depuis ta messagerie.`).catch(() => {});
    const { data: subs1 } = await admin.from("push_abonnements").select("*").eq("user_id", ad.user_id);
    for (const s1 of subs1 || []) await webpush.sendNotification({ endpoint: s1.endpoint, keys: { p256dh: s1.p256dh, auth: s1.auth } }, JSON.stringify({ titre: "🆘 " + titre, texte: String(sg.message || "").slice(0, 120), url: "./", tag: "sig-" + sg.id })).catch(() => {});
    return rep({ ok: true });
  }
  const auj = paris(); auj.setHours(12, 0, 0, 0); const CUR = mk(auj), jour = auj.getDate(), resumeDuJour = jour === 1 || jour === 5;
  const { data: subs } = await admin.from("push_abonnements").select("*");
  const { data: prefs } = await admin.from("notif_prefs").select("*");
  const pref = (u: string) => (prefs || []).find((p: any) => p.user_id === u) || { push: true, resume: false };
  const envoyerPush = async (users: string[], msg: any) => { let n = 0; for (const s of (subs || []).filter((x: any) => users.includes(x.user_id) && pref(x.user_id).push)) {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg)); n++; }
    catch (e: any) { if (e.statusCode === 404 || e.statusCode === 410) await admin.from("push_abonnements").delete().eq("endpoint", s.endpoint); } } return n; };
  const dejaEnvoye = async (cle: string) => { if (seulUser) return false; const { error } = await admin.from("notif_envoyes").insert({ cle }); return !!error; };
  const bilan: any[] = [];
  const { data: espaces } = await admin.from("espaces").select("id, nom");
  for (const esp of espaces || []) {
    const { data: membres } = await admin.from("membres").select("user_id, email").eq("espace_id", esp.id);
    const users = (membres || []).map((m: any) => m.user_id).filter((u: string) => !seulUser || u === seulUser);
    if (!users.length) continue;
    const { data: docs } = await admin.from("docs").select("coll, data").eq("espace_id", esp.id).in("coll", ["baux", "paiements", "meta"]);
    const baux = (docs || []).filter((d: any) => d.coll === "baux").map((d: any) => d.data), pays = (docs || []).filter((d: any) => d.coll === "paiements").map((d: any) => d.data);
    const meta = ((docs || []).find((d: any) => d.coll === "meta") || { data: {} }).data, nomEsp = (meta.sci && meta.sci.nom) || esp.nom;
    const L = baux.map((b: any) => ({ b, e: echeance(b, CUR, pays, auj) })).filter((x: any) => x.e);
    let nPush = 0;
    // 1. Virements reçus ces 2 derniers jours (lus par la banque)
    const hier = new Date(+auj - 2 * 864e5).toISOString().slice(0, 10);
    const { data: ops } = await admin.from("banque").select("tx_id, date, montant, libelle").eq("espace_id", esp.id).gt("montant", 0).gte("date", hier);
    for (const o of ops || []) if (!(await dejaEnvoye("vir-" + esp.id + "-" + o.tx_id)))
      nPush += await envoyerPush(users, { titre: `💶 ${eur(+o.montant)} reçus`, texte: `${String(o.libelle).replace(/^VIR( INST)?\s*/i, "").slice(0, 60)} · ${nomEsp}`, url: "./#locataires", tag: "vir-" + o.tx_id });
    // 2. Loyer pas reçu 3 jours après la date prévue
    for (const { b, e } of L) if (e.statut === "retard" && e.jours === 3 && !(await dejaEnvoye(`ret-${esp.id}-${b.id}-${CUR}`)))
      nPush += await envoyerPush(users, { titre: `⏰ Loyer de ${prenom(b.nom)} pas encore reçu`, texte: `${eur(e.reste)} attendus depuis 3 jours · ${nomEsp}. Un petit rappel gentil suffit souvent.`, url: `./#bail-${b.id}`, tag: "ret-" + b.id });
    // 3. Le 1er et le 5 du mois : résumé
    if (resumeDuJour || seulUser) {
      const recus = L.filter((x: any) => x.e.statut === "paye").length, att = L.reduce((s: number, x: any) => s + x.e.du, 0), rec = L.reduce((s: number, x: any) => s + Math.min(x.e.paye, x.e.du), 0);
      const ligne = (x: any) => `• ${x.b.nom} : ${x.e.statut === "paye" ? "payé ✓" : x.e.statut === "retard" ? `en retard de ${x.e.jours} j (${eur(x.e.reste)})` : x.e.statut === "etale" ? "étalé (accord en cours)" : x.e.statut === "partiel" ? `${eur(x.e.paye)} reçus sur ${eur(x.e.du)}` : `attendu le ${x.e.due.getDate()}`}`;
      const titre = `Loyers de ${MOIS[auj.getMonth()]} : ${recus} sur ${L.length} reçus`, texte = `${titre} (${eur(rec)} / ${eur(att)}) · ${nomEsp}\n\n${L.map(ligne).join("\n")}\n\nOuvrir l'appli : ${APP}\n\nTu reçois ce résumé le 1er et le 5 du mois. Pour l'arrêter : Réglages › Notifications.`;
      if (seulUser || !(await dejaEnvoye(`res-${esp.id}-${CUR}-${jour}`))) {
        nPush += await envoyerPush(users, { titre: `📊 ${titre}`, texte: `${eur(rec)} reçus sur ${eur(att)} · ${nomEsp}`, url: "./#locataires", tag: "res-" + esp.id });
        for (const m of (membres || []).filter((m: any) => users.includes(m.user_id) && pref(m.user_id).resume && m.email))
          await envoyerParGmail(admin, m.user_id, [m.email], titre + " · " + nomEsp, texte).catch(() => {}); // sans Gmail branché : pas d'e-mail, l'alerte sur le téléphone suffit
      }
    }
    bilan.push({ espace: nomEsp, push: nPush });
  }
  return rep({ ok: true, bilan });
});

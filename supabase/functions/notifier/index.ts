// Tous les matins : alertes sur le téléphone (virement reçu, loyer en retard) et, le 1er et le 5 du mois, résumé par e-mail (depuis le Gmail branché de chacun, à lui-même).
// Aussi : problème signalé par un locataire ({ demande: id }, en-tête x-cle-cron) -> notification aux membres, e-mail au propriétaire.
// Aussi : nouveau signalement ({ signalement: id }, en-tête x-cle-cron) -> alerte et e-mail à l'administrateur, depuis son propre Gmail.
// Appelée par la tâche planifiée « notifier » (en-tête x-cle-cron), ou par un membre connecté pour un essai ({ essai: true }).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cle-cron", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const rep = (c: unknown, s = 200) => new Response(JSON.stringify(c), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const APP = Deno.env.get("APP_URL") || "https://sci-gestion-locative.com";
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

// ---- Relances automatiques (option du propriétaire) : J+3 message gentil, J+8 message ferme. Jamais la mise en demeure.
// Seulement les retards récents (pas de "petit oubli ?" pour une dette de 2 mois), pas pendant un accord d'étalement, pas sans e-mail.
const fmD = (m: string) => MOIS[+m.slice(5, 7) - 1] + " " + m.slice(0, 4);
const fdD = (d: Date) => String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear();
const isoD = (d: Date) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
function planRelances(baux: any[], pays: any[], relances: any[], sci: any, auj: Date, CUR: string) {
  const out: any[] = [], g = (sci && sci.gerant) || "", iban = sci && sci.iban ? `\n\nPour rappel, le virement se fait sur le compte ${sci.iban}${sci.nom ? " (" + sci.nom + ")" : ""}.` : "";
  for (const b of baux) {
    if (!b.email || b.sansRelanceAuto || (b.dateSortie && P(b.dateSortie) < auj)) continue;
    for (const m of [addM(CUR, -1), CUR]) {
      const e = echeance(b, m, pays, auj); if (!e || e.statut !== "retard") continue;
      const deja = relances.filter((r: any) => r.bailId === b.id && r.mois === m).sort((a: any, c: any) => String(a.date).localeCompare(String(c.date)));
      const p = prenom(b.nom), niv = deja.length;
      if (niv === 0 && e.jours >= 3 && e.jours <= 10)
        out.push({ b, m, e, niv, objet: `Loyer de ${fmD(m)}`, texte: `Bonjour ${p},\n\nPetit message au cas où : je n'ai pas encore vu passer le loyer de ${fmD(m)} (${eur(e.reste)}). C'est peut-être un simple oubli. Si c'est déjà fait, ne tiens pas compte de ce message !${iban}\n\nMerci et bonne journée,\n${g}` });
      else if (niv === 1 && e.jours >= 8 && e.jours <= 25 && (+auj - +P(String(deja[0].date))) / 864e5 >= 4)
        out.push({ b, m, e, niv, objet: `Loyer de ${fmD(m)} toujours en attente`, texte: `Bonjour ${p},\n\nLe loyer de ${fmD(m)} (${eur(e.reste)}) n'est toujours pas réglé, il était à payer le ${fdD(e.due)}. Merci de faire le virement dans les prochains jours, ou de m'appeler si tu as une difficulté : on peut trouver une solution.${iban}\n\n${g}` });
    }
  }
  return out;
}

// ---- Envoi depuis le Gmail branché de la personne (droit "envoyer" seulement). Aucun envoi par un serveur commun. ----
const enTete = (s: string) => /^[\x20-\x7e]*$/.test(s) ? s : "=?UTF-8?B?" + b64u8(new TextEncoder().encode(s)) + "?=";
function b64u8(u8: Uint8Array) { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); }
const l76 = (s: string) => s.replace(/.{1,76}/g, "$&\r\n");
async function envoyerParGmail(admin: any, userId: string, a: string[], objet: string, texte: string, pj?: { nom: string; b64: string; type: string }) {
  if (A_BLANC) return;
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

let A_BLANC = false; // tournée « à blanc » (essai technique) : tout est calculé, rien n'est envoyé ni noté
// ---- Préférences de chacun : par type d'alerte, sur le téléphone (push) et/ou par e-mail (mail) ----
const TYPES_NOTIF: Record<string, { push: boolean; mail: boolean }> = {
  loyer_recu: { push: true, mail: false }, retard: { push: true, mail: false }, relance_auto: { push: true, mail: false }, demande: { push: true, mail: true },
  candidature: { push: true, mail: true }, signature: { push: true, mail: true }, depot: { push: true, mail: false }, boite: { push: true, mail: false }, resume: { push: true, mail: false }, banque: { push: true, mail: true }, echeances: { push: true, mail: false },
};
function veutDe(p: any, type: string, canal: "push" | "mail") {
  if (canal === "push" && p && p.push === false) return false; // interrupteur général du téléphone
  const t = p && p.types && p.types[type]; if (t && typeof t[canal] === "boolean") return t[canal];
  if (type === "resume" && canal === "mail" && p) return !!p.resume; // ancien réglage
  return !!(TYPES_NOTIF[type] && TYPES_NOTIF[type][canal]);
}
// Envoie une alerte d'un type aux membres d'un espace (ou à une liste), selon les préférences de chacun.
async function alerter(admin: any, espaceId: string, type: string, msg: { titre: string; texte: string; url?: string; tag?: string }, mail?: { titre: string; texte: string }, seulement?: string[]) {
  const { data: mb } = await admin.from("membres").select("user_id, email, role").eq("espace_id", espaceId);
  const L = (mb || []).filter((m: any) => !seulement || seulement.includes(m.user_id)); if (!L.length) return 0;
  const ids = L.map((m: any) => m.user_id), pr = (mb || []).find((m: any) => m.role === "proprietaire");
  const { data: prefs } = await admin.from("notif_prefs").select("*").in("user_id", ids);
  const P = (u: string) => (prefs || []).find((x: any) => x.user_id === u) || null;
  let n = 0;
  const pushA = ids.filter((u: string) => veutDe(P(u), type, "push"));
  if (A_BLANC) return pushA.length + (mail ? L.filter((m: any) => m.email && veutDe(P(m.user_id), type, "mail")).length : 0);
  if (pushA.length) { const { data: subs } = await admin.from("push_abonnements").select("*").in("user_id", pushA);
    for (const x of subs || []) { try { await webpush.sendNotification({ endpoint: x.endpoint, keys: { p256dh: x.p256dh, auth: x.auth } }, JSON.stringify({ url: "./", ...msg })); n++; }
      catch (e: any) { if (e.statusCode === 404 || e.statusCode === 410) await admin.from("push_abonnements").delete().eq("endpoint", x.endpoint); } } }
  if (mail) for (const m of L.filter((m: any) => m.email && veutDe(P(m.user_id), type, "mail"))) {
    // depuis le Gmail de la personne, sinon depuis celui du propriétaire de l'espace
    try { await envoyerParGmail(admin, m.user_id, [m.email], mail.titre, mail.texte); n++; }
    catch (_) { if (pr && pr.user_id !== m.user_id) { try { await envoyerParGmail(admin, pr.user_id, [m.email], mail.titre, mail.texte); n++; } catch (_) { /* pas de Gmail branché */ } } }
  }
  return n;
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
  if (seulUser && corps.simulerRelances && corps.espace) {
    const { data: mb } = await admin.from("membres").select("user_id").eq("espace_id", corps.espace).eq("user_id", seulUser).maybeSingle();
    if (!mb) return rep({ erreur: "Accès refusé" }, 403);
    const { data: dd } = await admin.from("docs").select("coll, data").eq("espace_id", corps.espace).in("coll", ["baux", "paiements", "meta", "relances"]);
    const pick = (c: string) => (dd || []).filter((x: any) => x.coll === c).map((x: any) => x.data), meta0 = (pick("meta")[0] || {});
    const a0 = paris(); a0.setHours(12, 0, 0, 0);
    const plan = planRelances(pick("baux"), pick("paiements"), pick("relances"), meta0.sci || {}, a0, mk(a0));
    return rep({ ok: true, actif: !!(meta0.sci && meta0.sci.relanceAuto), plan: plan.map((x: any) => ({ bailId: x.b.id, nom: x.b.nom, email: x.b.email, mois: x.m, niveau: x.niv, objet: x.objet, texte: x.texte })) });
  }
  webpush.setVapidDetails(APP, Deno.env.get("VAPID_PUBLIC")!, Deno.env.get("VAPID_PRIVATE")!);
  if (corps.signalement && !seulUser) {
    const { data: sg } = await admin.from("signalements").select("id, email, type, message, page").eq("id", corps.signalement).maybeSingle();
    const { data: ad } = await admin.rpc("admin_destinataire");
    if (!sg || !ad?.user_id) return rep({ ok: true, rien: true });
    const titre = `[${sg.type === "bug" ? "Problème" : sg.type === "idee" ? "Idée" : sg.type === "integration" ? "Intégration demandée" : "Question"} n°${sg.id}] ${String(sg.message || "").replace(/\s+/g, " ").slice(0, 70)}`;
    await envoyerParGmail(admin, ad.user_id, [ad.email], titre, `Envoyé par ${sg.email || "?"}\n\n${sg.message}\n\n— Page : ${sg.page || "?"}\n\nRéponds à ${sg.email || "la personne"} depuis ta messagerie.`).catch(() => {});
    const { data: subs1 } = await admin.from("push_abonnements").select("*").eq("user_id", ad.user_id);
    for (const s1 of subs1 || []) await webpush.sendNotification({ endpoint: s1.endpoint, keys: { p256dh: s1.p256dh, auth: s1.auth } }, JSON.stringify({ titre: "🆘 " + titre, texte: String(sg.message || "").slice(0, 120), url: "./", tag: "sig-" + sg.id })).catch(() => {});
    return rep({ ok: true });
  }
  if (corps.boite && !seulUser) {
    // documents reçus dans la boîte à documents de l'espace
    const t = `📨 ${corps.n} document${corps.n > 1 ? "s" : ""} reçu${corps.n > 1 ? "s" : ""} par e-mail`;
    await alerter(admin, corps.boite, "boite", { titre: t, texte: String(corps.objet || "À ranger dans l'appli"), url: "./#docs", tag: "boite-" + corps.boite }, { titre: t, texte: `${t} : « ${corps.objet || "sans objet"} ». Ils sont dans Docs › Ta boîte à documents, à ranger.\n\n${APP}/#docs` });
    return rep({ ok: true });
  }
  if (corps.demande && !seulUser) {
    // problème signalé par un locataire depuis son espace : notification à tous les membres, e-mail au propriétaire (depuis son Gmail)
    const { data: d } = await admin.from("demandes_locataire").select("id, espace_id, nom, texte, photo").eq("id", corps.demande).maybeSingle();
    if (!d) return rep({ ok: true, rien: true });
    const titre = `🔧 ${d.nom || "Un locataire"} signale un problème`, texte = String(d.texte || "").replace(/\s+/g, " ").slice(0, 140);
    await alerter(admin, d.espace_id, "demande", { titre, texte, url: "./#afaire", tag: "dem-" + d.id }, { titre, texte: `${d.nom || "Un locataire"} a signalé un problème depuis son espace locataire :\n\n${d.texte}\n\n${d.photo ? "Une photo est jointe à la demande : ouvre l'appli pour la voir.\n\n" : ""}Ouvre l'appli : ${APP}/#afaire` });
    return rep({ ok: true });
  }
  if (corps.depot && !seulUser) {
    const { data: d } = await admin.from("depots_locataire").select("id, espace_id, bail_id, type, nom").eq("id", corps.depot).maybeSingle();
    if (!d) return rep({ ok: true, rien: true });
    const { data: pt } = await admin.from("portails_locataire").select("donnees").eq("espace_id", d.espace_id).eq("bail_id", d.bail_id).maybeSingle();
    const qui = (pt && (pt.donnees as any)?.locataire) || "Un locataire", titre = d.type === "assurance" ? `🛡️ ${qui} a envoyé son attestation d'assurance` : `📎 ${qui} a envoyé un document`;
    await alerter(admin, d.espace_id, "depot", { titre, texte: "Ouvre l'appli : l'IA peut en lire la date de fin.", url: "./#afaire", tag: "dep-" + d.id }, { titre, texte: `${titre}.\n\nOuvre l'appli : ${APP}/#afaire` });
    return rep({ ok: true });
  }
  if (corps.signature && !seulUser) {
    const { data: d } = await admin.from("signatures_distance").select("id, espace_id, titre, signature").eq("id", corps.signature).maybeSingle();
    if (!d) return rep({ ok: true, rien: true });
    const nom = (d.signature && d.signature.nom) || "Ton locataire", titre = `✍️ ${nom} a signé`, texte = `« ${d.titre} » : ouvre l'appli pour ranger le PDF signé.`;
    await alerter(admin, d.espace_id, "signature", { titre, texte, url: "./#afaire", tag: "sig-" + d.id }, { titre, texte: `${nom} a signé « ${d.titre} » depuis son espace locataire.\n\nOuvre l'appli pour ranger le PDF signé : ${APP}/#afaire` });
    return rep({ ok: true });
  }
  if (corps.candidature && !seulUser) {
    // nouveau dossier déposé par un candidat depuis le lien de l'annonce
    const { data: d } = await admin.from("candidatures").select("id, espace_id, bien_id, nom, revenus, pieces").eq("id", corps.candidature).maybeSingle();
    if (!d) return rep({ ok: true, rien: true });
    const titre = `🙋 Nouvelle candidature : ${d.nom}`, texte = `${(d.pieces || []).length} pièce(s) jointe(s)${d.revenus ? " · revenus " + Math.round(+d.revenus) + " €/mois" : ""}`;
    await alerter(admin, d.espace_id, "candidature", { titre, texte, url: "./#afaire", tag: "cand-" + d.id }, { titre, texte: `${d.nom} a déposé son dossier depuis le lien de ton annonce (${texte}).\n\nOuvre l'appli pour le voir : ${APP}/#afaire` });
    return rep({ ok: true });
  }
  if (seulUser && corps.essai && !corps.simulerRelances) {
    const { data: ss } = await admin.from("push_abonnements").select("*").eq("user_id", seulUser); let n = 0;
    for (const x of ss || []) { try { await webpush.sendNotification({ endpoint: x.endpoint, keys: { p256dh: x.p256dh, auth: x.auth } }, JSON.stringify({ titre: "🔔 Essai réussi", texte: "Les notifications de Gestion locative arrivent bien sur ce téléphone.", url: "./#reglages", tag: "essai" })); n++; } catch (_) {} }
    return rep({ ok: true, push: n });
  }
  A_BLANC = !seulUser && !!corps.aBlanc;
  const auj = paris(); auj.setHours(12, 0, 0, 0); const CUR = mk(auj), jour = auj.getDate(), resumeDuJour = jour === 1 || jour === 5;
  const { data: subs } = await admin.from("push_abonnements").select("*");
  const { data: prefs } = await admin.from("notif_prefs").select("*");
  const pref = (u: string) => (prefs || []).find((p: any) => p.user_id === u) || null;
  const envoyerPush = async (users: string[], msg: any, type = "") => { let n = 0; for (const s of (subs || []).filter((x: any) => users.includes(x.user_id) && (type ? veutDe(pref(x.user_id), type, "push") : !(pref(x.user_id) && pref(x.user_id).push === false)))) {
    if (A_BLANC) { n++; continue; }
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg)); n++; }
    catch (e: any) { if (e.statusCode === 404 || e.statusCode === 410) await admin.from("push_abonnements").delete().eq("endpoint", s.endpoint); } } return n; };
  const dejaEnvoye = async (cle: string) => { if (seulUser) return false; if (A_BLANC) { const { data } = await admin.from("notif_envoyes").select("cle").eq("cle", cle).maybeSingle(); return !!data; } const { error } = await admin.from("notif_envoyes").insert({ cle }); return !!error; };
  const bilan: any[] = [];
  const { data: espaces } = await admin.from("espaces").select("id, nom");
  for (const esp of espaces || []) {
    const { data: membres } = await admin.from("membres").select("user_id, email, role").eq("espace_id", esp.id);
    const users = (membres || []).map((m: any) => m.user_id).filter((u: string) => !seulUser || u === seulUser);
    if (!users.length) continue;
    const { data: docs } = await admin.from("docs").select("coll, data").eq("espace_id", esp.id).in("coll", ["baux", "paiements", "meta", "rappels"]);
    const baux = (docs || []).filter((d: any) => d.coll === "baux").map((d: any) => d.data), pays = (docs || []).filter((d: any) => d.coll === "paiements").map((d: any) => d.data);
    const meta = ((docs || []).find((d: any) => d.coll === "meta") || { data: {} }).data, nomEsp = (meta.sci && meta.sci.nom) || esp.nom;
    const L = baux.map((b: any) => ({ b, e: echeance(b, CUR, pays, auj) })).filter((x: any) => x.e);
    let nPush = 0;
    // 1. Virements reçus ces 2 derniers jours (lus par la banque)
    const hier = new Date(+auj - 2 * 864e5).toISOString().slice(0, 10);
    const { data: bd } = await admin.from("banque_directe").select("session_id").eq("espace_id", esp.id).maybeSingle();
    const { data: ops } = await admin.from("banque").select("tx_id, date, montant, libelle").eq("espace_id", esp.id).eq("source", bd?.session_id ? "enablebanking" : "pennylane").gt("montant", 0).gte("date", hier);
    for (const o of ops || []) if (!(await dejaEnvoye("vir-" + esp.id + "-" + o.tx_id)))
      nPush += await envoyerPush(users, { titre: `💶 ${eur(+o.montant)} reçus`, texte: `${String(o.libelle).replace(/^VIR( INST)?\s*/i, "").slice(0, 60)} · ${nomEsp}`, url: "./#locataires", tag: "vir-" + o.tx_id }, "loyer_recu");
    // 2. Loyer pas reçu 3 jours après la date prévue
    for (const { b, e } of L) if (e.statut === "retard" && e.jours === 3 && !(await dejaEnvoye(`ret-${esp.id}-${b.id}-${CUR}`)))
      nPush += await envoyerPush(users, { titre: `⏰ Loyer de ${prenom(b.nom)} pas encore reçu`, texte: `${eur(e.reste)} attendus depuis 3 jours · ${nomEsp}. Un petit rappel gentil suffit souvent.`, url: `./#bail-${b.id}`, tag: "ret-" + b.id }, "retard");
    // 3. Le 1er et le 5 du mois : résumé
    if (resumeDuJour || seulUser) {
      const recus = L.filter((x: any) => x.e.statut === "paye").length, att = L.reduce((s: number, x: any) => s + x.e.du, 0), rec = L.reduce((s: number, x: any) => s + Math.min(x.e.paye, x.e.du), 0);
      const ligne = (x: any) => `• ${x.b.nom} : ${x.e.statut === "paye" ? "payé ✓" : x.e.statut === "retard" ? `en retard de ${x.e.jours} j (${eur(x.e.reste)})` : x.e.statut === "etale" ? "étalé (accord en cours)" : x.e.statut === "partiel" ? `${eur(x.e.paye)} reçus sur ${eur(x.e.du)}` : `attendu le ${x.e.due.getDate()}`}`;
      const titre = `Loyers de ${MOIS[auj.getMonth()]} : ${recus} sur ${L.length} reçus`, texte = `${titre} (${eur(rec)} / ${eur(att)}) · ${nomEsp}\n\n${L.map(ligne).join("\n")}\n\nOuvrir l'appli : ${APP}\n\nTu reçois ce résumé le 1er et le 5 du mois. Pour l'arrêter : Réglages › Notifications.`;
      if (seulUser || !(await dejaEnvoye(`res-${esp.id}-${CUR}-${jour}`))) {
        nPush += await envoyerPush(users, { titre: `📊 ${titre}`, texte: `${eur(rec)} reçus sur ${eur(att)} · ${nomEsp}`, url: "./#locataires", tag: "res-" + esp.id }, "resume");
        for (const m of (membres || []).filter((m: any) => users.includes(m.user_id) && veutDe(pref(m.user_id), "resume", "mail") && m.email))
          await envoyerParGmail(admin, m.user_id, [m.email], titre + " · " + nomEsp, texte).catch(() => {}); // sans Gmail branché : pas d'e-mail, l'alerte sur le téléphone suffit
      }
    }
    // 4. Relances automatiques, envoyées depuis le Gmail du propriétaire (option dans Réglages)
    const pr = (membres || []).find((m: any) => m.role === "proprietaire");
    if (!seulUser && meta.sci && meta.sci.relanceAuto && pr) {
      const { data: rl } = await admin.from("docs").select("data").eq("espace_id", esp.id).eq("coll", "relances");
      for (const x of planRelances(baux, pays, (rl || []).map((r: any) => r.data), meta.sci, auj, CUR)) {
        if (await dejaEnvoye(`rauto-${esp.id}-${x.b.id}-${x.m}-${x.niv}`)) continue;
        try { await envoyerParGmail(admin, pr.user_id, [x.b.email], x.objet, x.texte); }
        catch (err: any) { nPush += await envoyerPush([pr.user_id], { titre: `⚠️ Relance automatique pas envoyée (${prenom(x.b.nom)})`, texte: String(err?.message || err).slice(0, 120), url: "./#reglages", tag: "rauto-ko-" + x.b.id }, "relance_auto"); continue; }
        if (A_BLANC) { nPush++; continue; }
        const id = "ra-" + crypto.randomUUID().slice(0, 12);
        await admin.from("docs").insert({ espace_id: esp.id, coll: "relances", doc_id: id, data: { id, bailId: x.b.id, mois: x.m, niveau: x.niv, date: isoD(auj), auto: true } });
        await admin.from("envois").insert({ espace_id: esp.id, par: pr.user_id, destinataires: [x.b.email], objet: x.objet });
        nPush += await envoyerPush(users, { titre: `🔁 Relance automatique envoyée à ${prenom(x.b.nom)}`, texte: `${x.niv ? "2e rappel" : "Rappel gentil"} · ${eur(x.e.reste)} · loyer de ${fmD(x.m)}`, url: `./#bail-${x.b.id}`, tag: "rauto-" + x.b.id }, "relance_auto");
      }
    }
    // 5. Banque à reconnecter (accord qui finit dans 15, 7 ou 1 jour, ou banque qui ne répond plus) : au propriétaire
    if (pr && !seulUser) {
      const { data: bd } = await admin.from("banque_directe").select("valide_jusqua, erreur, session_id").eq("espace_id", esp.id).maybeSingle();
      const { data: bl } = await admin.from("banque_liens").select("erreur").eq("espace_id", esp.id).maybeSingle();
      const j = bd?.valide_jusqua ? Math.ceil((+new Date(bd.valide_jusqua) - +auj) / 864e5) : 99;
      const msgs: string[] = [];
      if (bd?.session_id && [15, 7, 1].includes(j)) msgs.push(`L'accès à ta banque finit dans ${j} jour${j > 1 ? "s" : ""} : reconnecte-la en 1 minute (Réglages › Banque).`);
      if (bd?.erreur) msgs.push("Ta banque ne répond plus : " + bd.erreur);
      if (bl?.erreur) msgs.push("Pennylane ne répond plus : " + bl.erreur);
      for (const m of msgs) if (!(await dejaEnvoye(`bq-${esp.id}-${CUR}-${jour}-${m.slice(0, 30)}`)))
        nPush += await alerter(admin, esp.id, "banque", { titre: "🏦 Banque à vérifier", texte: m.slice(0, 140), url: "./#reglages", tag: "bq-" + esp.id }, { titre: "🏦 Banque à vérifier · " + nomEsp, texte: m + `\n\n${APP}/#reglages` }, [pr.user_id]);
    }
    // 6. Rappels du jour et assurances des locataires qui finissent (dans 30 jours, ou aujourd'hui)
    const isoJ = (d: Date) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    const aujIso = isoJ(auj), dans30 = isoJ(new Date(+auj + 30 * 864e5));
    const rappels = (docs || []).filter((d: any) => d.coll === "rappels").map((d: any) => d.data).filter((r: any) => !r.fait && r.date === aujIso);
    for (const r of rappels) if (!(await dejaEnvoye(`rap-${esp.id}-${r.id}-${aujIso}`)))
      nPush += await alerter(admin, esp.id, "echeances", { titre: "⏰ Rappel : " + String(r.titre).slice(0, 80), texte: nomEsp, url: "./#afaire", tag: "rap-" + r.id }, { titre: "⏰ Rappel : " + r.titre, texte: `${r.titre}\n\n${nomEsp} · ${APP}/#afaire` }, seulUser ? users : undefined);
    for (const b of baux.filter((b: any) => b.assuranceFin && (b.assuranceFin === dans30 || b.assuranceFin === aujIso) && !(b.dateSortie && P(b.dateSortie) < auj)))
      if (!(await dejaEnvoye(`ass-${esp.id}-${b.id}-${b.assuranceFin}-${aujIso}`)))
        nPush += await alerter(admin, esp.id, "echeances", { titre: `🛡️ Assurance de ${prenom(b.nom)} : ${b.assuranceFin === aujIso ? "finit aujourd'hui" : "finit dans 30 jours"}`, texte: "Demande-lui la nouvelle attestation · " + nomEsp, url: `./#bail-${b.id}`, tag: "ass-" + b.id }, { titre: `🛡️ Attestation d'assurance de ${prenom(b.nom)} à redemander`, texte: `L'assurance habitation de ${b.nom} ${b.assuranceFin === aujIso ? "finit aujourd'hui" : "finit le " + b.assuranceFin.split("-").reverse().join("/")}. Demande-lui la nouvelle attestation.\n\n${APP}/#bail-${b.id}` }, seulUser ? users : undefined);
    bilan.push({ espace: nomEsp, push: nPush });
  }
  return rep({ ok: true, bilan });
});

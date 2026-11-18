import PostalMime from "postal-mime";
const b64 = buf => { const u = new Uint8Array(buf); let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
const TYPES = /^(application\/pdf|image\/(jpeg|png|webp|heic))$/i;
export default {
  async email(message, env) {
    const code = String(message.to || "").toLowerCase().split("@")[0];
    if (message.rawSize > 25 * 1024 * 1024) { message.setReject("E-mail trop lourd (25 Mo maximum)"); return; }
    const mail = await PostalMime.parse(await new Response(message.raw).arrayBuffer());
    const pjs = (mail.attachments || []).map(a => ({ a, type: String(a.mimeType || "").toLowerCase().replace("image/jpg", "image/jpeg") }))
      .map(x => ({ ...x, type: x.type === "application/octet-stream" && /\.pdf$/i.test(x.a.filename || "") ? "application/pdf" : x.type }))
      .filter(x => TYPES.test(x.type) && x.a.content && x.a.content.byteLength < 15 * 1024 * 1024 && !(x.a.disposition === "inline" && x.a.content.byteLength < 30000))
      .slice(0, 10).map(x => ({ nom: x.a.filename || "document", type: x.type, b64: b64(x.a.content) }));
    const r = await fetch(env.SUPABASE_URL + "/functions/v1/boite", { method: "POST", headers: { "Content-Type": "application/json", "x-boite-secret": env.BOITE_SECRET },
      body: JSON.stringify({ code, de: message.from, objet: mail.subject || "", pjs }) });
    if (r.status === 404) message.setReject("Adresse inconnue");
    else if (r.status === 403) message.setReject("Expediteur non autorise : envoie depuis l'adresse de ton compte Gestion locative");
    else if (r.status === 422) message.setReject("Aucune piece jointe PDF ou photo dans cet e-mail");
    else if (!r.ok) message.setReject("Le serveur n'a pas pu recevoir ce document, reessaie plus tard");
  },
};

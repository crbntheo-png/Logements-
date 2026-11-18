// Agenda abonné : https://bcfcrqmpeyaoovluvhhn.supabase.co/functions/v1/agenda?j=JETON (Google Agenda, iPhone, Outlook le relisent tout seuls).
// Le jeton est secret ; seule son empreinte SHA-256 est en base. Rien d'autre n'est lisible avec.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
const empreinte = async (t: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)))).map(b => b.toString(16).padStart(2, "0")).join("");
Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "HEAD") return new Response("Méthode refusée", { status: 405 });
  const j = new URL(req.url).searchParams.get("j") || "";
  if (!/^[A-Za-z0-9_-]{30,80}$/.test(j)) return new Response("Lien incomplet", { status: 400 });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const h = await empreinte(j);
  const { data } = await admin.from("agendas").select("ics").eq("jeton_hash", h).maybeSingle();
  if (!data || !data.ics) return new Response("Ce lien d'agenda n'est plus valable", { status: 404 });
  await admin.from("agendas").update({ lu_le: new Date().toISOString() }).eq("jeton_hash", h);
  return new Response(req.method === "HEAD" ? null : data.ics, { status: 200, headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'inline; filename="gestion-locative.ics"', "Cache-Control": "private, max-age=1800" } });
});

// Connecteur Claude sur le domaine de l'appli : https://sci-gestion-locative.com/mcp/JETON
// (relais vers la fonction Supabase "mcp" ; ici, Claude ne voit pas les réponses "accès refusé" de Supabase et comprend qu'aucune connexion n'est demandée)
const CIBLE = "https://bcfcrqmpeyaoovluvhhn.supabase.co/functions/v1/mcp/";
export async function onRequest({ request, params }) {
  const morceaux = [].concat(params.chemin || []), jeton = morceaux[morceaux.length - 1] || "";
  const h = new Headers();
  for (const k of ["content-type", "accept", "mcp-protocol-version", "mcp-session-id"]) { const v = request.headers.get(k); if (v) h.set(k, v); }
  const init = { method: request.method, headers: h };
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) init.body = await request.arrayBuffer();
  const r = await fetch(CIBLE + encodeURIComponent(jeton), init);
  const out = new Headers(r.headers); out.delete("content-encoding"); out.delete("content-length");
  return new Response(r.body, { status: r.status, headers: out });
}

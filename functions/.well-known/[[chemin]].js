// Pas de connexion OAuth : le connecteur Claude est protégé par son lien secret. Réponse nette "rien ici" pour la découverte OAuth.
export function onRequest() { return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { "Content-Type": "application/json" } }); }

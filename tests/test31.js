// Vraie base : rôle "lecture seule", changement de rôle, préférences de notification (comptes de test, espace supprimé à la fin)
const U = process.env.SUPABASE_URL, K = process.env.SUPABASE_PUBLISHABLE_KEY, MDP = 'TestMotDePasse-2026!';
const ok = [], ko = []; const check = (c, m) => (c ? ok : ko).push(m);
const req = async (jeton, chemin, opts = {}) => { const r = await fetch(U + chemin, { ...opts, headers: { apikey: K, Authorization: 'Bearer ' + (jeton || K), 'Content-Type': 'application/json', Prefer: 'return=representation', ...(opts.headers || {}) } }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {} return { s: r.status, j }; };
const connexion = async email => { const r = await req(null, '/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password: MDP }) }); if (!r.j || !r.j.access_token) throw new Error('connexion ' + email + ' ' + JSON.stringify(r.j)); return r.j; };
(async () => {
  const A = await connexion('test-a@gestion-test.fr'), B = await connexion('test-b@gestion-test.fr');
  const esp = (await req(A.access_token, '/rest/v1/rpc/creer_espace', { method: 'POST', body: JSON.stringify({ nom: 'Test lecture seule' }) })).j;
  try {
    await req(A.access_token, '/rest/v1/docs', { method: 'POST', body: JSON.stringify({ espace_id: esp, coll: 'biens', doc_id: 'b1', data: { id: 'b1', nom: 'Logement test' } }) });
    const inv = await req(A.access_token, '/rest/v1/invitations', { method: 'POST', body: JSON.stringify({ espace_id: esp, email: 'test-b@gestion-test.fr', role: 'lecteur' }) });
    check(inv.s === 201, 'invitation en lecture seule créée');
    await req(B.access_token, '/rest/v1/rpc/accepter_invitations', { method: 'POST', body: '{}' });
    const role = (await req(B.access_token, `/rest/v1/membres?espace_id=eq.${esp}&user_id=eq.${B.user.id}&select=role`)).j;
    check(role && role[0] && role[0].role === 'lecteur', 'B a rejoint en lecteur');
    const lu = (await req(B.access_token, `/rest/v1/docs?espace_id=eq.${esp}&select=doc_id`)).j;
    check(Array.isArray(lu) && lu.length === 1, 'le lecteur voit les données');
    const ecrit = await req(B.access_token, '/rest/v1/docs', { method: 'POST', body: JSON.stringify({ espace_id: esp, coll: 'biens', doc_id: 'b2', data: { id: 'b2' } }) });
    check(ecrit.s >= 400, 'le lecteur ne peut pas ajouter (' + ecrit.s + ')');
    const modif = await req(B.access_token, `/rest/v1/docs?espace_id=eq.${esp}&doc_id=eq.b1`, { method: 'PATCH', body: JSON.stringify({ data: { id: 'b1', nom: 'piraté' } }) });
    check(Array.isArray(modif.j) && modif.j.length === 0, 'le lecteur ne peut pas modifier');
    // Liste de destinataires vide : même si le contrôle échouait, aucun e-mail ne peut partir
    const mail = await req(B.access_token, '/rest/v1/rpc/envoyer_mail', { method: 'POST', body: JSON.stringify({ espace: esp, a: [], objet: 'test', texte: 'test' }) });
    check(mail.s >= 400 && /lecture seule/.test(JSON.stringify(mail.j)), 'le lecteur ne peut pas envoyer d\'e-mail (' + mail.s + ')');
    const cr = await req(B.access_token, '/rest/v1/rpc/changer_role', { method: 'POST', body: JSON.stringify({ e: esp, u: B.user.id, r: 'membre' }) });
    check(cr.s >= 400, 'le lecteur ne peut pas changer son propre rôle');
    await req(A.access_token, '/rest/v1/rpc/changer_role', { method: 'POST', body: JSON.stringify({ e: esp, u: B.user.id, r: 'membre' }) });
    const ecrit2 = await req(B.access_token, '/rest/v1/docs', { method: 'POST', body: JSON.stringify({ espace_id: esp, coll: 'biens', doc_id: 'b2', data: { id: 'b2' } }) });
    check(ecrit2.s === 201, 'après "Peut modifier", B peut ajouter');
    const pref = await req(B.access_token, '/rest/v1/notif_prefs', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify({ push: true, resume: true }) });
    check(pref.s === 201 || pref.s === 200, 'préférences de notification enregistrées');
    const autres = (await req(A.access_token, `/rest/v1/notif_prefs?user_id=eq.${B.user.id}`)).j;
    check(Array.isArray(autres) && autres.length === 0, 'personne ne voit les préférences des autres');
    await req(B.access_token, `/rest/v1/notif_prefs?user_id=eq.${B.user.id}`, { method: 'DELETE' });
  } finally { await req(A.access_token, `/rest/v1/espaces?id=eq.${esp}`, { method: 'DELETE' }); }
  console.log('OK', ok.length); ok.forEach(x => console.log('  ✓', x)); console.log('KO', ko.length); ko.forEach(x => console.log('  ✗', x));
  process.exit(ko.length ? 1 : 0);
})().catch(e => { console.log('ERREUR', e.message); process.exit(1); });

"""Construit la version installable de l'appli (dossier dist/) à partir de index.html.

Usage : python3 build.py
Lit SUPABASE_URL et SUPABASE_PUBLISHABLE_KEY dans .env (la clé publishable peut être publique).
"""
import datetime, hashlib, json, os, re, shutil
from PIL import Image, ImageDraw

ICI = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(ICI, "dist")


def lire_env():
    env = {}
    with open(os.path.join(ICI, ".env")) as f:
        for ligne in f:
            if "=" in ligne and not ligne.startswith("#"):
                k, v = ligne.strip().split("=", 1)
                env[k] = v
    return env


def icone(taille, marge=0.0, fond_plein=False):
    """Maison blanche sur dégradé vert -> bleu nuit (mêmes couleurs que l'appli)."""
    t = taille * 4
    img = Image.new("RGBA", (t, t), (0, 0, 0, 0))
    haut, bas = (11, 122, 100), (15, 27, 45)
    deg = Image.new("RGBA", (t, t))
    px = deg.load()
    for y in range(t):
        for x in range(t):
            k = (x + y) / (2 * t)
            px[x, y] = tuple(int(haut[i] + (bas[i] - haut[i]) * k) for i in range(3)) + (255,)
    masque = Image.new("L", (t, t), 0)
    ImageDraw.Draw(masque).rounded_rectangle([0, 0, t - 1, t - 1], radius=0 if fond_plein else int(t * 0.22), fill=255)
    img.paste(deg, (0, 0), masque)
    d = ImageDraw.Draw(img)
    m = t * (0.26 + marge)
    w = t - 2 * m
    trait = int(t * 0.055)
    toit = [(m, m + w * 0.46), (t / 2, m + w * 0.06), (t - m, m + w * 0.46)]
    d.line(toit, fill="white", width=trait, joint="curve")
    corps = [m + w * 0.14, m + w * 0.40, t - m - w * 0.14, t - m]
    d.line([(corps[0], corps[1]), (corps[0], corps[3]), (corps[2], corps[3]), (corps[2], corps[1])], fill="white", width=trait, joint="curve")
    porte = [t / 2 - w * 0.11, t - m - w * 0.30, t / 2 + w * 0.11, t - m]
    d.line([(porte[0], porte[3]), (porte[0], porte[1]), (porte[2], porte[1]), (porte[2], porte[3])], fill="white", width=trait, joint="curve")
    for (x, y) in toit[::2] + [(corps[0], corps[3]), (corps[2], corps[3])]:
        r = trait / 2
        d.ellipse([x - r, y - r, x + r, y + r], fill="white")
    return img.resize((taille, taille), Image.LANCZOS)


def main():
    env = lire_env()
    ancienne = {}  # date de la version déjà fabriquée, gardée si rien n'a changé
    try: ancienne = json.load(open(os.path.join(DIST, "version.json"), encoding="utf-8"))
    except Exception: pass
    if os.path.isdir(DIST):
        shutil.rmtree(DIST)
    os.makedirs(DIST)
    html = open(os.path.join(ICI, "index.html"), encoding="utf-8").read()
    # Numéro de version stable : il ne change que si l'appli (index.html) ou sa fabrication (build.py) change
    source_build = open(os.path.abspath(__file__), encoding="utf-8").read()
    vid = hashlib.sha256((html + source_build).encode("utf-8")).hexdigest()[:7]
    vdate = ancienne.get("date") if ancienne.get("id") == vid else datetime.datetime.now().strftime("%Y-%m-%dT%H:%M")
    VERSION = {"id": vid, "date": vdate}
    config = {"url": env["SUPABASE_URL"], "cle": env["SUPABASE_PUBLISHABLE_KEY"], "vapid": env.get("VAPID_PUBLIC", "")}
    tete = f"""<link rel="manifest" href="manifest.webmanifest">
<meta name="theme-color" content="#0f1b2d">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Gestion SCI">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">
<script src="supabase.js"></script>
<script>window.APP_SUPABASE = {json.dumps(config)}; window.APP_VERSION = {json.dumps(VERSION)};</script>
"""
    html = html.replace('<meta name="claude:viewport-fit-sides" content="cover">', '<meta name="claude:viewport-fit-sides" content="cover">\n' + tete, 1)
    html = html.replace("</body>", """<script>if ("serviceWorker" in navigator) {
  const avait = !!navigator.serviceWorker.controller; let maj = false;
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").then(r => { setInterval(() => r.update().catch(() => {}), 3600000); document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") r.update().catch(() => {}); }); }).catch(() => {}));
  // Nouvelle version installée : on recharge quand l'appli passe en arrière-plan (jamais pendant que tu tapes)
  // et on prévient l'appli tout de suite (bandeau "Nouvelle version prête")
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (!avait || maj) return; maj = true; window.MAJ_PRETE = true; dispatchEvent(new Event("maj-prete")); const libre = () => { const o = document.getElementById("overlay"), f = document.getElementById("focus"); return (!o || o.hidden) && (!f || f.hidden); }; const go = () => { if (document.visibilityState === "hidden" && libre()) location.reload(); }; go(); document.addEventListener("visibilitychange", go); });
}</script>
</body>""", 1)
    open(os.path.join(DIST, "index.html"), "w", encoding="utf-8").write(html)
    shutil.copy(os.path.join(ICI, "vendor", "supabase.js"), os.path.join(DIST, "supabase.js"))
    icone(192).save(os.path.join(DIST, "icon-192.png"))
    icone(512).save(os.path.join(DIST, "icon-512.png"))
    icone(512, marge=0.08, fond_plein=True).save(os.path.join(DIST, "icon-maskable-512.png"))
    icone(180, fond_plein=True).convert("RGB").save(os.path.join(DIST, "apple-touch-icon.png"))
    # Écran de démarrage sur iPhone et iPad (sinon écran blanc à l'ouverture)
    ECRANS = [(1290, 2796, 3), (1179, 2556, 3), (1284, 2778, 3), (1170, 2532, 3), (1125, 2436, 3), (1242, 2688, 3), (828, 1792, 2), (1242, 2208, 3), (750, 1334, 2), (640, 1136, 2), (1640, 2360, 2), (1668, 2388, 2), (2048, 2732, 2), (1620, 2160, 2)]
    liens_demarrage = []
    for (w, h, r) in ECRANS:
        im = Image.new("RGB", (w, h), (244, 245, 247)); ic = icone(int(min(w, h) * 0.28), fond_plein=True).convert("RGBA")
        im.paste(ic, ((w - ic.width) // 2, (h - ic.height) // 2 - h // 14), ic)
        nom = f"demarrage-{w}x{h}.png"; im.save(os.path.join(DIST, nom), optimize=True)
        liens_demarrage.append(f'<link rel="apple-touch-startup-image" media="(device-width: {w // r}px) and (device-height: {h // r}px) and (-webkit-device-pixel-ratio: {r}) and (orientation: portrait)" href="{nom}">')
    html = html.replace('<link rel="apple-touch-icon" href="apple-touch-icon.png">', '<link rel="apple-touch-icon" href="apple-touch-icon.png">\n' + "\n".join(liens_demarrage), 1)
    open(os.path.join(DIST, "index.html"), "w", encoding="utf-8").write(html)
    manifeste = {
        "name": "Gestion locative",
        "short_name": "Gestion SCI",
        "description": "Loyers, quittances, relances, baux et compta de tes biens.",
        "start_url": "./",
        "scope": "./",
        "display": "standalone",
        "background_color": "#f4f5f7",
        "theme_color": "#0f1b2d",
        "lang": "fr",
        "id": "./",
        "dir": "ltr",
        "orientation": "any",
        "categories": ["finance", "productivity", "business"],
        "shortcuts": [
            {"name": "À faire", "short_name": "À faire", "url": "./#afaire", "icons": [{"src": "icon-192.png", "sizes": "192x192"}]},
            {"name": "Loyers du mois", "short_name": "Loyers", "url": "./#loyers", "icons": [{"src": "icon-192.png", "sizes": "192x192"}]},
            {"name": "Compta", "short_name": "Compta", "url": "./#compta", "icons": [{"src": "icon-192.png", "sizes": "192x192"}]}
        ],
        "icons": [
            {"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
            {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"},
            {"src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
        ],
    }
    json.dump(manifeste, open(os.path.join(DIST, "manifest.webmanifest"), "w"), ensure_ascii=False, indent=1)
    version = vid
    json.dump(VERSION, open(os.path.join(DIST, "version.json"), "w", encoding="utf-8"))
    open(os.path.join(DIST, "sw.js"), "w").write(f"""// Garde l'appli disponible même avec une connexion faible. Version {version}
const V = "gestion-{version}";
const FICHIERS = ["./", "./index.html", "./supabase.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", e => {{ e.waitUntil(caches.open(V).then(c => c.addAll(FICHIERS.map(f => new Request(f, {{ cache: "reload" }}))))); self.skipWaiting(); }});
self.addEventListener("activate", e => {{ e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))); self.clients.claim(); }});
self.addEventListener("fetch", e => {{
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || u.pathname.endsWith("/version.json")) return; // version.json : toujours en ligne
  // Ouverture instantanée : la copie gardée sur l'appareil d'abord, la version en ligne est rangée pour la prochaine fois
  const net = fetch(e.request).then(r => {{ if (r.ok) {{ const c = r.clone(); caches.open(V).then(ca => ca.put(e.request, c)); }} return r; }});
  e.respondWith(caches.match(e.request, {{ ignoreSearch: true }}).then(r => r || net.catch(() => caches.match("./index.html"))));
  e.waitUntil(net.then(() => {{}}, () => {{}}));
}});
// Notifications : loyer reçu, retard, résumé du mois
self.addEventListener("push", e => {{
  let d = {{}}; try {{ d = e.data ? e.data.json() : {{}}; }} catch (x) {{ d = {{ titre: "Gestion locative", texte: e.data ? e.data.text() : "" }}; }}
  e.waitUntil(self.registration.showNotification(d.titre || "Gestion locative", {{ body: d.texte || "", icon: "icon-192.png", badge: "icon-192.png", tag: d.tag || undefined, data: {{ url: d.url || "./" }} }}));
}});
self.addEventListener("notificationclick", e => {{
  e.notification.close(); const url = new URL((e.notification.data || {{}}).url || "./", self.registration.scope).href;
  e.waitUntil(clients.matchAll({{ type: "window", includeUncontrolled: true }}).then(l => {{ const c = l.find(x => x.url.startsWith(self.registration.scope)); if (c) {{ c.navigate(url).catch(() => {{}}); return c.focus(); }} return clients.openWindow(url); }}));
}});
""")
    open(os.path.join(DIST, "_headers"), "w").write("/manifest.webmanifest\n  Content-Type: application/manifest+json\n/sw.js\n  Cache-Control: no-cache\n/index.html\n  Cache-Control: no-cache\n/version.json\n  Cache-Control: no-store\n/\n  Cache-Control: no-cache\n")
    print("dist/ prêt :", sorted(os.listdir(DIST)))


if __name__ == "__main__":
    main()

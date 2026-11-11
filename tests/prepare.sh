#!/bin/sh
# Prépare ce qu'il faut pour lancer les tests (bibliothèques servies en local + photos d'exemple)
set -e
cd "$(dirname "$0")"
mkdir -p vendor/jspdfpkg vendor/h2c
[ -f vendor/jspdfpkg/package/dist/jspdf.umd.min.js ] || (cd vendor/jspdfpkg && npm pack -s jspdf@2.5.1 >/dev/null && tar xzf jspdf-2.5.1.tgz)
[ -f vendor/h2c/package/dist/html2canvas.min.js ] || (cd vendor/h2c && npm pack -s html2canvas@1.4.1 >/dev/null && tar xzf html2canvas-1.4.1.tgz)
python3 -c "
from PIL import Image, ImageDraw
for i,c in enumerate([(200,120,90),(90,140,200)]):
  im=Image.new('RGB',(2400,1800),c); d=ImageDraw.Draw(im); d.rectangle([300,300,2100,1500],outline='white',width=30); im.save('photo%d.jpg'%i,quality=90)
"
echo "Prêt."

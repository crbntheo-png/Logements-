#!/bin/sh
# Prépare ce qu'il faut pour lancer les tests (bibliothèques servies en local + photos d'exemple)
set -e
cd "$(dirname "$0")"
mkdir -p vendor/jspdfpkg vendor/h2c vendor/pdfjs vendor/jszip vendor/xlsxpkg
[ -f vendor/xlsxpkg/package/xlsx.js ] || (cd vendor/xlsxpkg && npm pack -s xlsx@0.18.5 >/dev/null && tar xzf xlsx-0.18.5.tgz)
[ -f vendor/jszip/package/dist/jszip.min.js ] || (cd vendor/jszip && npm pack -s jszip@3.10.1 >/dev/null && tar xzf jszip-3.10.1.tgz)
[ -f vendor/jspdfpkg/package/dist/jspdf.umd.min.js ] || (cd vendor/jspdfpkg && npm pack -s jspdf@2.5.1 >/dev/null && tar xzf jspdf-2.5.1.tgz)
[ -f vendor/pdfjs/pdf.min.js ] || (cd vendor/pdfjs && npm pack -s pdfjs-dist@3.11.174 >/dev/null && tar xzf pdfjs-dist-3.11.174.tgz && cp package/build/pdf.min.js package/build/pdf.worker.min.js .)
[ -f vendor/h2c/package/dist/html2canvas.min.js ] || (cd vendor/h2c && npm pack -s html2canvas@1.4.1 >/dev/null && tar xzf html2canvas-1.4.1.tgz)
python3 -c "
from PIL import Image, ImageDraw
for i,c in enumerate([(200,120,90),(90,140,200)]):
  im=Image.new('RGB',(2400,1800),c); d=ImageDraw.Draw(im); d.rectangle([300,300,2100,1500],outline='white',width=30); im.save('photo%d.jpg'%i,quality=90)
"
python3 -c "
from PIL import Image, ImageDraw, ImageFont
im=Image.new('RGB',(900,1100),'white'); d=ImageDraw.Draw(im)
try: f=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',38); g=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf',44)
except Exception: f=g=ImageFont.load_default()
y=60
for t,ft in [('PLOMBERIE DUPONT',g),('12 rue des Artisans 95250 Beauchamp',f),('FACTURE N° 2026-118',f),('Date : 03/11/2026',f),('',f),('Remplacement chauffe-eau 200 L',f),('Main d oeuvre        180,00',f),('Fournitures          420,00',f),('',f),('Total HT             600,00',f),('TVA 10 %              60,00',f),('TOTAL TTC            660,00 €',g)]:
  d.text((60,y),t,fill='black',font=ft); y+=80
im.save('facture-test.png')"
mkdir -p shots73
[ -f shots73/bulletins.pdf ] || python3 -c "
from PIL import Image, ImageDraw
im=Image.new('RGB',(850,1100),'white'); d=ImageDraw.Draw(im); d.text((60,60),'BULLETIN DE PAIE - exemple pour les tests',fill='black'); im.save('shots73/bulletins.pdf')"
echo "Prêt."

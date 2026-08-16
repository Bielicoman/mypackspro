#!/bin/bash
# Instalador do My Packs Pro para macOS.
# Duplo-clique no Finder para executar.
set -e
ID="com.alexascencio.mypackspro"
HERE="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/Library/Application Support/Adobe/CEP/extensions/$ID"

echo
echo "  Instalando My Packs Pro..."
echo

if [ ! -f "$HERE/MyPacksPro.zxp" ]; then
  echo "  ERRO: MyPacksPro.zxp nao encontrado ao lado deste instalador."
  read -n 1 -s -r -p "  Pressione qualquer tecla."; exit 1
fi

if pgrep -x "Adobe Premiere Pro" >/dev/null 2>&1; then
  echo "  Feche o Premiere Pro antes de instalar."
  read -n 1 -s -r -p "  Pressione qualquer tecla."; exit 1
fi

# Um .zxp e um zip assinado: da para extrair sem ferramenta externa.
TMP="$(mktemp -d)"
cp "$HERE/MyPacksPro.zxp" "$TMP/pkg.zip"
unzip -q -o "$TMP/pkg.zip" -d "$TMP/x"

rm -rf "$DEST"
mkdir -p "$DEST"
cp -R "$TMP/x/." "$DEST/"
rm -rf "$TMP"

# Extensoes com certificado proprio precisam deste sinalizador, por utilizador.
for V in 10 11 12 13 14 15 16; do
  defaults write "com.adobe.CSXS.$V" PlayerDebugMode 1 2>/dev/null || true
done

# O ffmpeg embutido precisa de permissao de execucao apos a extracao.
chmod +x "$DEST/bin/mac/ffmpeg" "$DEST/bin/mac/ffprobe" 2>/dev/null || true

echo "  Instalado com sucesso."
echo
echo "  Abra o Premiere e va em:  Janela > Extensoes > My Packs Pro"
echo
read -n 1 -s -r -p "  Pressione qualquer tecla."

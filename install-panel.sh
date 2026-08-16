#!/usr/bin/env bash
# Instala o painel construido na pasta de extensoes CEP do utilizador.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
DEST="$APPDATA/Adobe/CEP/extensions/com.alexascencio.mypackspro"

if [ ! -f "$ROOT/dist/index.html" ]; then
  echo "dist/ ausente. Corra: npm run build" >&2
  exit 1
fi

bash "$ROOT/scripts-check-jsx.sh"

rm -rf "$DEST"
mkdir -p "$DEST"
cp -r "$ROOT/dist/." "$DEST/"
cp -r "$ROOT/CSXS" "$DEST/"
cp -r "$ROOT/jsx"  "$DEST/"
# O ffmpeg embutido vive em bin/win; sem ele o painel cai no PATH do sistema.
[ -d "$ROOT/bin" ] && cp -r "$ROOT/bin" "$DEST/"
[ -f "$ROOT/.debug" ] && cp "$ROOT/.debug" "$DEST/"

echo "Instalado em: $DEST"
echo "Reinicie o Premiere e abra Janela > Extensoes > My Packs Pro"

#!/usr/bin/env bash
# Obtem o FFmpeg (build LGPL) e o assinador de ZXP da Adobe.
#
# Nenhum dos dois vai para o repositorio: juntos passam dos 130 MB e sao
# software de terceiros. Este script deixa a arvore pronta para compilar.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$ROOT/.fetch-tmp"
mkdir -p "$TMP" "$ROOT/bin/win" "$ROOT/tools"

# --- FFmpeg (Windows) -------------------------------------------------------
# LGPL de proposito: a build GPL obrigaria a abrir o codigo deste plugin.
if [ ! -f "$ROOT/bin/win/ffmpeg.exe" ]; then
  echo ">> a obter o FFmpeg (LGPL)"
  URL="https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-lgpl-shared.zip"
  curl -L --fail -o "$TMP/ffmpeg.zip" "$URL"
  powershell -NoProfile -Command "Expand-Archive -LiteralPath '$TMP/ffmpeg.zip' -DestinationPath '$TMP/ff' -Force"
  SRC="$(dirname "$(find "$TMP/ff" -name ffmpeg.exe | head -1)")"
  cp "$SRC"/*.dll "$SRC/ffmpeg.exe" "$SRC/ffprobe.exe" "$ROOT/bin/win/"
  cp "$(dirname "$SRC")/LICENSE.txt" "$ROOT/bin/win/LICENSE-ffmpeg.txt"
  echo "   ffmpeg pronto"
fi

# --- FFmpeg (macOS) ---------------------------------------------------------
# O suporte a macOS esta preparado no codigo mas nao foi validado numa maquina
# Apple. Coloque aqui uma build LGPL estatica de ffmpeg e ffprobe (sem .exe) e
# o painel passa a encontra-los sozinho:
#
#   bin/mac/ffmpeg
#   bin/mac/ffprobe
#
# Verifique a licenca antes de distribuir: as builds macOS mais divulgadas sao
# GPL, o que obrigaria a abrir o codigo deste plugin.
mkdir -p "$ROOT/bin/mac"

# --- ZXPSignCmd -------------------------------------------------------------
if [ ! -f "$ROOT/tools/ZXPSignCmd.exe" ]; then
  echo ">> a obter o ZXPSignCmd (Adobe)"
  curl -L --fail -o "$ROOT/tools/ZXPSignCmd.exe" \
    "https://github.com/Adobe-CEP/CEP-Resources/raw/master/ZXPSignCMD/4.1.1/win64/ZXPSignCmd.exe"
  echo "   assinador pronto"
fi

rm -rf "$TMP"
echo
echo "Pronto. Falta o certificado de assinatura em cert/mypackspro.p12:"
echo "  ./tools/ZXPSignCmd.exe -selfSignedCert BR SP \"Seu Nome\" \"Seu Nome\" SENHA cert/mypackspro.p12 -validityDays 3650"

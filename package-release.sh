#!/usr/bin/env bash
# Monta a extensao, assina o ZXP e junta os instaladores em release/.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
# Correr sempre a partir da raiz: o vite e o npx dependem do cwd, e o rm do
# release falha se o shell estiver dentro dele.
cd "$ROOT"
ID="com.alexascencio.mypackspro"
OUT="$ROOT/release"
STAGE="$OUT/$ID"
SIGN="$ROOT/tools/ZXPSignCmd.exe"
P12PASS="mypackspro"

# O ZXPSignCmd e um executavel Windows: caminhos estilo Unix do Git Bash
# fazem-no rebentar com segmentation fault. Converter e obrigatorio.
win() { cygpath -w "$1"; }

bash "$ROOT/scripts-check-jsx.sh"

echo ">> build"
npx vite build >/dev/null

echo ">> a montar a extensao"
rm -rf "$OUT"
mkdir -p "$STAGE"
cp -r "$ROOT/dist/." "$STAGE/"
cp -r "$ROOT/CSXS" "$STAGE/"
cp -r "$ROOT/jsx"  "$STAGE/"
cp -r "$ROOT/icons" "$STAGE/"
[ -d "$ROOT/bin" ] && cp -r "$ROOT/bin" "$STAGE/"
# Mapas de codigo nao vao para producao: sao maiores que o proprio bundle.
find "$STAGE" -name "*.map" -delete
# O .debug abre uma porta de depuracao; nunca deve sair para o utilizador final.
rm -f "$STAGE/.debug"

echo ">> a assinar"
# Sem -tsa de proposito: a chamada ao servidor de timestamp faz o ZXPSignCmd
# rebentar nesta maquina. Em vez disso o certificado vale 10 anos, o que
# resolve o mesmo problema (assinatura continuar valida no futuro).
"$SIGN" -sign "$(win "$STAGE")" "$(win "$OUT")\MyPacksPro.zxp"         "$(win "$ROOT/cert/mypackspro.p12")" "$P12PASS" >/dev/null

echo ">> a verificar"
"$SIGN" -verify "$(win "$OUT")\MyPacksPro.zxp" -skipOnlineRevocationChecks | tail -1

echo ">> instaladores"
cp "$ROOT/installer/Instalar.bat"    "$OUT/"
cp "$ROOT/installer/Desinstalar.bat" "$OUT/"
cp "$ROOT/installer/LEIA-ME.txt"     "$OUT/"

# A pasta staged so serve para assinar; o .bat extrai do proprio .zxp.
rm -rf "$STAGE"
echo ">> zip"
( cd "$OUT" && powershell -NoProfile -Command     "Compress-Archive -Path 'MyPacksPro.zxp','Instalar.bat','Desinstalar.bat','LEIA-ME.txt' -DestinationPath 'MyPacksPro-instalador.zip' -Force" )

echo
echo "Pronto em: $OUT"
du -h "$OUT/MyPacksPro.zxp" "$OUT/MyPacksPro-instalador.zip" | sed "s|$OUT/|  |"

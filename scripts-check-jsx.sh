#!/usr/bin/env bash
# Valida a sintaxe do ExtendScript antes de instalar ou empacotar.
#
# Um unico erro de sintaxe no .jsx impede o ficheiro inteiro de carregar, e
# TODAS as funcoes do host desaparecem de uma vez: importar, inserir na
# timeline, copiar para o projeto. O painel so diz "o script do host falhou",
# sem indicar onde. Este teste apanha isso antes de sair daqui.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
TMP="${TEMP:-/tmp}/ap-jsx-check.cjs"
for f in "$ROOT"/jsx/*.jsx; do
  cp "$f" "$TMP"
  if ! node --check "$TMP" 2>/dev/null; then
    echo "ERRO de sintaxe em $(basename "$f"):" >&2
    node --check "$TMP" 2>&1 | head -8 >&2
    rm -f "$TMP"
    exit 1
  fi
done
rm -f "$TMP"
echo "jsx: sintaxe valida"

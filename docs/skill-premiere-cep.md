---
name: premiere-cep-plugin
description: |
  Construir plugins e painéis para Adobe Premiere Pro (e After Effects) com
  CEP. Use quando a tarefa envolver extensão do Premiere, painel CEP, CSXS,
  manifest.xml, ExtendScript/.jsx, ZXP, importar mídia para o projeto, inserir
  clipes na timeline por script, rótulos de cor, previews de mídia com ffmpeg,
  ou quando aparecer "Janela > Extensões". Contém factos medidos numa máquina
  real (Premiere 26.3.2 / CEP 12) e as armadilhas que custaram horas — leia
  antes de decidir arquitetura, não depois.
license: MIT
---

# Plugins CEP para o Premiere Pro

Conhecimento extraído da construção do **My Packs Pro** (painel de biblioteca de
assets, 2026). Tudo marcado como **medido** foi verificado empiricamente numa
máquina com Premiere Pro 26.3.2 — não é suposição nem documentação citada.

Referência de código funcional: <https://github.com/Bielicoman/mypackspro>

---

## 1. Antes de decidir arquitetura: faça os spikes

O erro mais caro é construir sobre uma suposição. Um painel de spike descartável
que responda tudo de uma vez custa 30 minutos e evita dias.

Um painel HTML+JS puro, sem build, que responda:

| Spike | Como | Mata o risco de |
|---|---|---|
| O painel carrega? | Aparece em Janela → Extensões | manifest errado |
| Node existe? | `typeof require`, `require('fs')`, `require('child_process')` | arquitetura inteira |
| Que codecs tocam? | `video.canPlayType(...)` numa matriz | formato dos previews |
| O arrasto chega ao host? | `dataTransfer.setData('com.adobe.cep.dnd.file.0', path)` | o gesto central |
| A API existe? | `item.reflect.methods` no ExtendScript | funções inventadas |
| Quantos players aguenta? | N `<video>` + contar FPS | travar o Premiere |

`reflect.methods` e `reflect.properties` do ExtendScript listam a API **real** em
runtime. É a única forma honesta de saber se um método existe nesta versão.

---

## 2. CEP ou UXP

**Use CEP se o produto precisa de arrastar arquivos para o Premiere.** O UXP não
consegue. Essa é a razão decisiva, não preferência.

CEP também dá, com um só manifest, Premiere + After Effects, Node completo e
`child_process`. O UXP é o futuro da Adobe, mas hoje perde nestes pontos.

---

## 3. Ambiente medido (Premiere 26.3.2, 08/2026)

```
CEP 12.0.1 · Chromium 99.0.4844.84 · Node 17.7.2
```

Consequências do Chromium 99: **não** há `:has()` nem container queries (ambos
Chromium 105+). Layout responsivo dentro do painel usa `ResizeObserver`.

`PlayerDebugMode=1` em `HKCU\Software\Adobe\CSXS.{10..16}` — sem isso extensões
não assinadas não carregam. No macOS: `defaults write com.adobe.CSXS.N PlayerDebugMode 1`.

Parâmetros obrigatórios no manifest:

```xml
<CEFCommandLine>
  <Parameter>--enable-nodejs</Parameter>
  <Parameter>--mixed-context</Parameter>
  <Parameter>--allow-file-access</Parameter>
  <Parameter>--allow-file-access-from-files</Parameter>
</CEFCommandLine>
```

Compile o painel como **IIFE**, não módulos ES: sob `file://` os módulos
esbarram em CORS mesmo com as flags acima.

---

## 4. Arrastar para o Premiere — o limite central

```js
e.dataTransfer.setData('com.adobe.cep.dnd.file.0', caminhoAbsoluto);
// vários: .file.0, .file.1, .file.2 …
```

**Medido:** varrendo ~50 extensões comerciais instaladas, os únicos tipos de
arrasto que o CEP expõe são `com.adobe.cep.dnd.file.N` e
`com.adobe.cep.dnd.pasteboardtype`. Não existe tipo de "item de projeto".

**Consequência:** a timeline **não aceita** arquivos largados nela. Só o painel
Projeto aceita. Nenhuma extensão contorna isso — nem as pagas.

Para colocar na timeline, importe e insira por ExtendScript. Ofereça os dois
gestos: arrastar → Projeto, duplo-clique → playhead.

O `dragend` não diz onde soltou. Para saber se saiu do painel, ouça `dragleave`
no `document` com `relatedTarget === null` — as coordenadas do `dragend` não são
fiáveis fora da janela.

---

## 5. Previews: codecs e licença

**Medido** com `canPlayType`:

| Formato | Resultado |
|---|---|
| WebM VP8 / VP9 | `probably` |
| MP4 H.264 + AAC | `probably` |
| MP4 H.265 · MOV · MKV | **não** |
| MP3 · AAC · Opus · FLAC | `probably` |

O CEF da Adobe **inclui** codecs proprietários. Mesmo assim, **gere proxies em
VP8**: codificar H.264 exige `libx264`, que é **GPL** e contaminaria um plugin
fechado. `libvpx` é BSD e funciona numa build **LGPL** do ffmpeg.

- Build LGPL para Windows: BtbN/FFmpeg-Builds, variante `lgpl-shared`
- **Não existe** build LGPL de macOS distribuível — as conhecidas (evermeet.cx)
  trazem x264/x265/xvid/vid.stab, que exigem `--enable-gpl`. No Mac, procure um
  ffmpeg já instalado.

Otimização: arquivo já leve e nativamente reproduzível (MP4/H.264, ≤1080p,
≤80 MB) dispensa proxy — aponte para o original.

**Áudio não precisa de ffmpeg.** `decodeAudioData` da Web Audio dá amostras e
duração numa passagem, o que permite desenhar a waveform em barras e colorir a
parte já tocada. Guarde os picos em cache, não uma imagem.

### Armadilhas do ffmpeg medidas

```bash
# ProRes 4444 com alfa (yuva444p12le) rebenta o libvpx:
#   "Transparency encoding with auto_alt_ref does not work"
-vf "scale=-2:240,format=yuv420p" -auto-alt-ref 0
```

Ficheiros grandes em drive sincronizada: um ProRes 4K de 216 MB leva **~57 s só
para ser lido**. Dê uma pista de concorrência estreita (2) aos pesados, senão o
disco estrangula e uns quantos falham. E ponha teto de tempo por processo.

O ffmpeg deixa **arquivo de 0 bytes** ao falhar. Cache válido é "existe **e** tem
conteúdo" — senão o preview partido fica preso para sempre.

---

## 6. ExtendScript — onde mais se perde tempo

**Um erro de sintaxe derruba o arquivo inteiro.** Todas as funções desaparecem
de uma vez, e o painel só diz `EvalScript error.` sem apontar a linha. Sintomas
espalhados (importar, inserir, copiar param juntos) quase sempre significam isso.

**Ponha um verificador no script de build** e aborte se falhar:

```bash
cp jsx/plugin.jsx "$TEMP/check.cjs" && node --check "$TEMP/check.cjs"
```

É **ES3**: sem `let`/`const`, sem `JSON`, sem `forEach`/`map`/`filter`.

Editar `.jsx` por script tem risco alto de `\n` virar quebra de linha real dentro
de string. **Verifique o resultado da substituição** em vez de imprimir sucesso.

### Receitas que funcionam

```js
// Item já no projeto? Reaproveite em vez de importar duplicado.
proj.importFiles([absPath], true, targetBin, false);
// importFiles devolve boolean — identifique o item novo por diff de nodeId
// ou procurando por getMediaPath().

// Inserir sem destruir: entre SEMPRE numa faixa acima do material existente.
// Se não houver livre, crie com QE (não documentado, confirme pela contagem):
app.enableQE();
qe.project.getActiveSequence().addTracks(1, numTracks, 0, 1, 0, 0, 0, 0);

// Deixe o clipe selecionado após inserir — o utilizador vai querer movê-lo.
clip.setSelected(true, true);
```

### Rótulos de cor

São **nomes em inglês** ("Violet", "Iris", "Caribbean"…), não índices. A cor de
cada nome vem das Preferências do utilizador — por isso o painel nunca consegue
espelhar a paleta dele. Mostre o **nome**.

```js
ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript');
var NS = 'http://ns.adobe.com/premierePrivateProjectMetaData/1.0/';
var xmp = new XMPMeta(item.getProjectMetadata());
xmp.setProperty(NS, 'Column.Intrinsic.Label', 'Violet');
item.setProjectMetadata(xmp.serialize(), ['Column.Intrinsic.Label']);
```

**Confirme por leitura.** Uma versão que grava o XMP sem alterar devolve sucesso
e não faz nada — foi um bug real neste projeto.

---

## 7. Desempenho com milhares de itens

Testado com 2.359 assets num painel. O que importou, por ordem de impacto:

1. **Não deixe `<video src>` vivo fora da vista.** Células não desmontam; ao rolar
   um pack inteiro acumulam-se milhares de elementos de vídeo a segurar buffers.
   Monte/desmonte por `IntersectionObserver`.
2. **Referências estáveis nas props.** Uma função nova a cada render (ou um
   objeto `{state}` criado na leitura) anula o `memo` de todas as células.
3. **Agrupe renders por quadro.** Cada transição de fila disparava um render
   completo; `requestAnimationFrame` transforma uma rajada num só.
4. `content-visibility: auto` nas células poupa pintura.
5. Gere previews **por viewport**, nunca tudo à entrada. Com cache em disco, cada
   arquivo é processado uma vez na vida.

---

## 8. Robustez do painel

**Error boundary é obrigatório.** Sem ele, qualquer exceção no render deixa o
painel **preto**, sem mensagem, e dentro do Premiere não há consola à mão. Com
ele, o utilizador lê o erro e pode repor definições sozinho.

**Definições persistidas precisam de merge com os valores padrão.** Um objeto
gravado por uma versão anterior não tem os campos novos; ler `settings.campoNovo`
sem merge dá `undefined` e rebenta o render. Bug real, e só atinge quem já usava.

Chame processos externos com cuidado no Windows:

- **Não** passe `windowsHide: true` ao abrir o Explorer — medido: com a flag o
  processo nasce com `SW_HIDE` e a janela abre **escondida**. Parece que o botão
  não faz nada.
- `explorer.exe /select,"caminho"` precisa de `windowsVerbatimArguments: true`,
  senão o Node volta a citar por cima e o Explorer recebe lixo.
- Sem ouvinte de `'error'`, uma falha de arranque nunca chega a quem chamou.

---

## 9. Empacotar e distribuir

```bash
# certificado próprio, 10 anos (evita depender de timestamp)
ZXPSignCmd -selfSignedCert BR SP "Nome" "Nome" SENHA cert.p12 -validityDays 3650
ZXPSignCmd -sign <pastaExtensao> saida.zxp cert.p12 SENHA
```

- O `ZXPSignCmd` vem de `Adobe-CEP/CEP-Resources` no GitHub.
- **Caminhos Windows obrigatórios** — caminhos estilo Unix do Git Bash fazem-no
  rebentar com segmentation fault. Use `cygpath -w`.
- **Não use `-tsa`**: a chamada ao servidor de timestamp provoca o mesmo crash.
  Um certificado longo resolve o mesmo problema.
- Um `.zxp` é um **zip assinado**: o instalador `.bat`/`.command` pode extrair
  dele, evitando empacotar a extensão duas vezes.
- No macOS, o zip **não preserva permissão de execução** — faça `chmod +x` nos
  binários depois de extrair.

Nunca versione: certificado `.p12` (assina em seu nome), binários de terceiros,
`.debug` (abre porta de depuração).

---

## 10. Método que evitou a maior parte dos bugs

- **Vá olhar em vez de deduzir.** Extensões comerciais instaladas na máquina são
  documentação viva: `grep` nos bundles delas respondeu o que a documentação da
  Adobe não responde.
- **Quando o sintoma for ambíguo, meça.** "O Explorer não abre" parecia problema
  de aspas; era a janela nascer escondida. Descoberto contando janelas abertas,
  não relendo código.
- **Reproduza o comando exato fora do plugin.** Os `.mov` sem preview pareciam
  formato não suportado; rodando o ffmpeg à mão, o erro estava escrito.
- **Verifique que a edição pegou.** Scripts que imprimem sucesso sem conferir
  levam a construir sobre mudanças que não aconteceram.
- **Diga o que não sabe.** Marcar "não verificado" vale mais que uma promessa que
  quebra na frente do utilizador.

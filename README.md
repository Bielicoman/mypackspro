# My Packs Pro

**Sua biblioteca de assets, dentro do Premiere.**

Aponte para uma pasta do seu PC e tenha todos os seus packs de edição — SFX, VFX,
overlays, trilhas, memes — numa grade visual com preview animado, prontos para
arrastar para a timeline.

Sem enviar nada para a nuvem. Sem mover seus arquivos de lugar.

<!-- TODO: substituir por captura real do painel -->

---

## O que ele faz

| | |
|---|---|
| **Preview de tudo** | Vídeo roda sozinho na grade; áudio toca ao passar o mouse, com waveform e agulha de reprodução |
| **Suas pastas viram categorias** | As subpastas do pack já são a organização — nada para configurar |
| **Direto para a edição** | Duplo-clique insere no playhead; arrastar leva para o painel Projeto |
| **Nunca come seu vídeo** | A inserção sempre entra numa faixa **acima** do que já existe, criando faixa nova se precisar |
| **Cópia para o projeto** | O asset é copiado para junto do `.prproj`, então desligar o SSD não deixa mídia offline |
| **Organização automática** | Cada categoria pode ter pasta de destino e rótulo de cor próprios — o asset chega ao projeto já arrumado |
| **Feito para packs grandes** | Testado com 2.359 assets; previews gerados sob demanda e guardados em cache |

Formatos: **138 extensões** — vídeo, áudio, imagem, RAW, MOGRT, LUT, PSD, projetos.
O que o Premiere não importa fica escondido, para a grade só mostrar o que serve.

---

## Instalação

1. Baixe o instalador em [**Releases**](../../releases/latest)
2. Feche o Premiere Pro
3. Duplo-clique em **`MyPacksPro.zxp`** — abre no [ZXP Installer](https://aescripts.com/learn/zxp-installer/) (gratuito)
   *Sem ele? Use o `Instalar.bat` que vem no pacote.*
4. Abra o Premiere: **Janela → Extensões → My Packs Pro**

O FFmpeg já vem incluído. Não é preciso instalar mais nada.

**Requisitos:** Windows · Premiere Pro 24.0 ou superior (testado no 26.x)

---

## Como usar

**Adicionar um pack** — clique em **+** no topo e escolha a pasta.
As subpastas viram categorias na lista à esquerda.

**Levar para a edição**
- **Duplo-clique** → insere no playhead, numa faixa livre acima
- **Arrastar** → importa para o painel Projeto, de onde você arrasta para a
  posição exata que quiser

**Organizar automaticamente** — botão direito numa categoria:
- *Definir pasta de destino* — escreva `03 SFX` e todo asset dessa categoria é
  copiado para `<projeto>/03 SFX/`. Um nome relativo continua funcionando quando
  você muda de projeto.
- *Rótulo no projeto* — escolha uma das 16 cores do Premiere.

Ambas as regras são **herdadas**: definir em `SFX` já vale para `SFX/Whoosh`.

**Rodapé** — slider do tamanho da grade, play/pause das reproduções automáticas
(o hover continua tocando) e as configurações.

---

## Compilar a partir do código

```bash
npm install
bash scripts/fetch-ffmpeg.sh   # baixa FFmpeg (LGPL) e o assinador da Adobe
npm test
bash install-panel.sh          # instala no Premiere para desenvolver
```

Para gerar o instalador assinado, crie primeiro um certificado — o script
`fetch-ffmpeg.sh` mostra o comando — e depois:

```bash
bash package-release.sh
```

### Como está organizado

```
src/core/    Lógica pura, sem Premiere e sem Node. É onde vivem os testes.
src/node/    Sistema de arquivos, FFmpeg e cache. Só corre dentro do painel.
src/host/    Ponte para o ExtendScript do Premiere.
src/panel/   Interface em React.
jsx/         ExtendScript: importar, inserir na timeline, rótulos.
```

O painel roda em **CEP** e não em UXP por um motivo concreto: o UXP não consegue
arrastar arquivos do painel para o Premiere, e esse gesto é o coração do produto.

---

## Licença

Código à vista, **não livre**. Você pode ler, estudar e compilar para uso
próprio; redistribuir ou publicar versões modificadas exige autorização.
Veja [LICENSE](LICENSE).

Inclui FFmpeg sob LGPL — detalhes em `bin/win/LEIA-ME-ffmpeg.txt`.

---

<p align="center">
  feito por <a href="https://github.com/">Alex Ascencio</a>
</p>

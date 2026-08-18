---
name: premiere-create-plugin
description: |
  Desenvolvimento profissional completo de extensões, plugins e ferramentas para Adobe Premiere Pro.
  Cobre UXP, CEP, ExtendScript/JSX, Premiere Pro DOM, C++ SDK, painéis dockáveis, automação de timeline,
  previews FFmpeg, empacotamento ZXP/CCX, instalação e distribuição.
license: MIT
---

# Skill: Desenvolvimento Profissional de Extensões, Plugins e Ferramentas para Adobe Premiere Pro

## 0. IDENTIDADE DA SKILL

Esta skill deve capacitar um agente de IA a projetar, programar, testar, depurar, empacotar, instalar, distribuir, publicar e manter ferramentas profissionais para Adobe Premiere Pro.

Ela cobre:

* UXP Plugins
* CEP Extensions
* ExtendScript / JSX
* Premiere Pro DOM
* Scripts de automação
* C++ SDK / Native Plugins
* UXP Hybrid Plugins
* painéis dockáveis
* comandos
* menus
* automação de projetos
* importação de mídia
* manipulação de sequências
* tracks
* clips
* markers
* metadados
* XMP
* rótulos de projeto
* presets
* Motion Graphics Templates / MOGRT
* previews
* thumbnails
* waveform
* FFmpeg
* processamento de mídia
* download e ingestão de arquivos
* integração com APIs externas
* autenticação
* websites
* servidores
* GitHub
* GitHub Releases
* GitHub Actions
* Vercel
* distribuição direta
* Adobe Creative Cloud Marketplace
* `.ccx`
* `.zxp`
* certificados
* instalação
* atualização
* versionamento
* CI/CD
* segurança
* desempenho
* compatibilidade
* troubleshooting
* testes reais dentro do Premiere
* investigação de APIs não documentadas
* engenharia reversa controlada
* diagnóstico de limitações do host

---

# 1. REGRA PRINCIPAL: NÃO INVENTAR CAPACIDADES DO PREMIERE

A regra mais importante desta skill é:

> Nunca assumir que uma API existe apenas porque seria logicamente útil.

Antes de implementar uma função:

1. procurar na documentação oficial;
2. procurar no SDK/API de referência;
3. procurar nos samples oficiais;
4. procurar em issues/repos oficiais;
5. procurar em código funcional;
6. testar a API dentro da versão real do Premiere;
7. verificar o retorno real;
8. só então implementar.

Quando possível, usar introspecção do objeto/API.

Em ExtendScript, quando disponível:

```js
item.reflect.methods
item.reflect.properties
```

Isso permite descobrir o que realmente existe no runtime.

Esse princípio é especialmente importante porque versões do Premiere, CEP, UXP e do DOM podem divergir.

A documentação oficial atual recomenda estudar o Premiere DOM e os samples UXP, e o repositório oficial de samples possui inclusive um painel `premiere-api` criado para explorar grande parte da superfície da API.

---

# 2. PRIMEIRA DECISÃO: QUAL TECNOLOGIA USAR?

Nunca começar codificando.

Primeiro classificar o problema.

## 2.1 UXP

Preferir UXP quando:

* o projeto será novo;
* Premiere 25.6+ é requisito aceitável;
* a API UXP necessária existe;
* o plugin não depende de recursos exclusivos do CEP;
* é importante utilizar JavaScript moderno;
* o plugin precisa de uma arquitetura moderna;
* deseja-se distribuição `.ccx`;
* deseja-se caminhar para o ecossistema futuro da Adobe.

UXP é a plataforma moderna de extensibilidade do Premiere. A Adobe documenta UXP como plataforma baseada em JavaScript moderno, HTML e CSS, com APIs próprias e APIs específicas do Premiere. Para Premiere, a documentação atual considera UXP a geração de extensibilidade para versões 25.6+.

UXP não é um navegador comum.

Não presumir que tudo que funciona em Chrome funciona no UXP. A Adobe deixa explícito que o ambiente UXP não oferece todas as APIs, elementos HTML, CSS e comportamentos de um navegador tradicional.

---

# 2.2 CEP

Usar CEP quando:

* o projeto precisa de capacidades legadas;
* existe código ExtendScript importante;
* existe integração madura com `CSInterface.js`;
* o projeto precisa das características específicas do CEP;
* o plugin já é CEP e migrar agora seria caro;
* algum comportamento necessário ainda não está equivalente no UXP;
* o requisito real envolve um fluxo que depende do modelo CEP/host;
* testes reais demonstram que UXP não cobre a necessidade.

CEP continua sendo a plataforma clássica de extensões HTML/CSS/JS da Adobe Creative Cloud.

O repositório oficial Adobe-CEP/CEP-Resources mantém a documentação, samples, `CSInterface.js`, recursos para CEP 12, ferramenta `ZXPSignCmd` e materiais de instalação.

CEP não deve ser automaticamente considerado “errado” apenas por ser legado.

Ele deve ser tratado como tecnologia legada, porém ainda extremamente útil quando o requisito exige sua arquitetura.

---

# 2.3 ExtendScript / JSX

ExtendScript é a camada clássica de automação de aplicativos Adobe.

Usar quando:

* a API necessária só está disponível dessa forma;
* o projeto utiliza CEP;
* é necessário manipular o DOM tradicional do Premiere;
* é necessário realizar operações host-side que o frontend não consegue executar diretamente.

No CEP, normalmente a arquitetura é:

```text
HTML
  ↓
JavaScript
  ↓
CSInterface
  ↓
evalScript()
  ↓
ExtendScript / JSX
  ↓
Premiere
```

Não misturar conceitos:

* JavaScript do painel ≠ ExtendScript;
* Node.js ≠ ExtendScript;
* DOM do navegador ≠ DOM do Premiere;
* UXP DOM ≠ ExtendScript DOM.

---

# 2.4 C++ SDK

Usar o C++ SDK quando o produto exige integração em baixo nível.

Exemplos:

* codecs;
* formatos;
* efeitos;
* transições;
* processamento nativo;
* integração com hardware;
* processamento de áudio;
* processamento de vídeo;
* integração profunda com pipeline de mídia;
* operações que JavaScript não consegue executar de forma adequada.

A própria Adobe descreve o C++ SDK como a opção para integrações poderosas de baixo nível.

Não usar C++ apenas porque “parece mais profissional”.

C++ adiciona:

* compilação;
* gerenciamento de memória;
* compatibilidade por arquitetura;
* compatibilidade Windows/macOS;
* assinatura;
* distribuição de binários;
* manutenção;
* debugging nativo;
* aumento de complexidade.

---

# 2.5 UXP Hybrid Plugin

UXP também possui uma arquitetura híbrida que permite carregar bibliotecas nativas C++ através de arquivos `.uxpaddon`.

Isso é particularmente útil para:

* processamento pesado;
* análise de áudio;
* análise de waveform;
* processamento de imagem;
* OpenCV;
* bibliotecas nativas;
* codecs;
* DSP;
* pipelines especializados;
* integração com SDKs proprietários.

A Adobe documenta Hybrid Plugins como uma forma de combinar JavaScript com bibliotecas C++ nativas carregadas em runtime.

No momento da elaboração desta skill, a documentação da Adobe indica Premiere 26.2 como requisito mínimo para Hybrid Plugins. Isso deve ser tratado como informação versionada e sempre revalidado antes da distribuição.

---

# 3. MATRIZ DE DECISÃO

Antes de iniciar qualquer projeto, produzir uma tabela semelhante a:

| Necessidade                    | Tecnologia prioritária               |
| ------------------------------ | ------------------------------------ |
| Painel moderno                 | UXP                                  |
| Menu/comando moderno           | UXP                                  |
| Premiere 25.6+                 | UXP                                  |
| Plugin novo sem legado         | UXP                                  |
| Extensão antiga                | CEP                                  |
| ExtendScript existente         | CEP + JSX                            |
| Fluxo que exige tecnologia CEP | CEP                                  |
| Automação host-side clássica   | ExtendScript                         |
| Codec                          | C++ SDK                              |
| Efeito nativo                  | C++ SDK                              |
| Integração hardware            | C++ SDK                              |
| Cálculo pesado                 | UXP Hybrid ou C++                    |
| Processamento externo          | FFmpeg / app auxiliar                |
| Website                        | HTML/React/Next.js etc.              |
| Backend                        | servidor/API                         |
| Download                       | frontend + backend quando necessário |
| Marketplace atual              | UXP `.ccx`                           |
| Extensão clássica distribuída  | CEP `.zxp`                           |

Nunca decidir exclusivamente pela preferência do programador.

Decidir pelas capacidades reais exigidas pelo produto.

---

# 4. REGRA DE SPIKES

Antes de construir o produto inteiro, criar uma versão descartável mínima.

Um spike deve responder às perguntas que poderiam destruir a arquitetura.

Exemplos:

```text
O painel abre?
A API existe?
Consigo importar?
Consigo inserir?
Consigo acessar a sequência?
Consigo criar track?
Consigo acessar metadata?
Consigo reproduzir o preview?
Consigo fazer drag?
Consigo iniciar FFmpeg?
Consigo acessar a rede?
Consigo autenticar?
Consigo instalar?
Consigo empacotar?
Consigo atualizar?
Funciona no Windows?
Funciona no macOS?
Funciona com Premiere Beta?
```

Um spike de 30 minutos pode evitar dias de desenvolvimento errado.

---

# 5. CONHECIMENTO EMPÍRICO DO PROJETO MYPACKS PRO

Os itens desta seção foram medidos no projeto My Packs Pro e não devem ser tratados automaticamente como especificações universais para todas as versões futuras.

A máquina utilizada tinha:

```text
Premiere Pro 26.3.2
CEP 12.0.1
Chromium 99.0.4844.84
Node 17.7.2
```

Esses dados foram medidos empiricamente durante o projeto original.

Na máquina testada:

* Chromium era 99;
* `:has()` não estava disponível;
* container queries não estavam disponíveis;
* `ResizeObserver` foi utilizado para responsividade;
* `PlayerDebugMode` era necessário para extensões CEP não assinadas.

O arquivo original também registra a utilização das chaves `CSXS.{10..16}` no Windows e `defaults write com.adobe.CSXS.N PlayerDebugMode 1` no macOS para ambiente de desenvolvimento.

Esses valores são **dados de ambiente**, não regras eternas.

Sempre medir novamente em outra versão.

---

# 6. CEP: ESTRUTURA BÁSICA

Uma estrutura clássica:

```text
my-plugin/
├── CSXS/
│   └── manifest.xml
├── client/
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── assets/
├── jsx/
│   └── host.jsx
├── node_modules/
├── package.json
├── build/
└── dist/
```

A separação entre frontend e host-side é recomendada na documentação de introdução da Adobe para CEP.

O `manifest.xml` informa ao host:

* identidade da extensão;
* versão;
* hosts compatíveis;
* entrypoint;
* tamanho;
* parâmetros;
* características do runtime;
* configurações CEP.

---

# 7. CEP E NODE.JS

CEP pode disponibilizar Node.js.

O modo mixed-context foi introduzido para colocar o Node e o código JavaScript do painel no mesmo contexto de forma mais conveniente. A documentação oficial do CEP descreve `--enable-nodejs` e `--mixed-context`.

Exemplo:

```xml
<CEFCommandLine>
    <Parameter>--enable-nodejs</Parameter>
    <Parameter>--mixed-context</Parameter>
</CEFCommandLine>
```

Em projetos CEP que dependam desses recursos, validar cuidadosamente:

```js
typeof require
```

e:

```js
require("fs")
```

e:

```js
require("child_process")
```

Não presumir que estar dentro de CEP significa automaticamente que qualquer módulo Node funcionará.

---

# 8. CEP E CONTEXTOS

Pensar em CEP como múltiplos contextos:

```text
Browser Context
      ↓
Native / cep
      ↓
Node Context
      ↓
Host App Context
```

O cookbook oficial de CEP diferencia Browser Context, Native Context, Node Context e Host Application Context.

O host application context é normalmente acessado por:

```js
csInterface.evalScript(...)
```

---

# 9. CEP E ExtendScript

Exemplo:

```js
const cs = new CSInterface();

cs.evalScript(
    'myFunction()',
    function(result) {
        console.log(result);
    }
);
```

O `.jsx` precisa existir e ser carregado no runtime.

Exemplo:

```js
var jsxPath =
    cs.getSystemPath(SystemPath.EXTENSION) +
    "/jsx/host.jsx";

cs.evalScript(
    '$.evalFile("' + jsxPath + '");',
    function(result) {
        console.log(result);
    }
);
```

O cookbook e os samples da Adobe demonstram o carregamento de arquivos JSX e uso de `evalScript`.

---

# 10. A ARMADILHA DO EXTENDSCRIPT

ExtendScript tradicional deve ser tratado como linguagem de compatibilidade antiga.

No ambiente legado:

* não assumir `let`;
* não assumir `const`;
* não assumir `JSON`;
* não assumir `forEach`;
* não assumir `map`;
* não assumir `filter`;
* não assumir APIs modernas do JavaScript.

No projeto original, isso foi identificado como uma causa importante de erros.

Um erro de sintaxe pode derrubar a definição inteira do arquivo JSX.

O sintoma no painel pode ser simplesmente:

```text
EvalScript error.
```

Consequentemente:

```text
uma função falha
↓
parece que uma operação específica quebrou
↓
mas o problema real pode ser uma sintaxe inválida em outra parte do arquivo
```

---

# 11. VALIDAR JSX AUTOMATICAMENTE

Sempre colocar uma validação no build.

Exemplo:

```bash
cp jsx/plugin.jsx "$TEMP/check.cjs"
node --check "$TEMP/check.cjs"
```

Isso não garante compatibilidade semântica com o ExtendScript, mas detecta vários erros de sintaxe.

Também validar:

* strings;
* escapes;
* caminhos;
* aspas;
* caracteres Unicode;
* concatenação dinâmica.

---

# 12. NÃO EDITAR JSX POR STRING SEM VERIFICAR O RESULTADO

Antipadrão:

```js
replace(...)
console.log("sucesso")
```

sem verificar o arquivo resultante.

Um problema comum é:

```text
"\n"
```

ser transformado de maneira incorreta durante uma substituição.

Sempre:

1. executar alteração;
2. reler arquivo;
3. conferir trecho;
4. validar sintaxe;
5. só então declarar sucesso.

---

# 13. PREMIERE DOM

O Premiere DOM representa o projeto e seus objetos.

Pode envolver:

* Project;
* ProjectItem;
* Sequence;
* Track;
* TrackItem;
* Clip;
* Marker;
* metadata;
* efeitos;
* transições;
* exportação;
* mídia.

Na UXP moderna, o Premiere DOM é carregado através do módulo:

```js
const app = require("premierepro");
```

A documentação da Adobe descreve o Premiere DOM como a camada para manipulação de projetos, sequências, tracks, clips, markers, mídia, efeitos e exportações.

---

# 14. DIFERENÇA ENTRE UX P E EXTENDSCRIPT

Não assumir que:

```text
ExtendScript API = UXP API
```

Nem:

```text
Método antigo = método UXP
```

Nem:

```text
Objeto antigo = objeto novo
```

O correto é procurar na documentação da tecnologia utilizada.

---

# 15. IMPORTAÇÃO DE MÍDIA

Uma arquitetura robusta deve evitar importar o mesmo arquivo infinitas vezes.

No modelo clássico, uma abordagem pode verificar:

```js
proj.importFiles(...)
```

e depois encontrar o item inserido através de:

* diferença de nodeId;
* procura por caminho;
* busca na árvore do projeto;
* outras identificações disponíveis.

No projeto original, `importFiles()` devolveu boolean, então foi recomendado localizar o item novo por diff ou caminho.

Não criar duplicatas sem necessidade.

---

# 16. INSERÇÃO NA TIMELINE

Sempre distinguir:

```text
importar arquivo
```

de:

```text
inserir arquivo na sequência
```

São operações diferentes.

Um painel pode:

1. receber arquivo;
2. importar;
3. encontrar o ProjectItem;
4. encontrar a sequência ativa;
5. encontrar faixa;
6. inserir;
7. selecionar;
8. mover playhead.

---

# 17. DRAG-AND-DROP NO CEP

No CEP existe suporte a tipos de drag específicos.

Um mecanismo utilizado:

```js
event.dataTransfer.setData(
    "com.adobe.cep.dnd.file.0",
    absolutePath
);
```

Para múltiplos arquivos:

```text
com.adobe.cep.dnd.file.0
com.adobe.cep.dnd.file.1
com.adobe.cep.dnd.file.2
...
```

No projeto original, o comportamento foi testado contra cerca de 50 extensões comerciais instaladas.

Foi observado que os formatos expostos pelo CEP eram:

```text
com.adobe.cep.dnd.file.N
com.adobe.cep.dnd.pasteboardtype
```

e não existia um tipo genérico documentado de “Project Item”.

---

# 18. LIMITAÇÃO CRÍTICA DO DRAG CEP

Não assumir:

```text
drag do painel → qualquer lugar do Premiere
```

O teste empírico do projeto original mostrou:

```text
painel → Project panel
```

funciona como arquivo.

Mas:

```text
painel → timeline
```

não pode ser tratado como se o Premiere aceitasse o mesmo arquivo através de um drop arbitrário.

A solução arquitetural observada foi:

```text
Drag
  ↓
Project
```

e:

```text
Double Click
  ↓
Import
  ↓
Insert at playhead
```

Isso evita tentar forçar um comportamento que o host não oferece.

---

# 19. DROP TARGET E DETECÇÃO DE SAÍDA DO PAINEL

O evento:

```js
dragend
```

não deve ser considerado suficiente para saber onde o usuário soltou fora da janela.

No projeto original, a recomendação foi observar:

```js
dragleave
```

no:

```text
document
```

e verificar:

```js
relatedTarget === null
```

porque coordenadas de `dragend` fora da janela não eram confiáveis.

---

# 20. UXP: MANIFEST.JSON

UXP utiliza:

```text
manifest.json
```

O manifest define:

* ID;
* nome;
* versão;
* ícones;
* host;
* entrypoints;
* permissões;
* compatibilidade;
* capabilities.

A documentação atual da Adobe trata o manifest como o centro de identidade, compatibilidade, permissões e entrypoints do plugin.

---

# 21. UXP ENTRYPOINTS

Um plugin UXP pode conter:

* Commands;
* Panels;
* múltiplas instâncias de ambos.

A Adobe descreve Commands como ações e Panels como interfaces persistentes e dockáveis.

Arquitetura possível:

```text
Plugin
├── Command: Import Assets
├── Command: Build Sequence
├── Panel: Browser
├── Panel: Settings
└── Panel: Inspector
```

Não é obrigatório ter apenas uma interface.

---

# 22. UXP DEVELOPER TOOL

O fluxo oficial atual utiliza:

```text
Premiere Pro
+
UXP Developer Tool
+
Code Editor
```

A Adobe atualmente documenta Premiere 25.6+, UXP Developer Tool 2.2+ e um editor como VS Code/Cursor como base para começar um plugin UXP.

O Developer Mode deve estar habilitado em:

```text
Settings
→ Plugins
→ Enable developer mode
```

e o Premiere precisa ser reiniciado.

---

# 23. UXP UI

UXP permite:

* HTML;
* CSS;
* JavaScript;
* componentes Spectrum UXP;
* interfaces responsivas.

Spectrum UXP é especialmente útil quando se deseja um visual coerente com o ecossistema Adobe.

Não desenvolver uma UI enorme antes de validar o espaço real do painel.

O painel precisa funcionar em:

```text
largura pequena
largura média
largura grande
altura pequena
altura grande
```

---

# 24. RESPONSIVIDADE

Não depender de recursos modernos de CSS sem verificar o runtime.

No CEP medido do projeto original, Chromium 99 não oferecia recursos como:

```css
:has()
```

e:

```css
container queries
```

Portanto:

```text
ResizeObserver
+
CSS tradicional
```

foi utilizado.

No UXP atual, revalidar suporte antes de usar APIs web modernas.

---

# 25. UXP NÃO É UMA WEB APP NORMAL

Nunca assumir:

```js
window.location
```

ou:

```js
navigator
```

ou:

```js
fetch
```

ou:

```js
document
```

com exatamente o mesmo comportamento de Chrome.

UXP tem uma implementação própria e somente parte do modelo web.

A Adobe enfatiza explicitamente que UXP não é um navegador completo.

---

# 26. SISTEMA DE PERMISSÕES UXP

UXP utiliza permissões explícitas.

Exemplos:

```text
network
launchProcess
filesystem
clipboard
```

Não pedir permissões desnecessárias.

Quanto menos permissões:

* menor superfície de ataque;
* menor fricção na instalação;
* mais fácil aprovação;
* mais fácil explicar ao usuário.

---

# 27. UXP FILESYSTEM

O filesystem UXP utiliza um modelo de sandbox.

O ambiente possui áreas específicas para:

* plugin;
* dados persistentes;
* arquivos temporários.

A documentação da Adobe destaca que a pasta de dados é persistente entre atualizações, enquanto a pasta temporária pode ser limpa.

Não armazenar dados essenciais em local temporário.

---

# 28. LOCALSTORAGE

`localStorage` pode ser utilizado para preferências simples.

Exemplo:

```js
localStorage.setItem(
    "settings",
    JSON.stringify(settings)
);
```

Mas não armazenar:

* senhas;
* tokens secretos;
* credenciais sensíveis.

A documentação da Adobe recomenda storage seguro para informações confidenciais.

Também fazer merge entre defaults e settings antigos.

Exemplo:

```js
const defaults = {
    theme: "dark",
    previewQuality: "medium",
    maxConcurrentJobs: 2
};

const saved = loadSettings();

const settings = {
    ...defaults,
    ...saved
};
```

No CEP, implementar equivalente compatível com a tecnologia usada.

---

# 29. NETWORK NO UXP

Por padrão, o plugin UXP não deve simplesmente acessar qualquer domínio.

É necessário declarar permissões de rede.

Exemplo conceitual:

```json
{
  "requiredPermissions": {
    "network": {
      "domains": [
        "https://api.example.com"
      ]
    }
  }
}
```

A documentação atual da Adobe indica que URLs não declaradas podem falhar por permissão. Também recomenda HTTPS, especialmente no macOS.

Usos:

* APIs;
* autenticação;
* download;
* catálogo;
* licenciamento;
* cloud storage;
* banco remoto;
* atualizações;
* analytics;
* sincronização.

---

# 30. FETCH

UXP oferece:

```js
fetch(...)
```

Além de:

```text
XMLHttpRequest
WebSocket
```

A própria Adobe recomenda `fetch()` para a maioria das necessidades HTTP e exige permissão apropriada no manifest.

Sempre:

```js
try {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
} catch (error) {
    console.error(error);
}
```

Adicionar:

* timeout;
* retry controlado;
* abort;
* mensagens amigáveis;
* fallback offline.

---

# 31. CORS

CEP e UXP podem ser afetados por políticas de origem.

No CEP, versões posteriores passaram a aplicar restrições de CORS mais severas em alguns cenários; a documentação oficial de CEP 11 registra problemas quando o endpoint não fornece cabeçalhos `Access-Control-Allow-Origin`.

Nunca resolver CORS desativando segurança em produção.

A solução correta geralmente é:

```text
Plugin
  ↓
API própria
  ↓
serviço remoto
```

ou:

```text
Plugin
  ↓
backend
  ↓
API externa
```

---

# 32. AUTENTICAÇÃO

Nunca colocar segredo de servidor dentro do plugin.

Isto é inseguro:

```js
const secret = "SUPER_SECRET_KEY";
```

porque o usuário possui os arquivos do plugin.

O plugin deve, quando necessário:

```text
Plugin
  ↓
login/OAuth
  ↓
backend
  ↓
token limitado
```

A documentação oficial de samples do Premiere inclui até um exemplo de workflow OAuth com Dropbox e um servidor Node.js intermediário.

---

# 33. SHELL / PROCESSOS EXTERNOS NO UXP

UXP possui APIs `shell` para abrir arquivos e aplicativos.

Exemplo:

```js
const { shell } = require("uxp");

await shell.openPath(
    path,
    "Abrir o arquivo gerado"
);
```

ou:

```js
await shell.openExternal(
    "https://example.com",
    "Abrir o site"
);
```

Mas isso requer permissões apropriadas e consentimento do usuário.

Não assumir que isso equivale a:

```text
child_process.spawn()
```

do Node.

UXP e CEP possuem modelos de segurança diferentes.

---

# 34. CLIPBOARD

UXP permite:

```text
navigator.clipboard
```

com operações como:

```text
setContent()
getContent()
```

Mas clipboard também possui permissões.

A Adobe recomenda utilizar a menor permissão necessária, por exemplo `read` quando só for necessário ler.

---

# 35. CEP + NODE + CHILD_PROCESS

Em CEP, quando Node estiver habilitado, pode haver integração com processos do sistema.

Exemplo conceitual:

```js
const { spawn } = require("child_process");
```

Isso é extremamente útil para:

* FFmpeg;
* scripts Python;
* utilitários;
* conversores;
* serviços locais;
* análise de mídia.

Porém:

```text
Node disponível
≠
qualquer processo é seguro
```

Validar:

* caminhos;
* escaping;
* argumentos;
* permissões;
* shell injection;
* processos pendurados;
* stdout;
* stderr;
* timeout;
* encerramento.

---

# 36. WINDOWS: EXPLORER

Um erro real encontrado no projeto foi a abertura do Explorer.

Não usar:

```js
windowsHide: true
```

quando a intenção é abrir uma janela visível.

No teste original, o processo nasceu com `SW_HIDE`, fazendo parecer que o botão simplesmente não funcionava. Também foi necessário `windowsVerbatimArguments: true` ao usar:

```text
explorer.exe /select,"path"
```

porque sem isso a dupla cotação podia ser tratada incorretamente.

Sempre instalar listener:

```js
process.on("error", ...)
```

para capturar falhas de inicialização.

---

# 37. PREVIEWS

Nunca presumir que:

```text
Premiere consegue reproduzir
```

significa:

```text
CEP/UXP consegue reproduzir
```

São ambientes diferentes.

No ambiente CEP testado do My Packs Pro, a matriz de `canPlayType()` observou:

```text
WebM VP8      probably
WebM VP9      probably
MP4 H.264     probably
MP4 AAC       probably
MP3           probably
AAC           probably
Opus          probably
FLAC          probably

H.265         não
MOV           não
MKV           não
```

Isso foi medido no ambiente específico, não deve ser generalizado para toda versão do Premiere.

---

# 38. NÃO CODIFICAR TUDO DESNECESSARIAMENTE

Antes de criar proxy:

```text
verificar se o formato original já toca
```

Se for um arquivo pequeno e amigável ao runtime:

```text
usar original
```

No My Packs Pro, o critério utilizado incluía:

```text
MP4/H.264
≤1080p
≤80 MB
```

como candidato a reprodução direta.

Esse limite é uma heurística de projeto, não uma regra da Adobe.

---

# 39. FFmpeg PARA PREVIEWS

Quando necessário:

```text
arquivo original
      ↓
FFmpeg
      ↓
proxy WebM
      ↓
<video>
```

Vantagens:

* menor tamanho;
* menor custo de memória;
* playback mais previsível;
* melhor escalabilidade;
* cache local.

---

# 40. LICENCIAMENTO DE CODECS

Não simplesmente baixar qualquer build do FFmpeg e redistribuir.

Verificar:

* licença do FFmpeg;
* licença dos codecs habilitados;
* GPL;
* LGPL;
* dependências;
* direitos de redistribuição.

No projeto original, foi evitado `libx264` porque a build utilizada teria implicações GPL. `libvpx` foi considerado adequado para uma estratégia baseada em VP8/VP9 com build compatível.

Antes de distribuir FFmpeg comercialmente:

1. descobrir exatamente como foi compilado;
2. listar bibliotecas habilitadas;
3. verificar licença;
4. manter avisos;
5. cumprir requisitos da licença;
6. não presumir que “FFmpeg é LGPL” significa que toda build é LGPL.

---

# 41. WINDOWS E FFMPEG

Uma estratégia possível é utilizar uma build específica compatível com a licença escolhida.

O projeto original utilizou referência a builds LGPL para Windows e recomendou cautela com builds macOS, onde versões disponíveis poderiam trazer componentes GPL.

Isso deve ser revalidado a cada distribuição.

---

# 42. ALPHA + VP8

No projeto original, uma dificuldade foi a conversão de ProRes 4444 com alpha.

O erro relacionado a:

```text
Transparency encoding with auto_alt_ref does not work
```

foi tratado com:

```bash
-vf "scale=-2:240,format=yuv420p" -auto-alt-ref 0
```

Quando uma conversão de vídeo falhar:

```text
executar o comando fora do plugin
```

antes de investigar o código do plugin.

---

# 43. CACHE DE PREVIEW

Nunca considerar:

```text
arquivo existe
```

como:

```text
cache válido
```

O arquivo pode ter:

```text
0 bytes
```

porque o FFmpeg falhou.

A condição correta deve ser algo como:

```text
existe
AND
size > 0
AND
metadados válidos
AND
formato correto
```

Opcionalmente:

```text
hash
+
versão de transcode
+
resolução
+
codec
```

para invalidar cache quando necessário.

---

# 44. CONCORRÊNCIA

Não processar centenas de vídeos simultaneamente.

No projeto original, arquivos grandes em drive sincronizada apresentaram alto custo de leitura.

Um ProRes 4K de aproximadamente 216 MB levou aproximadamente 57 segundos apenas para ser lido em um cenário medido.

Uma concorrência estreita, como:

```text
2 workers
```

foi muito mais adequada.

Também utilizar:

```text
timeout por processo
```

para não deixar jobs presos indefinidamente.

---

# 45. WAVEFORM

Não usar FFmpeg só para tudo.

Para áudio, Web Audio pode ser suficiente para:

* decodificação;
* duração;
* amostras;
* waveform.

A estratégia:

```text
audio
 ↓
decodeAudioData
 ↓
samples
 ↓
peak extraction
 ↓
cache
 ↓
render
```

é mais eficiente do que salvar uma imagem para cada waveform.

No projeto original, picos foram utilizados como cache.

---

# 46. LARGE LIBRARIES / MILHARES DE ASSETS

Painéis com milhares de itens exigem virtualização.

No teste com 2.359 assets, um dos maiores problemas era manter muitos elementos `<video>` vivos.

A estratégia aplicada foi:

```text
IntersectionObserver
+
mount apenas quando visível
+
unmount quando sair da viewport
```

Além disso:

* referências estáveis;
* `memo`;
* `requestAnimationFrame`;
* `content-visibility: auto`;
* previews lazy;
* cache em disco.

Essas técnicas foram medidas no projeto original com 2.359 assets.

---

# 47. REGRA DE VIRTUALIZAÇÃO

Nunca fazer:

```text
2359 cards
+
2359 vídeos
+
2359 event listeners
+
2359 buffers
```

na carga inicial.

Fazer:

```text
lista virtual
↓
viewport
↓
itens visíveis
↓
preview apenas dos visíveis
```

---

# 48. ERROR BOUNDARY

Um painel deve possuir sistema de recuperação visual.

Sem tratamento:

```text
erro React/UI
↓
painel preto
```

No ambiente do Premiere, isso é especialmente ruim porque o usuário pode não encontrar a console imediatamente.

A estratégia:

```text
App Error Boundary
↓
erro
↓
UI de recuperação
↓
mensagem
↓
stack/log opcional
↓
Reload
```

No projeto original, essa foi considerada uma proteção obrigatória.

---

# 49. SETTINGS VERSIONADOS

Não salvar simplesmente:

```json
{
  "foo": "bar"
}
```

e depois mudar o schema sem migração.

Usar:

```json
{
  "version": 3,
  "settings": {}
}
```

Ao iniciar:

```text
ler
↓
identificar versão
↓
migrar
↓
merge com defaults
↓
validar
```

---

# 50. XMP E LABELS DO PREMIERE

Rótulos de cor não devem ser tratados como simples índices.

No projeto original, os nomes eram nomes em inglês como:

```text
Violet
Iris
Caribbean
...
```

e a cor visual dependia das Preferências do usuário.

Consequentemente, não tentar reproduzir a cor por RGB.

Mostrar:

```text
Violet
```

em vez de assumir que:

```text
Violet = #XXXXXX
```

O projeto utilizou XMP:

```js
ExternalObject.AdobeXMPScript =
    new ExternalObject("lib:AdobeXMPScript");

var NS =
    "http://ns.adobe.com/premierePrivateProjectMetaData/1.0/";

var xmp =
    new XMPMeta(item.getProjectMetadata());

xmp.setProperty(
    NS,
    "Column.Intrinsic.Label",
    "Violet"
);

item.setProjectMetadata(
    xmp.serialize(),
    ["Column.Intrinsic.Label"]
);
```

O projeto também identificou uma armadilha importante: uma operação podia retornar sucesso sem alterar realmente o metadata, portanto a leitura posterior era obrigatória para confirmar a escrita.

---

# 51. PADRÃO READ-BACK

Para operações críticas:

```text
WRITE
 ↓
READ
 ↓
COMPARE
 ↓
SUCCESS
```

Nunca:

```text
WRITE
 ↓
console.log("success")
```

Esse princípio deve ser aplicado a:

* metadata;
* arquivos;
* cache;
* presets;
* configuração;
* preferências;
* manifest;
* builds.

---

# 52. MOGRT

MOGRT significa:

```text
Motion Graphics Template
```

No Premiere, usuários podem instalar `.mogrt` e encontrá-los em:

```text
Window
→ Graphics Templates
```

A documentação atual da Adobe mostra instalação via botão de instalação do painel e também drag-and-drop para a aba de modelos.

Um plugin não deve assumir que:

```text
MOGRT = plugin
```

MOGRT é um tipo de asset/template.

---

# 53. PLUGIN + MOGRT

Uma ferramenta pode combinar:

```text
Plugin
+
MOGRT
```

Exemplo:

```text
Plugin
  ↓
biblioteca
  ↓
usuário seleciona template
  ↓
plugin localiza MOGRT
  ↓
instala/importa conforme fluxo
  ↓
insere no projeto
```

Isso permite produtos muito mais ricos do que apenas um painel.

---

# 54. MOGRTS NAS BIBLIOTECAS CREATIVE CLOUD

A Adobe informa que templates armazenados em Creative Cloud Libraries podem ficar disponíveis automaticamente no Premiere sem instalação manual individual.

Portanto, uma solução comercial pode considerar:

```text
local MOGRT
```

e:

```text
Creative Cloud Library
```

como origens diferentes.

---

# 55. PRESETS

Presets do Premiere não são equivalentes a MOGRT.

Presets podem servir para:

* efeitos;
* movimentos;
* propriedades;
* transformações;
* configurações reutilizáveis.

A documentação atual permite exportar e importar presets através do Preset Manager.

Não criar um instalador complexo quando uma operação nativa de importação/exportação já atende a necessidade.

---

# 56. PRODUTOS DE PRESETS

Uma ferramenta comercial pode ter:

```text
Plugin
+
`.prfpset`
+
MOGRT
+
LUT
+
assets
```

Mas cada categoria deve possuir instalação/documentação própria.

Exemplo:

```text
Install
├── Plugin
├── Presets
├── MOGRTs
├── LUTs
└── Media
```

---

# 57. ZXP

`.zxp` é o formato clássico de distribuição associado ao CEP.

A Adobe mantém `ZXPSignCmd` no repositório oficial CEP-Resources.

Fluxo:

```text
extensão CEP
 ↓
certificado
 ↓
assinatura
 ↓
ZXP
 ↓
instalação
```

---

# 58. ASSINATURA ZXP

Com `ZXPSignCmd`, o processo clássico inclui geração de certificado e assinatura.

Exemplo do projeto original:

```bash
ZXPSignCmd -selfSignedCert BR SP "Nome" "Nome" SENHA cert.p12 -validityDays 3650

ZXPSignCmd -sign <pastaExtensao> saida.zxp cert.p12 SENHA
```

O projeto original utilizou validade longa para evitar depender de timestamp.

Também registrou problemas específicos do `ZXPSignCmd` com caminhos Windows e timestamp.

Nunca colocar:

```text
cert.p12
senha
chave privada
```

no Git.

---

# 59. ZXP E SEGURANÇA DE ASSINATURA

Há histórico recente de problemas de compatibilidade entre assinaturas ZXP e versões modernas do ecossistema Adobe.

O próprio repositório Adobe-CEP mantém uma documentação de problema de compatibilidade de assinatura registrada em 2024.

Portanto:

```text
ZXP funciona
```

não significa:

```text
qualquer ZXP continuará funcionando indefinidamente
```

Testar em versões atuais do Premiere e sistemas operacionais alvo.

---

# 60. CCX

Para UXP, o pacote moderno é:

```text
.ccx
```

A Adobe explica que `.ccx` é essencialmente um pacote ZIP estruturado e é utilizado na distribuição UXP. Diferentemente do CEP/ZXP, o fluxo não depende do mesmo modelo de assinatura e timestamp do ZXP.

---

# 61. CCX ≠ ZXP

Nunca confundir:

```text
CEP → ZXP
```

com:

```text
UXP → CCX
```

---

# 62. INSTALAÇÃO UXP

UXP pode ser instalado por:

```text
Creative Cloud Marketplace
```

ou:

```text
arquivo .ccx
```

ou em cenários corporativos:

```text
Admin Console
UPIA
```

A Adobe documenta esses fluxos oficialmente.

No Premiere, plugins UXP aparecem em:

```text
Window
→ UXP Plugins
```

---

# 63. DISTRIBUIÇÃO DIRETA UXP

A Adobe permite distribuição independente.

Possibilidades:

```text
site próprio
GitHub
terceiros
distribuição empresarial
arquivo .ccx
```

A documentação de distribuição independente afirma explicitamente que o `.ccx` pode ser compartilhado diretamente.

---

# 64. ADOBE CREATIVE CLOUD MARKETPLACE

Para produto comercial, considerar:

```text
Adobe Creative Cloud Marketplace
```

A Adobe informa que o Marketplace oferece:

* distribuição ampla;
* atualização por Creative Cloud;
* monetização;
* produtos gratuitos;
* produtos pagos;
* assinaturas;
* integração com FastSpring;
* distribuição não exclusiva.

A documentação atual também informa uma taxa de 10% sobre transações descritas no modelo do Marketplace.

---

# 65. REVISÃO DO MARKETPLACE

Plugins publicados no Marketplace passam por revisão.

A Adobe afirma que a revisão avalia:

* branding;
* qualidade da listagem;
* links;
* suporte;
* descrição;
* compatibilidade;
* dependências;
* privacidade;
* termos;
* execução;
* experiência;
* segurança;
* compatibilidade de arquitetura.

A documentação atual informa uma meta de aproximadamente 10 dias úteis, podendo haver necessidade de correções.

---

# 66. METADADOS DE LISTAGEM

Ao criar a listing, considerar:

```text
Nome
Subtitle
Descrição
Categorias
Tags
Suporte
Website
Privacy Policy
Terms
Version
Author
```

A documentação atual informa limites específicos de caracteres para vários desses campos e deve ser consultada antes do envio.

---

# 67. MARKETPLACE E ID DO PLUGIN

O ID do plugin é importante.

Para UXP:

```json
{
  "id": "com.exemplo.plugin"
}
```

mas o ID real precisa seguir o processo da Adobe.

A documentação de packaging recomenda que o ID no `manifest.json` corresponda ao ID do Developer Distribution Portal quando destinado ao Marketplace.

---

# 68. DISTRIBUIÇÃO MULTICANAL

Se o mesmo produto for publicado:

```text
Adobe Marketplace
+
site próprio
```

verificar a estratégia de IDs exigida pelo ecossistema atual.

A documentação da Adobe recomenda atenção especial à distinção de IDs quando um produto é distribuído simultaneamente em canais que incluem o Marketplace.

---

# 69. GITHUB

GitHub deve ser tratado como parte da infraestrutura do produto.

Estrutura recomendada:

```text
repo/
├── src/
├── public/
├── scripts/
├── plugin/
├── installer/
├── docs/
├── tests/
├── .github/
│   └── workflows/
├── package.json
├── README.md
├── LICENSE
├── CHANGELOG.md
└── SECURITY.md
```

---

# 70. GIT NÃO É ARMAZENAMENTO DE SEGREDO

Nunca commitar:

```text
cert.p12
private keys
API secrets
tokens
passwords
.env
```

Usar:

```text
.gitignore
```

e, em CI:

```text
GitHub Secrets
```

ou equivalente.

---

# 71. GITHUB RELEASES

Um produto pode utilizar:

```text
GitHub Repository
↓
Git Tag
↓
GitHub Release
↓
artefacts
```

Exemplo:

```text
v1.0.0
v1.1.0
v1.2.0
```

Arquivos de release:

```text
MyPlugin-win-mac-v1.2.0.ccx
MyPlugin-CEP-v1.2.0.zxp
MyPlugin-Installer-v1.2.0.zip
```

---

# 72. SEMVER

Utilizar versionamento previsível:

```text
MAJOR.MINOR.PATCH
```

Exemplo:

```text
1.4.2
```

Regra:

```text
1.4.2 → 1.4.3
bugfix

1.4.2 → 1.5.0
nova funcionalidade compatível

1.4.2 → 2.0.0
mudança incompatível
```

---

# 73. GITHUB ACTIONS

Automatizar:

```text
lint
test
build
package
version
release
```

Uma pipeline ideal:

```text
push
 ↓
lint
 ↓
unit tests
 ↓
build
 ↓
package
 ↓
smoke tests
 ↓
release artifact
```

Para CEP:

```text
build → sign → zxp
```

Para UXP:

```text
build → package → ccx
```

Não armazenar certificados privados diretamente no repositório.

---

# 74. VERCEL

Vercel é especialmente útil para o **website e backend**, não como substituto do instalador do Premiere.

Exemplo:

```text
plugin
↓
website
↓
Vercel
```

O website pode conter:

* landing page;
* documentação;
* changelog;
* pricing;
* downloads;
* suporte;
* FAQ;
* status;
* autenticação;
* política de privacidade;
* termos;
* portal do cliente.

Vercel suporta deployments através de Git, CLI, Deploy Hooks e API. Quando um repositório Git é conectado, pushes e pull requests podem gerar deploys automaticamente.

---

# 75. GITHUB + VERCEL

Arquitetura recomendada:

```text
GitHub
  ↓
push
  ↓
Vercel
  ↓
build
  ↓
Preview Deployment
```

E:

```text
main
  ↓
Production
```

Enquanto:

```text
feature/foo
  ↓
Preview
```

Isso permite testar o site antes de publicar.

Vercel documenta integração direta com GitHub e deployments automáticos por branch/push.

---

# 76. DOMAIN

Utilizar domínio próprio:

```text
meuplugin.com
```

e subdomínios:

```text
www.meuplugin.com
docs.meuplugin.com
api.meuplugin.com
download.meuplugin.com
status.meuplugin.com
```

Vercel possui suporte nativo a custom domains e gerenciamento de DNS.

---

# 77. VARIÁVEIS DE AMBIENTE

Nunca colocar segredos no código.

Utilizar:

```text
environment variables
```

para:

```text
DATABASE_URL
STRIPE_SECRET_KEY
LICENSE_SECRET
OAUTH_CLIENT_SECRET
```

Vercel armazena as environment variables de forma apropriada e permite separar ambientes.

---

# 78. WEBSITE NÃO DEVE SER PARTE DO PLUGIN SEM NECESSIDADE

Separar:

```text
Plugin
```

de:

```text
Website
```

e:

```text
Backend
```

Arquitetura:

```text
Premiere
   ↓
Plugin
   ↓
HTTPS API
   ↓
Backend
   ↓
Database
```

Website:

```text
Browser
 ↓
Website
 ↓
Backend
```

Isso melhora:

* segurança;
* manutenção;
* escalabilidade;
* atualização;
* experiência;
* independência do Premiere.

---

# 79. DOWNLOADS

Uma estratégia profissional:

```text
website
 ↓
Downloads
 ↓
version selection
 ↓
Windows / macOS
 ↓
package
```

Exemplo:

```text
Download for Windows
Download for macOS
```

Mas não depender exclusivamente de links fixos se o produto tiver atualizações frequentes.

---

# 80. INSTALADOR

Existem várias estratégias.

## UXP

```text
.ccx
```

## CEP

```text
.zxp
```

## Aplicação auxiliar

```text
installer.exe
.dmg
.pkg
```

## Assets

```text
.zip
```

Não misturar conceitos.

---

# 81. INSTALADOR HÍBRIDO

Um produto comercial pode ter:

```text
Installer
├── Premiere plugin
├── assets
├── MOGRT
├── presets
└── updater
```

Mas cada componente deve ser tratado conforme sua tecnologia.

---

# 82. AUTOUPDATE

Há três níveis:

### Nível 1

Usuário verifica manualmente.

### Nível 2

Plugin consulta:

```text
api.example.com/version
```

e informa:

```text
Update available
```

### Nível 3

Sistema de atualização automática.

Nível 3 exige mais cuidado.

Nunca baixar e executar binário sem:

* verificação de integridade;
* assinatura;
* HTTPS;
* versionamento;
* rollback;
* permissões.

---

# 83. LICENSING

Plugin comercial pode utilizar:

```text
license key
```

ou:

```text
account
```

ou:

```text
subscription
```

Arquitetura recomendada:

```text
Plugin
  ↓
login
  ↓
backend
  ↓
license
  ↓
JWT/token limitado
```

Nunca colocar a lógica completa de validação comercial no frontend.

Porque o usuário possui o plugin.

---

# 84. OFFLINE MODE

Produtos profissionais devem considerar:

```text
internet indisponível
```

Políticas possíveis:

```text
online only
```

ou:

```text
license grace period
```

ou:

```text
offline activation
```

UX deve dizer claramente:

```text
Offline
License valid until...
```

em vez de:

```text
Something went wrong.
```

---

# 85. ERROR SYSTEM

Todo plugin profissional deve possuir categorias de erro:

```text
USER_ERROR
HOST_ERROR
NETWORK_ERROR
FILE_ERROR
PERMISSION_ERROR
FFMPEG_ERROR
AUTH_ERROR
LICENSE_ERROR
PLUGIN_ERROR
UNKNOWN_ERROR
```

Cada erro deve ter:

```text
message
code
context
retryable
details
```

Exemplo:

```json
{
  "code": "PREVIEW_TRANSCODE_FAILED",
  "retryable": true,
  "file": "clip.mov"
}
```

---

# 86. LOGGING

Desenvolvimento:

```text
verbose
```

Produção:

```text
warning
error
critical
```

Nunca imprimir:

```text
senha
token
chave
cookie
```

---

# 87. DIAGNOSTICS SCREEN

Um plugin profissional pode possuir:

```text
Diagnostics
```

com:

```text
Premiere Version
Platform
Architecture
Plugin Version
UXP/CEP Version
GPU
Node
FFmpeg
Cache Path
Network Status
License Status
```

Isso reduz drasticamente suporte.

---

# 88. DEBUGGING UXP

O UXP Developer Tool oferece ferramentas de debugging, console e integração com DevTools.

Usar:

```js
console.log()
console.warn()
console.error()
```

A documentação oficial recomenda essas técnicas e disponibiliza debugging pelo UXP Developer Tool.

---

# 89. DEBUGGING CEP

CEP possui abordagem diferente.

Utilizar:

* console do painel;
* DevTools;
* logs;
* `evalScript`;
* retorno de ExtendScript;
* arquivos temporários;
* debugging de Node.

Sempre separar:

```text
UI error
```

de:

```text
Host error
```

de:

```text
Node error
```

---

# 90. O ERRO “EVALSCRIPT ERROR.”

Não assumir imediatamente:

```text
API não existe
```

Investigar nesta ordem:

```text
1. JSX carregou?
2. Sintaxe correta?
3. Nome da função correto?
4. Caminho correto?
5. O Premiere está no estado esperado?
6. O objeto existe?
7. A propriedade existe?
8. O método existe?
9. O retorno é válido?
10. O erro vem de outra função?
```

---

# 91. TESTES

Não considerar:

```text
"funciona no meu PC"
```

como teste.

Matriz mínima:

```text
Windows
macOS Intel
macOS Apple Silicon
Premiere Stable
Premiere Beta
```

Quando aplicável:

```text
premiere version A
premiere version B
```

---

# 92. TESTES DE HOST

Criar testes para:

```text
sem projeto
projeto vazio
projeto grande
sem sequência
sequência ativa
timeline cheia
timeline vazia
mídia offline
mídia online
path com espaço
path Unicode
nome muito grande
acentos
caracteres especiais
drive externo
drive sincronizado
```

---

# 93. TESTES DE ARQUIVOS

Testar:

```text
.mp4
.mov
.mkv
.webm
.wav
.mp3
.aac
```

mas nunca afirmar suporte sem testar no runtime alvo.

---

# 94. PATHS

Paths são uma das maiores fontes de bugs.

Testar:

```text
C:\Projects\My Video\clip.mov
```

e:

```text
/Users/user/My Project/clip.mov
```

e:

```text
D:\Projetos\Vídeos\Árvore.mov
```

também:

```text
espaços
acentos
Unicode
&
()
[]
```

---

# 95. FILE://

CEP e UXP podem carregar recursos locais, mas não tratar o ambiente como Chrome tradicional.

Projetos CEP podem precisar de parâmetros específicos de CEF dependendo do comportamento desejado.

O cookbook oficial documenta flags CEF e suas particularidades.

Nunca adicionar flags de segurança perigosas em produção só para fazer uma página funcionar.

---

# 96. SEGURANÇA

Nunca usar indiscriminadamente:

```text
--ignore-certificate-errors
```

ou equivalentes.

Também evitar:

```text
--allow-running-insecure-content
```

sem necessidade.

A documentação da Adobe inclusive alerta que certas flags relacionadas a ignorar certificados representam risco de segurança.

---

# 97. ARQUITETURA RECOMENDADA PARA UM PLUGIN GRANDE

Exemplo:

```text
Premiere Plugin
│
├── UI
│   ├── Browser
│   ├── Library
│   ├── Search
│   ├── Preview
│   ├── Inspector
│   └── Settings
│
├── Core
│   ├── State
│   ├── Cache
│   ├── Queue
│   ├── File system
│   ├── Network
│   └── Diagnostics
│
├── Premiere Adapter
│   ├── Import
│   ├── Sequence
│   ├── Timeline
│   ├── Metadata
│   └── Export
│
├── Media Engine
│   ├── FFmpeg
│   ├── Thumbnail
│   ├── Waveform
│   └── Proxy
│
├── Services
│   ├── Auth
│   ├── License
│   ├── Cloud
│   └── Update
│
└── Diagnostics
```

---

# 98. NÃO ACOPLAR UI À API DO PREMIERE

Evitar:

```text
button.onclick
  ↓
Premiere API
```

em todo lugar.

Preferir:

```text
UI
 ↓
Action
 ↓
Service
 ↓
Premiere Adapter
```

Assim fica possível trocar:

```text
CEP
```

por:

```text
UXP
```

sem reescrever toda a interface.

---

# 99. ADAPTER PATTERN

Exemplo:

```ts
interface PremiereAdapter {
    getActiveSequence(): Promise<Sequence | null>;
    importMedia(path: string): Promise<ProjectItem>;
    insertClip(item: ProjectItem): Promise<void>;
}
```

Implementações:

```text
CepPremiereAdapter
UxpPremiereAdapter
```

Isso facilita migração.

---

# 100. ESTRATÉGIA CEP → UXP

Não reescrever tudo de uma vez.

Fazer:

```text
UI
 ↓
core
 ↓
adapter
```

Depois:

```text
CEP adapter
```

e futuramente:

```text
UXP adapter
```

Essa arquitetura reduz risco.

---

# 101. SAMPLES OFICIAIS

Sempre consultar o repositório:

```text
AdobeDocs / uxp-premiere-pro-samples
```

Ele contém samples como:

```text
premiere-api
metadata-handler
oauth-workflow-sample
```

O sample `premiere-api` foi criado especificamente para explorar uma ampla gama de APIs do Premiere, incluindo projetos, sequências, markers, metadata, effects, transitions, source monitor, import/export, encoder, transcripts e conversão de projetos.

---

# 102. SAMPLE COMO LABORATÓRIO

Antes de perguntar:

```text
"Como faço X?"
```

procurar:

```text
premiere-api
```

e encontrar exemplos relacionados.

Depois adaptar o conceito.

---

# 103. DOCUMENTAÇÃO PRINCIPAL

Manter como fontes prioritárias:

```text
Adobe Premiere Pro Developer
Adobe Premiere UXP API
Adobe Premiere DOM API
Adobe CEP Resources
Adobe CEP HTML Extension Cookbook
Adobe UXP Developer Tool
Adobe Developer Distribution
Adobe Creative Cloud Marketplace
Adobe HelpX
Adobe Premiere Samples
```

Nunca usar um tutorial aleatório como autoridade final quando a API oficial divergir.

---

# 104. INTERNET COMO DOCUMENTAÇÃO VIVA

Além da documentação oficial, pesquisar:

```text
GitHub
GitHub Issues
Adobe Community
Adobe Developer Forums
Stack Overflow
repositórios de plugins
samples
issues
pull requests
```

Código de plugins comerciais pode ajudar a descobrir:

* nomes de APIs;
* estruturas;
* hacks;
* compatibilidade;
* limitações.

Mas código de terceiro não é prova de comportamento universal.

---

# 105. ENGENHARIA REVERSA RESPONSÁVEL

Quando uma capacidade não está documentada:

```text
1. procurar documentação
2. procurar sample
3. procurar issue
4. procurar código funcional
5. medir
6. documentar
7. marcar como não documentado
```

Não transformar observação em “API oficial”.

---

# 106. CLASSIFICAÇÃO DE CONHECIMENTO

Todo conhecimento da skill deve ser marcado internamente como:

```text
OFFICIAL
MEASURED
INFERRED
UNVERIFIED
LEGACY
VERSION-SPECIFIC
```

Exemplo:

```text
[OFFICIAL]
UXP é suportado no Premiere 25.6+.

[MEASURED]
CEP 12.0.1 + Chromium 99 no ambiente do My Packs Pro.

[INFERRED]
Provavelmente aplicável em versões semelhantes.

[UNVERIFIED]
Ainda precisa ser testado.

[LEGACY]
Comportamento CEP.

[VERSION-SPECIFIC]
Premiere 26.3.2.
```

---

# 107. REGRA DE VERIFICAÇÃO DE VERSÃO

Sempre perguntar:

```text
Qual Premiere?
Qual sistema operacional?
Qual arquitetura?
Qual UXP?
Qual CEP?
Qual Node?
Qual SDK?
```

Quando a resposta não existir:

```text
assumir a menor capacidade segura
```

e testar.

---

# 108. NÃO CONFUNDIR “PREMIERE CONSEGUE” COM “PLUGIN CONSEGUE”

Exemplo:

```text
Premiere abre arquivo MKV
```

não significa:

```text
UXP <video> abre MKV
```

Outro:

```text
Premiere aceita drag
```

não significa:

```text
CEP consegue enviar qualquer tipo de drag
```

Outro:

```text
Premiere importa MOGRT
```

não significa:

```text
qualquer API host permite instalar MOGRT diretamente
```

---

# 109. PERFORMANCE: REGRA GERAL

Medir antes de otimizar.

Medir:

```text
startup
render
memory
CPU
disk I/O
network
FFmpeg
DOM calls
UI rendering
```

Evitar micro-otimização antes de descobrir o gargalo real.

---

# 110. NÃO BLOQUEAR A UI

Nunca fazer:

```text
loop pesado
```

na thread da interface.

Preferir:

```text
async
workers
queues
chunking
requestAnimationFrame
native processing
```

quando suportado.

---

# 111. JOB QUEUE

Para processamento de mídia:

```text
queue
↓
worker 1
worker 2
↓
success
retry
failed
```

Estados:

```text
queued
processing
completed
failed
cancelled
```

---

# 112. CANCELAMENTO

Qualquer job longo deve, quando possível, suportar:

```text
Cancel
```

Não deixar o usuário esperando uma operação que pode durar minutos sem controle.

---

# 113. RETRY

Não repetir infinitamente.

Exemplo:

```text
attempt 1
attempt 2
attempt 3
failed
```

Com backoff.

---

# 114. UX DE JOBS

Mostrar:

```text
Downloading…
Transcoding…
Importing…
Building preview…
```

e não apenas:

```text
Loading...
```

---

# 115. PROGRESSO

Sempre que possível:

```text
0–100%
```

ou:

```text
3 / 14
```

quando a operação tiver etapas.

---

# 116. CACHE

Criar cache estruturado:

```text
cache/
├── previews/
├── thumbnails/
├── waveform/
├── metadata/
└── manifests/
```

Usar hashes quando necessário:

```text
sha256(path + size + modifiedTime)
```

---

# 117. THUMBNAILS

Gerar thumbnails apenas quando necessário.

Ideal:

```text
viewport
↓
item
↓
thumbnail requested
↓
cache
```

Não gerar 10.000 imagens na inicialização.

---

# 118. PREVIEW PLAYER

Um player de biblioteca pode ter:

```text
play
pause
seek
volume
muted
fullscreen
loop
```

Mas o plugin deve controlar quantos players existem ao mesmo tempo.

---

# 119. VIDEO ELEMENT LIFECYCLE

Quando um card deixa o viewport:

```text
pause
remove source
release media
unmount
```

Não simplesmente esconder:

```css
display:none
```

mantendo:

```text
video buffer
```

vivo.

---

# 120. DESIGN SYSTEM

Para um plugin comercial:

```text
tokens
↓
components
↓
patterns
↓
screens
```

Exemplo:

```text
Button
Input
Search
Card
Modal
Toast
Tooltip
Dropdown
Tabs
Sidebar
Player
Progress
```

Evitar cada componente ter uma lógica visual diferente.

---

# 121. ACCESSIBILITY

Considerar:

* contraste;
* keyboard navigation;
* focus;
* tooltips;
* tamanho de controles;
* mensagens;
* estados de erro;
* leitura visual.

Mesmo sendo ferramenta profissional, acessibilidade aumenta usabilidade.

---

# 122. LOCALIZAÇÃO

Não hardcodar:

```js
"Importar vídeo"
```

em 500 lugares.

Usar:

```text
i18n
```

com:

```text
pt-BR
en-US
es
```

A Adobe considera problemas de localização e texto truncado como fatores de qualidade na revisão de plugins.

---

# 123. SUPPORT SYSTEM

Plugin comercial precisa ter:

```text
Support
FAQ
Docs
Contact
Changelog
```

Não depender exclusivamente de mensagens dentro do plugin.

---

# 124. TELEMETRIA

Só adicionar quando houver justificativa.

Nunca coletar:

```text
projeto inteiro
arquivos pessoais
conteúdo confidencial
```

sem necessidade e sem política adequada.

Preferir:

```text
error code
plugin version
host version
anonymous crash signal
```

quando legitimamente necessário e informado.

---

# 125. PRIVACY

Para Marketplace, considerar:

```text
Privacy Policy
Terms of Service
Support
```

A Adobe inclui esses itens no processo de revisão.

---

# 126. WEBSITE PROFISSIONAL

Estrutura:

```text
/
├── /features
├── /pricing
├── /download
├── /docs
├── /support
├── /changelog
├── /privacy
├── /terms
├── /login
└── /dashboard
```

---

# 127. DOCUMENTAÇÃO DO PLUGIN

README mínimo:

```text
What it does
Requirements
Installation
Supported Premiere versions
Supported OS
Permissions
Features
Troubleshooting
Known limitations
Privacy
License
Support
Changelog
```

---

# 128. INSTALL README

Sempre informar:

```text
Premiere version
OS
Architecture
Installation
Uninstall
Troubleshooting
```

Exemplo:

```text
Requires Premiere 25.6+
Windows 10/11
macOS 13+
```

mas somente afirmar versões após validação real.

---

# 129. KNOWN LIMITATIONS

Toda skill/produto profissional deve possuir uma seção:

```text
Known Limitations
```

Isso evita promessas falsas.

Exemplo:

```text
Timeline drop not supported.
MOV preview requires proxy.
Feature X requires Premiere 26.0+.
Hybrid mode requires macOS arm64 binary.
```

---

# 130. BUILD MATRIX

Manter algo como:

| Produto       | Runtime   | Pacote               |
| ------------- | --------- | -------------------- |
| Modern Plugin | UXP       | `.ccx`               |
| Legacy Panel  | CEP       | `.zxp`               |
| Native        | C++       | plugin binary        |
| Hybrid        | UXP + C++ | `.ccx` + `.uxpaddon` |
| Preset Pack   | Premiere  | preset format        |
| MOGRT Pack    | Premiere  | `.mogrt`             |

---

# 131. RELEASE CHECKLIST

Antes de publicar:

```text
[ ] versão atualizada
[ ] manifest correto
[ ] ID correto
[ ] ícones corretos
[ ] sem debug
[ ] sem secrets
[ ] sem certificados
[ ] build limpa
[ ] lint
[ ] tests
[ ] smoke tests
[ ] Windows
[ ] macOS
[ ] arquitetura correta
[ ] instalação testada
[ ] uninstall testado
[ ] update testado
[ ] website
[ ] docs
[ ] privacy
[ ] terms
[ ] support
[ ] changelog
```

---

# 132. RELEASE AUTOMATION

Ideal:

```text
git tag v1.2.0
      ↓
GitHub Actions
      ↓
build
      ↓
tests
      ↓
package
      ↓
sign
      ↓
release
      ↓
website updated
```

No caso de certificados, utilizar segredo protegido do CI e nunca o repository.

---

# 133. ROLLBACK

Nunca pensar apenas em:

```text
deploy
```

Pensar também:

```text
rollback
```

Guardar:

```text
v1.1.0
v1.2.0
```

e ter maneira de voltar à versão anterior.

---

# 134. SITE + API + PLUGIN + GITHUB + VERCEL

Arquitetura comercial completa:

```text
                    ┌──────────────┐
                    │   GitHub     │
                    │ source/code  │
                    └──────┬───────┘
                           │
                    CI / Actions
                           │
             ┌─────────────┴─────────────┐
             │                           │
        Plugin Build                Website Build
             │                           │
       .ccx / .zxp                 Vercel
             │                           │
             │                    site + dashboard
             │                           │
             └──────────────┬────────────┘
                            │
                          API
                            │
                 ┌──────────┴─────────┐
                 │                    │
              Database             License
                 │                    │
                 └──────────┬─────────┘
                            │
                         Premiere
```

---

# 135. BANCO DE DADOS

Se o produto tiver:

```text
login
licenses
subscriptions
downloads
devices
preferences
```

utilizar um backend.

O plugin não deve conversar diretamente com um banco SQL público.

Arquitetura:

```text
Plugin
↓
API
↓
Database
```

---

# 136. DOWNLOAD SECURITY

Nunca disponibilizar automaticamente:

```text
/protected/plugin.exe
```

sem qualquer controle se o produto for pago.

Usar:

```text
authenticated download
signed URL
expiração
license validation
```

quando necessário.

---

# 137. FFMPEG SECURITY

Não montar comandos concatenando input não confiável.

Perigoso:

```js
`${file} ${args}`
```

Preferir argumentos estruturados.

Validar:

* path;
* extensão;
* tamanho;
* existência;
* output;
* timeout.

---

# 138. USER PATHS

Nunca assumir:

```text
C:\Users\Biel
```

ou:

```text
/Users/Biel
```

Utilizar APIs apropriadas para descobrir:

```text
home directory
documents
app data
plugin data
temporary
```

---

# 139. WINDOWS E MAC

Sempre usar helpers:

```js
isWindows()
isMac()
isArm64()
```

e separar:

```text
windows paths
mac paths
```

Não fazer:

```js
path = "C:\\..."
```

hardcoded.

---

# 140. ARQUITETURA MULTIPLATAFORMA

Para plugin híbrido/nativo:

```text
Windows x64
macOS x64
macOS arm64
```

A documentação do Marketplace indica que UXP Hybrid Plugins precisam incluir binários compatíveis com as arquiteturas requeridas, incluindo macOS arm64, macOS x64 e Windows x64 para submissões do Marketplace.

---

# 141. CODE SIGNING

Para plugins nativos/híbridos:

```text
Windows signing
macOS signing
macOS notarization
```

A documentação atual de review do Marketplace exige assinatura/notarização adequada para executáveis `.uxpaddon` no macOS.

Isso é uma camada diferente da assinatura histórica de `.zxp`.

---

# 142. NÃO USAR ZXP PARA UXP

Regra:

```text
UXP → CCX
CEP → ZXP
```

---

# 143. NÃO USAR EXTENDSCRIPT PARA TUDO

Se uma nova API UXP oferece diretamente o recurso necessário, preferir UXP.

Mas não migrar cegamente uma função antiga sem verificar:

```text
feature parity
```

---

# 144. NÃO USAR UXP PARA TUDO

Se o projeto exige:

```text
feature unavailable
```

em UXP, considerar:

```text
CEP
```

ou:

```text
C++
```

ou:

```text
external companion app
```

---

# 145. COMPANION APP

Uma arquitetura extremamente poderosa:

```text
Premiere Plugin
       ↓
Local Companion App
       ↓
FFmpeg / Python / ML / GPU / Browser
```

Isso permite deixar o plugin leve e deslocar processamento pesado para outro processo.

Mas adicionar:

* instalação;
* atualização;
* assinatura;
* comunicação;
* firewall;
* processos mortos;
* compatibilidade.

---

# 146. COMUNICAÇÃO COM COMPANION

Possibilidades:

```text
localhost HTTP
WebSocket
Named Pipe
Unix Socket
IPC
```

Em UXP, WebSocket é suportado como cliente, e o plugin não atua como servidor WebSocket.

---

# 147. EXTERNAL BROWSER

Não construir um “browser completo” dentro de UXP apenas porque:

```text
HTML
```

funciona.

UXP não é navegador completo.

Quando for necessário abrir uma página web:

```text
shell.openExternal(...)
```

pode ser mais apropriado.

---

# 148. PLUGIN COM YOUTUBE / WEBSITES

Para projetos como browser/media ingestion, separar:

```text
UI
Network
Authentication
Download service
Media processing
Premiere adapter
```

Não assumir que:

```text
URL do YouTube
→ <video>
```

é equivalente a baixar mídia.

Sites modernos podem usar:

* DRM;
* streams adaptativos;
* tokens;
* autenticação;
* anti-bot;
* alterações de API.

A implementação deve respeitar os termos e direitos aplicáveis.

---

# 149. DOWNLOAD DE MÍDIA

Uma arquitetura genérica:

```text
URL
 ↓
Resolver
 ↓
metadata
 ↓
download
 ↓
validation
 ↓
cache
 ↓
import
 ↓
timeline
```

Separar:

```text
downloaded file
```

de:

```text
Premiere asset
```

---

# 150. MEDIA INGEST

Pipeline:

```text
Source
↓
Download
↓
Validate
↓
Normalize
↓
Proxy
↓
Thumbnail
↓
Waveform
↓
Cache
↓
Import
```

Esse pipeline é reutilizável para bibliotecas de assets.

---

# 151. CANCELAMENTO DE DOWNLOAD

O usuário deve poder interromper.

Estados:

```text
queued
connecting
downloading
processing
complete
cancelled
failed
```

---

# 152. RETRY DE DOWNLOAD

Não repetir indefinidamente.

Exemplo:

```text
network error
↓
retry 1
↓
retry 2
↓
retry 3
↓
ask user
```

---

# 153. OBSERVABILIDADE

Uma ferramenta grande deve medir:

```text
startup_ms
preview_generation_ms
import_ms
api_latency_ms
ffmpeg_duration_ms
memory
queue_size
error_rate
```

Isso permite melhorar o produto com dados.

---

# 154. CACHE INVALIDATION

Uma das partes mais difíceis do software.

Sempre definir:

```text
quando cache nasce
quando cache é válido
quando cache expira
quando cache deve ser apagado
```

---

# 155. CLEANUP

O plugin deve ter:

```text
Clear Cache
```

e talvez:

```text
Clear Temporary Files
```

mas nunca apagar arquivos do usuário sem confirmação e sem intenção explícita.

---

# 156. DISK SPACE

Previews podem consumir dezenas ou centenas de GB.

Monitorar:

```text
cache size
```

e oferecer:

```text
Cache Settings
Maximum Size
Clear Cache
```

---

# 157. DRIVE SINCRONIZADA

Considerar:

```text
OneDrive
Dropbox
Google Drive
Creative Cloud
NAS
SMB
external SSD
```

Files em sync podem ter:

* latency;
* placeholders;
* locks;
* estados online/offline.

Não tratar storage sincronizado como SSD local.

---

# 158. ASYNC EVERYWHERE

Operações potencialmente lentas:

```text
file read
network
FFmpeg
Premiere API
thumbnail
waveform
license
```

devem ser tratadas como assíncronas quando a API permitir.

---

# 159. TIMEOUTS

Tudo que pode travar deve ter timeout:

```text
network: 8s
FFmpeg: based on media size
IPC: 5s
license: 5s
```

Os valores devem ser calibrados, não copiados cegamente.

---

# 160. FALLBACKS

Exemplo:

```text
MP4 original
↓
playback
↓
failed
↓
generate proxy
↓
playback proxy
```

ou:

```text
network
↓
failed
↓
offline cache
```

---

# 161. USER EXPERIENCE EM FALHAS

Nunca:

```text
Error 37
```

Preferir:

```text
Não foi possível gerar a prévia deste arquivo.

Formato:
QuickTime / ProRes 4444

Solução:
Clique em Gerar Proxy.
```

---

# 162. PRODUTO PROFISSIONAL = LIMITAÇÕES VISÍVEIS

Quando algo não é suportado:

```text
Unsupported format
```

é melhor do que:

```text
falhou silenciosamente
```

---

# 163. CHECKLIST DE ARQUITETURA

Antes de iniciar:

```text
[ ] Qual tecnologia?
[ ] Qual versão mínima?
[ ] Quais plataformas?
[ ] Quais APIs?
[ ] Quais limitações?
[ ] Precisa de Node?
[ ] Precisa de C++?
[ ] Precisa de FFmpeg?
[ ] Precisa de backend?
[ ] Precisa de login?
[ ] Precisa de licenciamento?
[ ] Precisa de internet?
[ ] Precisa de companion app?
[ ] Como distribuir?
[ ] Como atualizar?
[ ] Como desinstalar?
[ ] Como diagnosticar?
```

---

# 164. CHECKLIST DE DESENVOLVIMENTO

```text
[ ] Spike
[ ] Arquitetura
[ ] Manifest
[ ] UI skeleton
[ ] Host adapter
[ ] Core state
[ ] Error handling
[ ] File system
[ ] Network
[ ] Cache
[ ] Tests
[ ] Performance
[ ] Packaging
```

---

# 165. CHECKLIST DE QA

```text
[ ] Windows
[ ] macOS Intel
[ ] macOS ARM
[ ] Stable
[ ] Beta
[ ] Empty project
[ ] Huge project
[ ] Missing files
[ ] Unicode
[ ] External disk
[ ] Offline
[ ] Slow network
[ ] Permission denial
[ ] FFmpeg failure
[ ] Corrupted cache
[ ] Reinstall
[ ] Upgrade
[ ] Uninstall
```

---

# 166. INVESTIGAÇÃO DE BUG

Quando houver bug:

```text
1. reproduzir
2. isolar
3. medir
4. registrar versão
5. testar fora do plugin
6. verificar API
7. verificar host
8. verificar OS
9. verificar caminho
10. verificar permissões
11. corrigir
12. criar teste de regressão
```

---

# 167. BUG REPORT IDEAL

```text
Plugin:
Version:
Premiere:
OS:
Architecture:

Expected:
Actual:

Steps:
1.
2.
3.

Input:
Output:

Logs:
```

---

# 168. REGRESSION TEST

Todo bug importante deve gerar:

```text
test case
```

Assim ele não volta.

---

# 169. DOCUMENTAÇÃO DA SKILL

Quando aprender algo novo:

```text
Data:
Premiere:
OS:
Version:
Observed:
Expected:
Result:
Confidence:
```

Exemplo:

```text
2026-08
Premiere 26.3.2
Windows
CEP 12
Observed: MOV cannotPlayType
Confidence: measured
```

---

# 170. REGRA DE ATUALIZAÇÃO

Se a documentação oficial mudar:

```text
atualizar skill
```

e não manter uma regra antiga só porque ela funcionava em uma versão anterior.

---

# 171. FONTES PRIMÁRIAS PRIORITÁRIAS

Consultar primeiro:

1. Adobe Premiere Pro Developer
2. Adobe Premiere UXP API
3. Adobe Premiere DOM API
4. Adobe UXP Developer Tool
5. Adobe CEP Resources
6. Adobe CEP HTML Extension Cookbook
7. Adobe Premiere UXP Samples
8. Adobe Developer Distribution
9. Adobe Creative Cloud Marketplace
10. Adobe HelpX

---

# 172. FONTES SECUNDÁRIAS

Depois:

```text
GitHub
Adobe Community
Adobe Forums
Stack Overflow
blogs
YouTube
commercial plugins
```

Sempre comparar com fontes primárias.

---

# 173. O QUE NÃO FAZER

Nunca:

```text
inventar método
```

Nunca:

```text
assumir compatibilidade
```

Nunca:

```text
publicar sem testar
```

Nunca:

```text
colocar secret no plugin
```

Nunca:

```text
comitar cert.p12
```

Nunca:

```text
copiar build FFmpeg sem verificar licença
```

Nunca:

```text
tratar UXP como Chrome
```

Nunca:

```text
tratar ExtendScript como JavaScript moderno
```

Nunca:

```text
tratar MOGRT como plugin
```

Nunca:

```text
prometer timeline drag se o host não permite
```

Nunca:

```text
declarar sucesso sem verificar a mudança
```

---

# 174. REGRA CENTRAL DE HONESTIDADE TÉCNICA

Quando algo não foi verificado:

```text
NÃO VERIFICADO
```

Quando foi medido:

```text
MEDIDO
```

Quando veio da documentação:

```text
OFICIAL
```

Quando foi inferido:

```text
INFERÊNCIA
```

Quando é dependente da versão:

```text
VERSION-SPECIFIC
```

Essa distinção é obrigatória.

---

# 175. ESTRATÉGIA IDEAL PARA UM NOVO PLUGIN

Fluxo:

```text
IDEIA
 ↓
requisitos
 ↓
limitações do Premiere
 ↓
escolha tecnológica
 ↓
spikes
 ↓
arquitetura
 ↓
MVP
 ↓
testes
 ↓
performance
 ↓
packaging
 ↓
website
 ↓
distribution
 ↓
analytics/support
 ↓
release
```

---

# 176. MVP

O MVP não deve conter:

```text
50 funcionalidades
```

Primeiro provar:

```text
core workflow
```

Exemplo:

```text
Selecionar asset
↓
Preview
↓
Importar
↓
Inserir
```

Depois:

```text
search
collections
settings
sync
license
cloud
```

---

# 177. FEATURE FLAGS

Em produtos grandes:

```text
featureFlags
```

permitem ativar:

```text
newPreviewEngine
newImporter
betaTimeline
newCloudSync
```

sem publicar versões diferentes imediatamente.

UXP possui conceito de `featureFlags` no manifest e runtime.

---

# 178. BETA

Nunca usar produção para testar arquitetura experimental.

Estratégia:

```text
stable
beta
experimental
```

---

# 179. CANARY RELEASE

Pode-se distribuir:

```text
v2.1.0-beta.1
```

para usuários selecionados.

---

# 180. DOCUMENTAR DEPENDÊNCIAS

Se o plugin depender de:

```text
FFmpeg
Python
Node
companion app
plugin externo
service
```

isso precisa ser documentado.

A própria Adobe considera a divulgação de dependências de terceiros parte da qualidade da submissão do Marketplace.

---

# 181. PERFORMANCE DE STARTUP

O painel não deve:

```text
abrir
↓
varrer 20.000 arquivos
↓
gerar 2.000 previews
```

Melhor:

```text
startup
↓
load metadata
↓
render shell
↓
lazy work
```

---

# 182. INDEXAÇÃO

Para bibliotecas grandes:

```text
scan
↓
index
↓
database
↓
query
```

não:

```text
scan all files
```

a cada abertura.

---

# 183. SQLITE / INDEX

Se necessário, usar uma estrutura persistente para index:

```text
SQLite
```

ou equivalente apropriado.

Mas não adicionar banco local só porque parece sofisticado.

---

# 184. BUSCA

Uma biblioteca de assets pode utilizar:

```text
name
folder
tag
type
duration
resolution
codec
favorite
date
```

e eventualmente:

```text
fuzzy search
```

---

# 185. IA

Plugins podem incorporar IA através de backend.

Arquitetura:

```text
Premiere
 ↓
Plugin
 ↓
API
 ↓
AI model
 ↓
Result
 ↓
Premiere
```

Nunca colocar API key privada de um modelo diretamente no plugin.

---

# 186. MACHINE LEARNING LOCAL

Quando IA precisa rodar localmente:

```text
UXP
↓
companion
↓
Python/C++
↓
GPU
```

ou:

```text
UXP Hybrid
↓
C++
```

dependendo do caso.

---

# 187. GPU

Não assumir acesso direto à GPU a partir do JavaScript.

Para operações realmente GPU-heavy:

```text
C++
SDK
CUDA
Metal
OpenCL
```

podem entrar, dependendo do objetivo.

---

# 188. NATIVE CODE

Native code aumenta drasticamente a área de manutenção.

Sempre criar:

```text
native abstraction layer
```

em vez de espalhar código C++ pela UI.

---

# 189. ABSTRAÇÃO

A UI deve saber:

```text
"Generate Preview"
```

e não:

```text
ffmpeg.exe -i ...
```

---

# 190. SEPARAÇÃO DE RESPONSABILIDADES

```text
UI
```

não deve conhecer:

```text
FFmpeg internals
```

nem:

```text
Premiere DOM internals
```

nem:

```text
license backend secrets
```

---

# 191. OBSERVAÇÃO SOBRE CÓDIGO OFICIAL

Sempre usar código oficial como referência para APIs que podem mudar.

O repositório oficial de UXP Samples da Adobe é particularmente valioso porque contém exemplos funcionais e atualizados do ecossistema.

---

# 192. LEITURA CONSTANTE

Ao iniciar uma nova feature, fazer uma pesquisa:

```text
site:developer.adobe.com/premiere-pro
```

por:

```text
feature name
```

depois:

```text
site:github.com/AdobeDocs/uxp-premiere-pro-samples
```

e:

```text
site:github.com/Adobe-CEP
```

se for legado.

---

# 193. NÃO PARAR NO PRIMEIRO RESULTADO

Pesquisar:

```text
API
sample
issue
version
limitation
bug
```

Exemplo:

```text
Premiere UXP import media
Premiere UXP insert clip
Premiere UXP MOGRT
Premiere CEP drag drop
Premiere CEP timeline drag drop
Premiere ExtendScript metadata
```

---

# 194. VERIFICAÇÃO FINAL ANTES DE CODAR

A IA deve responder internamente:

```text
O que exatamente o usuário quer?
Qual host?
Qual versão?
Qual tecnologia?
Existe API oficial?
Existe limitação?
Existe workaround?
Existe alternativa?
Precisa de backend?
Precisa de processo externo?
Precisa de C++?
Precisa de companion app?
Como distribuir?
```

Só depois gerar código.

---

# 195. PADRÃO DE RESPOSTA DA IA DURANTE DESENVOLVIMENTO

Quando encontrar uma limitação:

```text
Não posso executar isso diretamente porque X.

Mas o host permite Y.

Portanto a arquitetura correta é:

A
↓
B
↓
C
```

Nunca fingir que uma limitação não existe.

---

# 196. QUANDO A IA DEVE PARAR E PESQUISAR

Pesquisar automaticamente quando:

* a versão mudou;
* a API parece nova;
* a documentação é ambígua;
* existe possibilidade de mudança de comportamento;
* o método não foi confirmado;
* o usuário exige compatibilidade atual;
* há questão de distribuição;
* há questão de licença;
* há questão de segurança;
* há questão de assinatura;
* há questão de Marketplace.

---

# 197. QUANDO A IA DEVE TESTAR

Executar teste real sempre que:

```text
API host
import
timeline
metadata
preview
FFmpeg
installation
packaging
permissions
```

puderem variar por versão.

---

# 198. DEFINIÇÃO DE “FUNCIONA”

Uma feature só pode ser considerada “funcionando” quando:

```text
build passa
+
plugin instala
+
plugin abre
+
feature executa
+
resultado esperado acontece
+
erro é tratado
+
retest passou
```

---

# 199. DEFINIÇÃO DE “PRONTO PARA PRODUÇÃO”

Somente após:

```text
functional tests
compatibility
performance
security
packaging
installation
uninstall
update
documentation
privacy
support
```

---

# 200. REGRA FINAL

A filosofia principal desta skill é:

> Não programe primeiro. Descubra primeiro o que o Premiere realmente permite.

E depois:

> Não trate uma limitação como um erro a ser “burlado”; trate-a como uma decisão arquitetural.

E finalmente:

> Quando o comportamento não for documentado, medir é melhor do que adivinhar.

O conhecimento empírico que originou esta skill mostrou exatamente isso: diversas horas de desenvolvimento foram economizadas ao testar drag-and-drop, codecs, FFmpeg, JSX, XMP, performance, filesystem e comportamento do host antes de construir a solução final.

---

# 201. ÍNDICE DE REFERÊNCIAS OFICIAIS E FONTES PRINCIPAIS

## Adobe Premiere Pro Developer

Fonte principal para:

* UXP
* C++ SDK
* CEP
* APIs
* documentação geral.

## Adobe Premiere UXP API

Fonte para:

* UXP;
* plugins;
* DOM;
* filesystem;
* network;
* shell;
* UI;
* permissions.

## Adobe UXP Plugin Documentation

Consultar para:

* build;
* manifest;
* entrypoints;
* packaging;
* installation;
* Marketplace.

## Adobe CEP Resources

Fonte principal para:

* CEP;
* CEP 12;
* CSInterface;
* ExtendScript;
* ZXPSignCMD;
* samples;
* cookbook.

## Adobe UXP Samples

Fonte principal para:

* exemplos reais;
* Premiere API;
* metadata;
* OAuth;
* TypeScript;
* projetos completos.

## Adobe HelpX

Utilizar para:

* instalação de MOGRT;
* presets;
* workflows do Premiere;
* comportamento de usuário.

## Adobe Marketplace

Utilizar para:

* publicação;
* review;
* metadados;
* pricing;
* distribuição;
* regras.

## GitHub

Utilizar para:

* código;
* releases;
* Actions;
* issues;
* samples;
* versionamento.

## Vercel

Utilizar para:

* websites;
* documentação;
* APIs;
* previews;
* deployments;
* domains;
* environment variables.

---

# 202. REGRA PARA FUTURAS TASKS

Sempre que o usuário pedir:

```text
"crie um plugin para Premiere"
```

a IA deve primeiro determinar:

```text
UXP?
CEP?
ExtendScript?
C++?
Hybrid?
Companion app?
Website?
Backend?
```

Depois:

```text
requirements
↓
spikes
↓
architecture
↓
implementation
↓
testing
↓
packaging
↓
distribution
```

Não começar diretamente escrevendo o código inteiro.

---

# 203. REGRA ESPECÍFICA PARA O PROJETO

Quando a tarefa envolver algo relacionado a:

```text
painel CEP
CSXS
manifest.xml
ExtendScript
.jsx
ZXP
CSInterface
evalScript
drag-and-drop
Project panel
timeline insertion
preview
FFmpeg
waveform
thumbnail
XMP
labels
```

considerar primeiro o conhecimento empírico do projeto My Packs Pro.

Quando a tarefa envolver:

```text
UXP
manifest.json
UXP Developer Tool
CCX
Spectrum
permissions
Premiere DOM moderno
```

consultar a documentação UXP atual antes de aplicar soluções legadas.

---

# 204. PRINCÍPIO DE MIGRAÇÃO FUTURA

O produto deve ser desenvolvido de forma que:

```text
CEP legado
```

possa eventualmente migrar para:

```text
UXP moderno
```

sem obrigar uma reescrita de:

* UI;
* business logic;
* cache;
* backend;
* licensing;
* cloud;
* database;
* website.

A camada crítica de abstração deve ser:

```text
Premiere Adapter
```

---

# 205. CONCLUSÃO OPERACIONAL

Quando receber uma tarefa de plugin:

```text
ENTENDER
↓
PESQUISAR
↓
MEDIR
↓
ESCOLHER TECNOLOGIA
↓
PROTOTIPAR
↓
IMPLEMENTAR
↓
VALIDAR
↓
OTIMIZAR
↓
EMPACOTAR
↓
PUBLICAR
↓
MONITORAR
```

A IA não deve apenas gerar código.

Ela deve atuar como:

```text
Software Architect
+
Adobe Premiere Developer
+
Plugin Engineer
+
Frontend Engineer
+
Media Pipeline Engineer
+
DevOps Engineer
+
QA Engineer
+
Release Engineer
+
Technical Researcher
```

sempre separando aquilo que é:

```text
documentado
```

daquilo que é:

```text
medido
```

daquilo que é:

```text
inferido
```

e daquilo que:

```text
ainda precisa ser testado.
```

## Estado atual da plataforma

No Premiere moderno, **UXP é a direção principal para novos plugins**, enquanto CEP permanece extremamente relevante para projetos legados e requisitos específicos; ExtendScript continua importante em fluxos CEP/legados; e C++/Hybrid são as opções quando o produto ultrapassa o que JavaScript sozinho deve ou consegue fazer. A arquitetura deve ser escolhida pelo requisito real, não pela tecnologia favorita.

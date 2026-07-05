# MultiIA — Documento de Referência do Projeto

> Este arquivo existe para dar contexto completo a qualquer pessoa (ou instância de IA)
> que continue este projeto no futuro, em uma conversa nova, sem precisar reconstruir
> o histórico de decisões. Mantenha-o atualizado a cada mudança relevante.

## 1. Objetivo

PWA (Progressive Web App) de chat com **acesso exclusivo** a modelos abertos de IA,
no estilo visual do Open WebUI (posteriormente evoluído para um tema glassmorphism
próprio). É de uso pessoal/administrado: a **mesma senha** dá acesso ao chat E ao
painel `/admin` (o chat deixou de ser público — ver seção 6.1).

Vive dentro do repositório **`claude-mobile-lab`** (um "laboratório" de múltiplos
projetos — o MultiIA é o primeiro/principal deles).

## 2. URLs

- **Chat (produção):** https://claude-mobile-lab.vercel.app/
- **Painel admin:** https://claude-mobile-lab.vercel.app/admin.html
- **Repositório:** github.com/MarceloBCorretor/claude-mobile-lab
- **Branch de trabalho:** `claude/pwa-chat-open-ai-snbygj` (PRs são abertos dela para `main`)

## 3. Modelos configurados

Modelos de **Chat** (texto) são acessados via **OpenRouter** (`OPENROUTER_API_KEY`).
Modelos de **Imagem/Vídeo/Áudio** são acessados **diretamente** na API do provedor
correspondente — Gemini/Google AI Studio (`GEMINI_API_KEY`) ou OpenAI
(`OPENAI_API_KEY`) — ver seção 7 (Estúdio de Artes). Todos editáveis em `/admin`.
Cada modelo tem um campo **Tipo** (`kind`): `chat`, `image`, `video` ou `audio`
(controla em qual seção/seletor ele aparece) e, para imagem/vídeo/áudio, um
campo **Provedor** (`provider`: `gemini` ou `openai`) que decide qual API/chave
é usada.

| Modelo | ID atual no admin | Tipo | Provedor |
|---|---|---|---|
| GLM-5.2 | `z-ai/glm-5.2` | chat | OpenRouter |
| Kimi K2.6 | `moonshotai/kimi-k2.6` | chat | OpenRouter |
| DeepSeek V4-Pro | `deepseek/deepseek-v4-pro` | chat | OpenRouter |
| Qwen3 | `qwen/qwen3` | chat | OpenRouter |
| MiniMax M2.7 | `minimax/minimax-m2.7` | chat | OpenRouter |
| Nano Banana 2 Lite (rápido/barato) | `gemini-3.1-flash-lite-image` | image | Gemini direto |
| Nano Banana 2 (qualidade) | `gemini-3.1-flash-image-preview` | image | Gemini direto |
| GPT Image (OpenAI) | `gpt-image-1` | image | OpenAI direto |
| Veo 3.1 Lite (rápido/barato) | `veo-3.1-lite-generate-preview` | video | Gemini direto |
| Veo 3.1 Fast (qualidade) | `veo-3.1-fast-generate-preview` | video | Gemini direto |
| Transcrição rápida (OpenAI) | `gpt-4o-mini-transcribe` | audio | OpenAI direto |
| Whisper clássico (OpenAI) | `whisper-1` | audio | OpenAI direto |

> Os IDs foram um "melhor palpite" no momento da criação (modelos muito recentes).
> Se algo der erro de modelo não encontrado: modelos de chat, confira o slug exato
> em https://openrouter.ai/models; modelos de imagem/vídeo, confira em
> https://ai.google.dev/gemini-api/docs/models. Ajuste em `/admin`.
>
> **Histórico da troca de provedor (2026-07-04):** a imagem/vídeo geradas via
> OpenRouter começaram com `minimax/image-01` (slug que **não existe** — corrigido
> para Nano Banana 2 via OpenRouter) e depois `minimax/hailuo-2.3` pra vídeo. O
> usuário achou a OpenRouter "muito limitada" pra esse uso e pediu pra usar a API
> **direta** do Gemini/Google AI Studio (chave própria, `GEMINI_API_KEY`) — o que
> também permite anexar foto de referência nativamente (o Estúdio de Artes já
> suporta isso, seção 7). MiniMax foi removido do vídeo; os modelos de imagem
> (Nano Banana 2 / Nano Banana 2 Lite) passaram a ser chamados direto no Gemini
> em vez de via OpenRouter (mesmos modelos, API diferente, IDs sem prefixo
> `google/`). Para vídeo, foi adicionado **Veo 3.1** (Lite/Fast) em vez do "Gemini
> Omni Flash" que o usuário pediu inicialmente — Omni Flash usa uma API novíssima
> ("Interactions API") sem exemplo de chamada HTTP crua disponível até o momento
> da implementação, enquanto Veo 3.1 tem um contrato bem documentado
> (`predictLongRunning` + polling). Decisão consciente de menor risco.
>
> **Segundo provedor de imagem (2026-07-05):** o usuário achou o GPT-Image da
> OpenAI melhor que o Nano Banana pra infográficos/texto dentro da imagem e
> pediu pra adicionar como opção — sem tirar o Gemini. Cada modelo de
> imagem/vídeo agora tem um campo `provider` (`gemini`/`openai`) e
> `server.js` despacha pra `src/gemini.js` ou `src/openai-images.js` conforme
> o modelo escolhido, usando a chave correspondente. GPT-Image por enquanto só
> aceita texto (a API de edição de imagem da OpenAI usa um endpoint diferente,
> multipart, não implementado ainda) — anexar foto de referência com ele
> selecionado é ignorado com um aviso claro na tela.
>
> **Transcrição de áudio (2026-07-05):** o usuário já tinha um mini-projeto PHP
> separado (`transcritor`, hospedado no Hostinger) que transcreve áudio via
> `POST https://api.openai.com/v1/audio/transcriptions` (multipart, campos
> `file`/`model`/`language`/`prompt`) — usado como referência direta pra
> implementar a mesma coisa dentro do Estúdio, com a chave da OpenAI já
> configurada no admin em vez de duplicar a configuração num projeto à parte.
> Novo campo `kind: 'audio'` nos modelos.

**Geração de imagem/vídeo/áudio** vive em uma seção própria, separada do chat —
ver seção 7 (Estúdio de Artes). Cada geração tem **custo real** na conta Gemini (vídeo
é bem mais caro que imagem).

**Recomendação de uso:** Kimi K2.6 é o que o usuário relatou responder melhor no geral,
e é o indicado para tarefas de análise de documentos longos (PDF/anexos), já que a
família Kimi (Moonshot AI) é conhecida por lidar bem com contexto extenso. Isso é
apenas uma recomendação de uso — o app não troca de modelo sozinho.

## 4. Arquitetura

Backend **Express único** que funciona em dois ambientes sem duplicar código:

- **Vercel:** `api/index.js` reexporta o app Express como função serverless.
  `vercel.json` define `outputDirectory: public` (estático) + rewrite de `/api/*`
  para a função. Filesystem é efêmero — configuração não persiste entre deploys.
- **Node persistente (Hostinger/Termux/local):** `node server.js` roda o mesmo app
  como processo normal, ouvindo `PORT`. Filesystem é persistente.

```
server.js                    # App Express (fonte da verdade; local/Hostinger)
api/index.js                  # Wrapper serverless que reexporta server.js (Vercel)
vercel.json                    # outputDirectory=public + rewrite /api/*
src/config-store.js             # Config (chave API, modelos, senha admin) — env vars + data/runtime-config.json
src/session.js                   # Sessão admin/chat via cookie assinado (HMAC-SHA256)
src/openrouter.js                 # Proxy de streaming (SSE) para a API de chat da OpenRouter
src/conversation-store.js           # Memória de conversas — Postgres (Vercel) ou data/conversations.json (Node)
src/gemini.js                         # Chamadas diretas a API do Gemini (imagem via generateContent, video via Veo/predictLongRunning) — ver seção 7
src/openai-images.js                   # Chamadas diretas a API da OpenAI (POST /v1/images/generations, so imagem, so texto) — ver seção 7
src/openai-audio.js                     # Chamadas diretas a API da OpenAI (POST /v1/audio/transcriptions, transcricao de audio) — ver seção 7
public/                               # Frontend estático (tudo servido por express.static)
  index.html                            # Chat, texto apenas (com login gate embutido, ver seção 6.1)
  admin.html                             # Painel administrador
  studio.html                             # Estúdio de Artes - geração de imagem/vídeo (ver seção 7)
  css/style.css                           # Tema único (glass) usado por index, admin e studio
  js/chat.js                               # Toda a lógica do chat de texto (ver seção 6)
  js/admin.js                               # Lógica do painel admin
  js/studio.js                              # Lógica do Estúdio de Artes (ver seção 7)
  js/pwa.js                                  # Registro do service worker
  manifest.webmanifest                         # Manifesto PWA (nome "MultiIA")
  service-worker.js                             # Cache do app shell, estratégia network-first
  favicon.ico, icons/*.png                       # Ícones (16/32/180/192/512px)
  js/vendor/pdfjs/                                # pdf.js self-hosted (leitura de PDF)
  js/vendor/tesseract/                             # tesseract.js self-hosted (OCR, ver seção 6.5)
data/runtime-config.json (gitignored)    # Config persistida SÓ em hosts com FS persistente
data/conversations.json (gitignored)      # Histórico de conversas — idem, só em hosts com FS persistente
.env.example                                # Variáveis de ambiente documentadas
```

## 5. Configuração / variáveis de ambiente

| Variável | Para que serve | Onde configurar |
|---|---|---|
| `OPENROUTER_API_KEY` | Autentica as chamadas de chat (texto) na OpenRouter | Vercel: Project Settings → Environment Variables. Hostinger: `.env` local ou painel `/admin` (persiste em `data/runtime-config.json`) |
| `GEMINI_API_KEY` | Autentica as chamadas de imagem/vídeo direto na API do Gemini (Estúdio de Artes) — crie em https://aistudio.google.com/apikey | Idem acima (mesmo padrão de fallback env → painel `/admin` do `OPENROUTER_API_KEY`) |
| `OPENAI_API_KEY` | Autentica as chamadas do modelo GPT Image e a transcrição de áudio (Estúdio de Artes) — crie em https://platform.openai.com/api-keys | Idem acima |
| `ADMIN_PASSWORD` | Senha de login do `/admin` **e também do chat/estúdio** (hash é o que realmente é comparado) | Idem acima |
| `SESSION_SECRET` | Segredo HMAC para assinar o cookie de sessão (chat + admin) | Idem acima |
| `PORT` | Porta ao rodar `node server.js` localmente | `.env` local; ignorado na Vercel |
| `POSTGRES_URL` (opcional) | Guarda o histórico de conversas em Postgres real — necessário na Vercel pra memória sobreviver a um redeploy | Vercel: Storage → Create Database → Postgres (preenche sozinho). Sem isso, cai no fallback de arquivo (`data/conversations.json`), que não persiste na Vercel |

Precedência em `src/config-store.js`: valores salvos em `data/runtime-config.json`
(via painel `/admin`) sobrepõem as variáveis de ambiente, exceto na Vercel, onde
gravação em arquivo é detectada como não-persistente (`process.env.VERCEL`) e o
painel avisa isso claramente ao usuário.

**Estado atual em produção:** `OPENROUTER_API_KEY`, `ADMIN_PASSWORD` e
`SESSION_SECRET` já estavam configuradas na Vercel (senha e segredo gerados por
script, não estão neste arquivo por segurança). `GEMINI_API_KEY` e
`OPENAI_API_KEY` são novas (parte da troca/expansão de provedores de imagem/vídeo)
— **precisam ser adicionadas manualmente** em Project Settings → Environment
Variables com as chaves do Google AI Studio e da OpenAI do usuário, e um
redeploy (adicionar a variável sozinha não redeploya automático).

## 6. Funcionalidades do frontend (`public/js/chat.js`)

### 6.1 Chat básico
- **Login obrigatório:** `index.html` tem um portão de login embutido (mesma senha
  do `/admin`, mesmo cookie de sessão `admin_session`). Enquanto não autenticado,
  `chat.js` mostra só a tela de senha; `GET /api/conversations` retorna 401 e é
  isso que decide se mostra login ou app. `POST /api/chat` também exige sessão
  válida agora (antes era público).
- Seleção de modelo (dropdown, populado via `GET /api/models` — essa continua pública,
  não expõe nada sensível).
- Presets de prompt (dropdown "Selecionar um Prompt"): assistente geral, programador,
  tradutor PT/EN, redator publicitário — definem uma mensagem `system`.
- Envio via `POST /api/chat`, resposta em streaming (SSE) renderizada com efeito de
  "digitando".
- **Histórico de conversas guardado no servidor** (`GET`/`PUT /api/conversations`,
  ambos atrás de login) — ver seção 6.1.1. Sidebar para navegar/criar/excluir
  conversas. `localStorage` não é mais usado para isso (foi removido de propósito:
  guardar só localmente impedia continuar a mesma conversa em outro aparelho, que
  era exatamente o problema que o usuário reportou).

#### 6.1.1 Memória de conversas entre aparelhos
- `src/conversation-store.js` abstrai duas formas de guardar: se `POSTGRES_URL`
  (ou `DATABASE_URL`/`POSTGRES_PRISMA_URL`) estiver definida, usa Postgres de
  verdade (tabela `multiia_conversations`, criada automaticamente se não existir);
  senão, cai em `data/conversations.json` (mesmo padrão do `config-store.js`).
- Estratégia de escrita simples (adequada pra um usuário único, poucas conversas):
  a cada mudança, o client manda o **array inteiro** de conversas via `PUT`, e o
  servidor apaga tudo e reinsere (`DELETE` + `INSERT` numa transação, no caso do
  Postgres). Não há endpoints por-conversa.
- **Isso só persiste de verdade entre deploys/redeploys na Vercel se o Postgres
  estiver configurado.** Sem isso, na Vercel, cada tentativa de salvar
  (`persist()`) vai falhar silenciosamente com um aviso "Não foi possível salvar
  o histórico no servidor agora" — isso é esperado e intencional (mesmo padrão de
  aviso que a chave da OpenRouter já tinha), não é bug. Em host Node persistente
  (Hostinger/local), funciona sem Postgres, gravando no arquivo.
- **Ainda não testado contra um Postgres real** (o ambiente de desenvolvimento
  sandbox não tem acesso de rede pra provisionar/testar isso) — testado e validado
  só o caminho de arquivo local. Se/quando o usuário ativar o Postgres na Vercel,
  vale conferir os logs de função da Vercel se algo falhar.

### 6.2 Layout / PWA
- Tema **glassmorphism** escuro: blobs de gradiente desfocados no fundo, painéis
  translúcidos com `backdrop-filter: blur()`.
- Barra de navegação inferior (estilo app nativo): Chat / Histórico / Prompts / Estúdio / Admin.
- Sidebar de conversas é um drawer com backdrop (mobile) ou painel fixo (desktop).
- Layout usa `100svh` (não `100dvh`) + `env(safe-area-inset-bottom)` para não
  cortar o composer/barra inferior atrás do chrome do navegador mobile.
  **Correção (2026-07-05):** era `100dvh`, mas isso permite que o layout use a
  altura "dinâmica" (com a barra de endereço já recolhida) mesmo nos instantes
  em que ela ainda está expandida (logo após abrir a página ou trocar de aba) —
  nesses momentos a barra de navegação inferior ficava parcialmente escondida
  atrás da barra de endereço do navegador até o usuário rolar a tela uma vez
  (relatado pelo usuário: só via "a ponta" dos ícones do menu). Trocado para
  `100svh` (altura mínima garantida), que sempre cabe dentro da área
  visível de verdade, ao custo de uma faixa vazia (quase imperceptível, mesma
  cor de fundo) quando a barra de endereço está recolhida.
- Instalável como PWA: manifest com ícones 192/512, `favicon.ico` real,
  `apple-touch-icon` 180px, meta tags `apple-mobile-web-app-*`. Ícone é um
  motivo de rede/nós conectados (tema "múltiplos modelos de IA"), em gradiente
  roxo/ciano sobre fundo escuro, consistente com o tema glass do resto do app
  — refeito em 2026-07-05 (16/32/180/192/512px + `favicon.ico`) com mais
  detalhe/gradiente/glow que a versão original (bem mais simples/plana);
  gerado via SVG renderizado com Playwright, sem depender de nenhuma API de
  geração de imagem paga. Cabe dentro da "safe zone" de ícones maskable do
  Android (círculo de ~80% do centro) sem cortar nada importante.
- Service worker (`service-worker.js`) usa estratégia **network-first** (não
  cache-first) para que deploys novos apareçam sem precisar limpar cache do site.
  Versão do cache é bumped manualmente (`CACHE_NAME`) a cada mudança relevante de
  assets — está em `multiia-shell-v16` no momento.

### 6.3 Anexos no composer
Botão 📎 aceita: imagens, `.txt/.md/.csv/.json`, e `.pdf`.

- **Imagens:** convertidas para base64 e enviadas como `image_url` no formato
  multimodal da OpenRouter (funciona só com modelos que suportam visão).
- **Texto/markdown/csv/json:** lidos e concatenados ao prompt como bloco
  `--- arquivo: nome ---`.
- **PDF:** ver seção 6.4.
- Limite de 6MB por arquivo, 20.000 caracteres de texto por anexo (truncado com aviso).
- Anexos NÃO ficam persistidos no histórico de conversas de forma completa — ao
  recarregar a página, o texto continua na mensagem enviada, mas a imagem original
  não é regravada (evita estourar a cota do localStorage).

### 6.4 Leitura de PDF
- Usa **pdf.js** (self-hosted em `public/js/vendor/pdfjs/`, carregado só quando um
  PDF é anexado via `import()` dinâmico — não pesa no carregamento inicial).
- Extrai texto selecionável de até 40 páginas, com corte de segurança em ~30.000
  caracteres brutos antes da truncagem final.
- Se o PDF não tiver texto selecionável (< 20 caracteres extraídos — típico de
  documento escaneado/foto), cai automaticamente no fluxo de **OCR** (seção 6.5)
  em vez de só avisar que não suporta.

### 6.5 OCR (documentos escaneados)
- Usa **tesseract.js** (self-hosted em `public/js/vendor/tesseract/`, ~5.3MB,
  carregado só quando o OCR é realmente acionado).
- Inclui o modelo de idioma **português** (`lang/por.traineddata.gz`, ~1.4MB)
  bundlado no projeto — **não depende de CDN externo** (o padrão do tesseract.js
  seria baixar isso do jsdelivr; aqui foi deliberadamente trocado por um arquivo
  local para manter o app 100% autocontido/offline-friendly).
- Fluxo: cada página do PDF é renderizada num `<canvas>` via pdf.js, depois
  reconhecida pelo Tesseract. Limite de 10 páginas (OCR é bem mais lento que
  extração de texto normal).
- O chip do anexo mostra progresso em tempo real: "lendo...", depois "OCR 3/10",
  depois "(via OCR)" quando pronto. Envio da mensagem fica bloqueado enquanto o
  status é `loading` ou `ocr`.
- Testado com um PDF sintético (imagem sem camada de texto) gerado sob medida —
  reconheceu corretamente o texto desenhado, incluindo acentuação e números.

### 6.6 Blocos de código (respostas da IA)
- Mensagens do assistente são parseadas por blocos ` ```lang ... ``` `.
- Todo bloco ganha botão **Copiar** (clipboard).
- Blocos que parecem HTML completo (linguagem `html` ou começam com
  `<!DOCTYPE html>`/`<html>`) ganham também:
  - **Preview**: abre um overlay **em tela cheia** (`.fullscreen-preview`,
    absoluto dentro de `#mainContent`) que ocupa 100% da largura, entre o topbar
    e a barra inferior (que continuam fixos/visíveis) — não é mais um iframe
    pequeno indentado dentro da bolha de mensagem. Usa
    `<iframe sandbox="allow-scripts">` — **sem** `allow-same-origin` de
    propósito (a combinação dos dois nesse tipo de preview daria ao HTML gerado
    acesso ao localStorage/cookies do próprio app). Tem seu próprio cabeçalho
    com Fechar/Copiar/Baixar.
  - **Baixar .html**: gera o download via `Blob` + `URL.createObjectURL`.
- Correção de bug: uma única linha de código muito longa forçava a bolha de
  mensagem inteira a estourar a largura da tela; corrigido com `min-width: 0` no
  flex item (`.msg .bubble`).

### 6.7 Bug corrigido: "+ Novo Chat" não respondia ao toque
- Causa raiz: `.sidebar-backdrop` (o fundo escurecido atrás do menu, pra fechar
  ao tocar fora) vivia como filho direto do `<body>`, fora da stacking context
  criada por `.app-shell` (`position:relative; z-index:1`). Como `.sidebar`
  (z-index:50) estava DENTRO dessa context e o backdrop (z-index:40) estava FORA
  dela, na comparação de empilhamento ao nível do `<body>` o backdrop (40) vencia
  o `.app-shell` inteiro (1) — cobrindo até os botões do próprio menu, incluindo
  "+ Novo Chat", sem nenhum erro visível.
- Correção: mover `.sidebar-backdrop` para dentro de `.app-shell` (mesma stacking
  context de `.sidebar`), onde o z-index volta a funcionar como esperado.

> Geração de imagem/vídeo **não faz mais parte do chat** (removida de `chat.js`
> depois do primeiro teste real em produção) — foi para uma seção própria, o
> **Estúdio de Artes**. Ver seção 7.

## 7. Estúdio de Artes — geração de imagem/vídeo/áudio (`public/studio.html` + `public/js/studio.js` + `src/gemini.js` + `src/openai-images.js` + `src/openai-audio.js`)

Página separada do chat (`/studio.html`, linkada na barra inferior e no admin),
com seu próprio login gate (mesma senha/cookie de sessão) e sua própria tela:
alternância Imagem/Vídeo, seletor de modelo, opções específicas do tipo
escolhido, upload de foto de referência, biblioteca de ideias de prompt, campo
de prompt e uma galeria de resultados (mais recente no topo).

- **Por que uma seção separada:** no primeiro teste real em produção (imagem e
  vídeo misturados como "modelos" dentro do seletor do chat), ficou confuso
  visualmente e a UX de resultado (bolha de chat) era pobre comparada à de
  código (sem preview em tela cheia, thumbnail de vídeo quebrado). Separar deixa
  o chat de texto limpo de novo e dá espaço pra uma UX pensada pra mídia.
- **Por que API direta do Gemini em vez de OpenRouter:** depois de testar em
  produção, o usuário achou a oferta de modelos de imagem/vídeo da OpenRouter
  limitada e pediu pra usar a chave própria do Google AI Studio direto — o que
  também dá acesso nativo a upload de foto de referência (edição/consistência
  facial), recurso central pro caso de uso principal (ensaios fotográficos a
  partir de uma selfie). `src/gemini.js` substitui o antigo `src/media-generation.js`
  (que chamava a API unificada da OpenRouter e foi removido).
- Cada modelo continua tendo o campo `kind` (`chat`/`image`/`video`/`audio`) em
  `src/config-store.js`, mais um campo `provider` (`gemini`/`openai`) pros de
  imagem/vídeo/áudio. `GET /api/models` (chat, via OpenRouter) e
  `GET /api/models/media` (imagem+vídeo+áudio, inclui o `provider` de cada um)
  seguem existindo como antes; `server.js` despacha a geração pro módulo certo
  (`src/gemini.js`, `src/openai-images.js` ou `src/openai-audio.js`) conforme o
  `provider`/`kind` do modelo escolhido.
- **Transcrição de áudio:** aba "🎙️ Áudio" no Estúdio (kind `audio`, só
  provedor OpenAI por enquanto). Anexa **um** arquivo de áudio (botão 📎,
  `accept="audio/*"`), o campo de texto normal vira opcional e serve como
  "contexto/vocabulário" (nomes próprios, termos técnicos — melhora a precisão
  da transcrição, mesma ideia do parâmetro `prompt` da API da OpenAI). Chama
  `POST /api/generate/audio` → `src/openai-audio.js` →
  `POST https://api.openai.com/v1/audio/transcriptions` (multipart, via
  `FormData`/`Blob` nativos do Node — sem depender de `multer` ou de nenhuma
  lib externa), sempre em português (`language: 'pt'`). Resultado é renderizado
  como texto simples com botão "📋 Copiar" (sem preview de mídia, já que é
  texto, não imagem/vídeo). Não tem proporção/resolução — só o anexo e o
  contexto opcional.
- **Upload de foto de referência:** botão 📎 no composer do Estúdio aceita até 3
  imagens, convertidas para base64 e mantidas anexadas entre gerações (não
  limpa sozinho a cada envio, já que o uso típico é gerar várias variações a
  partir da mesma foto). Para imagem, todas as referências viram `inline_data`
  na requisição (só modelos Gemini — GPT Image ainda não aceita referência, ver
  abaixo); para vídeo, só a primeira é usada como frame de referência.
- **Animar a imagem gerada (imagem → vídeo em sequência):** todo resultado de
  imagem no Estúdio ganha um botão "🎬 Animar esta imagem" que troca a aba pra
  Vídeo, usa a própria imagem gerada como foto de referência (mesmo mecanismo
  do upload manual) e deixa o prompt pronto pra editar — monta o fluxo
  "gerar uma cena estática, depois pedir pra animar essa mesma cena" que o
  usuário pediu, sem precisar baixar/reanexar a imagem manualmente.
- **Biblioteca de ideias de prompt:** dropdown "📖 Ideias de prompt" com ~37
  templates prontos, organizados em categorias (via `<optgroup>`) e
  **filtrados pelo tipo ativo** (`kind: 'image'`/`'video'`/`'both'` em cada
  item): "Ensaios com foto de referência" (o conjunto original, casal/retrato),
  "Animação/ilustração (Nano Banana)" (Pixar, Ghibli, flat design, claymation,
  low poly, cyberpunk, cel shading, aquarela, papercraft, sketch arquitetônico
  — só imagem), "Cinematográfico (vídeo)" (slow motion, hyper-lapse, macro,
  drone fly-through, loop 3D, tipografia cinética, parallax, partículas,
  tracking shot, time-lapse — só vídeo), "Profissional/publicitário" (outdoor,
  mockup, double exposure, flat lay, isométrico, split screen, neon,
  chiaroscuro, infográfico, lifestyle — aparece nas duas abas, `kind: 'both'`)
  e "Infográficos" (estilo revista com painéis + personagem especialista, e
  vista explodida técnica com dados reais tipo desenho de engenharia — só
  imagem, adaptado de um tutorial de infográficos com IA fornecido pelo
  usuário). Mesmo padrão das "Técnicas de estudo" do chat (seção 6): insere o
  texto no campo de prompt pronto pra editar, não é um array gerenciável pelo
  admin — pra adicionar mais ideias, edite o array `PROMPT_LIBRARY` em
  `public/js/studio.js` (cada item precisa de `id`, `kind`, `category`, `label`,
  `template`).
- **Opções por tipo:**
  - Imagem: proporção (`aspect_ratio`) — 9:16 (padrão), 16:9, 4:3, 3:4. `1:1` foi
    **removido** (não é o padrão para nenhuma opção): a API real do Gemini
    rejeitou essa proporção contra o modelo Nano Banana 2 Lite com o erro
    `"aspectRatio does not support 1:1 as a valid value"` — comportamento real
    da API prevaleceu sobre a documentação geral, que sugeria `1:1` como válido.
    `9:16` virou o valor padrão do seletor a pedido do usuário ("o modelo que
    eu quero que seja padrão para todos os as opções é 9 por 16").
  - Vídeo: proporção (mesma lista acima, `9:16` padrão) + resolução (720p/1080p,
    valores reais do Veo 3.1).
- **API usada** (direto na API do Gemini, `x-goog-api-key`, não passa pela
  OpenRouter):
  - Imagem — `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
    com `contents: [{ parts: [...referencias como inline_data, { text: prompt }] }]`
    e `generationConfig: { responseModalities: ["IMAGE","TEXT"], imageConfig: { aspectRatio } }`.
    Resposta em `candidates[0].content.parts[]`, procurando a parte com
    `inlineData`/`inline_data` (mimeType + base64) — convertida para
    `data:<mime>;base64,...` no servidor.
  - Vídeo (Veo 3.1) — `POST .../models/{model}:predictLongRunning` com
    `instances: [{ prompt, image?: { bytesBase64Encoded, mimeType } }]` e
    `parameters: { aspectRatio, resolution }`. Retorna um nome de operação
    (`models/.../operations/ID`) que o frontend usa pra fazer polling em
    `GET /api/generate/video/:jobId` (rota aceita `/` no id) →
    `GET https://generativelanguage.googleapis.com/v1beta/{operationName}` a
    cada 5s (até ~90 tentativas) até `done: true`. Os vídeos prontos vêm como
    uma referência de arquivo (`uri`/`name`) à qual o servidor anexa
    `?key=GEMINI_API_KEY` pra ficar diretamente acessível pelo `<video src>`
    do navegador.
  - Imagem (GPT Image, OpenAI) — `POST https://api.openai.com/v1/images/generations`
    com `{ model, prompt, size, n: 1 }` (tamanho mapeado a partir da proporção
    escolhida: quadrado→1024x1024, paisagem→1536x1024, retrato→1024x1536, os
    únicos tamanhos que a API aceita). Resposta em `data[].b64_json`, convertida
    para `data:image/png;base64,...`. **Não aceita foto de referência ainda**
    (exigiria o endpoint `/v1/images/edits`, multipart, não implementado).
  - Todos exigem sessão autenticada (`session.requireAdmin`), igual ao resto do
    app.
- **Preview em tela cheia**, mesmo padrão usado pro preview de código HTML no
  chat (seção 6.6): clicar na imagem/vídeo gerado abre um overlay
  `.fullscreen-preview` dentro de `#mainContent`, com cabeçalho
  Fechar/Abrir-Baixar. Reaproveita a mesma classe CSS; o conteúdo é um
  `<img>`/`<video>` (`.fullscreen-preview-media`, `object-fit: contain`) em vez
  de um iframe.
- **Resultados não são persistidos** — a galeria vive só na memória da página
  (mesma decisão já tomada pra anexos de imagem no chat, pra não estourar cota
  de armazenamento com base64 grandes); baixe o que quiser guardar antes de
  recarregar a página.
- **Modelos configurados:** três opções de imagem — Nano Banana 2 Lite
  (`gemini-3.1-flash-lite-image`, padrão: rápido e barato), Nano Banana 2
  (`gemini-3.1-flash-image-preview`, mais qualidade, o dobro do preço) e GPT
  Image (`gpt-image-1`, OpenAI, melhor pra infográficos/texto dentro da
  imagem segundo o usuário) — e duas de vídeo, Veo 3.1 Lite
  (`veo-3.1-lite-generate-preview`, padrão, mais barato) e Veo 3.1 Fast
  (`veo-3.1-fast-generate-preview`, mais qualidade) — e duas de áudio,
  Transcrição rápida (`gpt-4o-mini-transcribe`, padrão) e Whisper clássico
  (`whisper-1`) — ver tabela da seção 3. Editável em `/admin` como qualquer
  outro modelo. MiniMax foi removido das opções de vídeo (só continua
  existindo como modelo de **chat**, `minimax/minimax-m2.7`, isso não mudou).
- **Gemini Omni Flash (vídeo) não foi implementado:** é o modelo que o usuário
  pediu originalmente, mas usa uma API novíssima do Gemini ("Interactions API",
  `client.interactions.create(...)`) sem nenhum exemplo de chamada HTTP crua
  disponível até o momento desta implementação — implementar às cegas arriscaria
  gastar crédito real numa integração provavelmente errada. Optou-se por **Veo
  3.1** (Lite/Fast), que usa o padrão bem documentado `predictLongRunning` +
  polling. Trocar para Omni Flash mais tarde é possível assim que a API dele
  estiver melhor documentada.
- **Conversa de voz ao vivo (OpenAI GPT-Realtime) — pedida, ainda não
  implementada.** O usuário confirmou que quer o recurso completo (chamada de
  voz bidirecional em tempo real com a IA), não uma narração simples de texto
  em áudio. Isso é uma funcionalidade nova de verdade, bem diferente do padrão
  "digita um prompt, recebe um arquivo" do resto do Estúdio: exige sessão
  WebRTC entre o navegador e a OpenAI, um endpoint novo no servidor pra emitir
  um token efêmero de sessão (`POST /v1/realtime/sessions`, a chave real nunca
  vai pro navegador), captura de microfone (`getUserMedia`) e uma tela de "em
  chamada" própria. Vai ser tratado como uma etapa separada de planejamento e
  implementação, não algo para encaixar de forma apressada.
- **Testado com respostas mockadas** (Playwright, sem gastar crédito real) antes
  do primeiro deploy, e depois **confirmado com chamadas reais** (2026-07-05):
  - **Imagem: funcionando, incluindo referência.** Nano Banana 2 gerou
    corretamente a partir de texto puro e, com uma foto de referência anexada,
    reproduziu fielmente a cena/personagens da foto (testado com uma imagem de
    2 personagens dentro de um carro). Sem a referência, o mesmo prompt gera
    uma variação livre, como esperado. Nenhum ajuste necessário em
    `src/gemini.js` pro caminho de imagem.
  - **Vídeo: funciona sem referência, falha (silenciosamente) com referência.**
    Veo 3.1 gerou um vídeo real a partir de um prompt de texto puro. Ao repetir
    o mesmo prompt com uma foto de referência anexada (mesmos personagens do
    teste de imagem), o job foi aceito e processado normalmente (várias
    tentativas de polling, sem erro de requisição) mas terminou sem nenhum
    vídeo — sintoma clássico do filtro de segurança de conteúdo do Google
    (`raiMediaFilteredCount`), que pode barrar silenciosamente a geração
    quando a referência mostra personagens/pessoas reconhecíveis fazendo
    determinados movimentos, mesmo com `done: true` e sem `error`. **Corrigido
    em `src/gemini.js`:** `pollVideoJob` agora detecta esse campo e lança um
    erro explícito ("O Gemini bloqueou a geração por política de conteúdo...")
    em vez do genérico "A geração do vídeo falhou".
  - **Confirmado numa segunda rodada de teste real (2026-07-05), com um prompt
    de personagens reconhecíveis — Scooby-Doo e Salsicha):** o erro apareceu
    exatamente no formato esperado, com o texto real do Google incluído
    ("We encountered an issue with the audio for your prompt... **You have not
    been charged for this attempt**"). Ou seja: não é falta de crédito nem bug
    do projeto — é rejeição por política de conteúdo (provavelmente por
    reproduzir personagens protegidos por direitos autorais), e a tentativa
    falhada **não foi cobrada**. Na mesma rodada, o **GPT Image (OpenAI)**
    também rejeitou o mesmo tipo de conteúdo com sua própria mensagem genérica
    de segurança ("Your request was rejected by the safety system...") — sem
    necessidade de nenhum ajuste de código, é só o texto de erro da OpenAI
    passando direto (o pipeline de erro já existente cobre isso) — segundo
    ponto de evidência apontando pra a mesma causa (personagens protegidos).
  - **Bug real encontrado e corrigido na mesma rodada:** a API do Gemini
    rejeitou `aspectRatio: "1:1"` contra o modelo Nano Banana 2 Lite com
    `"aspectRatio does not support 1:1 as a valid value"`. Corrigido removendo
    `1:1` da lista de proporções em `public/js/studio.js` e definindo `9:16`
    como padrão (ver detalhes na lista de opções acima).

## 8. Painel administrador (`public/admin.html` + `public/js/admin.js`)

- Login por senha (`POST /api/admin/login`), sessão via cookie `admin_session`
  assinado com HMAC (`src/session.js`), válido por 12h.
- Mostra se as chaves da OpenRouter (chat), do Gemini e da OpenAI (Estúdio de
  Artes) estão configuradas (e a origem: variável de ambiente ou arquivo
  local/painel) — nunca expõe o valor das chaves já salvas. Três seções
  separadas, um campo para cada.
- **Confirmação visual ao salvar:** toda ação de salvar (chave OpenRouter,
  chave Gemini, modelos, senha) mostra um toast fixo no topo da tela
  ("✅ ... salva com sucesso") por ~2.5s, além do texto de feedback já existente
  e do botão clicado piscar "✅ Salva!" por um instante — corrige o problema de
  não dar pra confirmar se salvou antes de navegar pra outra tela (reportado
  pelo usuário ao usar o botão voltar do navegador logo depois de salvar).
- Tabela de modelos: habilitar/desabilitar, editar ID e nome exibido, escolher
  o **Tipo** (Chat / Imagem / Vídeo / Áudio) e o **Provedor** (Gemini / OpenAI —
  só relevante pra Imagem/Vídeo/Áudio; o seletor fica desabilitado quando o
  Tipo é Chat, já que chat sempre usa a OpenRouter) — ver seção 7. Adicionar ou
  remover linhas.
- Troca de senha do admin (exige senha atual).
- Banner de aviso diferenciado por plataforma: na Vercel, deixa claro que
  alterações feitas ali só duram até o próximo cold start/deploy (recomenda usar
  Environment Variables); em host Node persistente, confirma que grava em
  `data/runtime-config.json`.
- Link direto pro Estúdio de Artes (seção 7) ao lado do "Voltar ao chat".

## 9. Segurança

- Senha do admin nunca é armazenada em texto puro — hash PBKDF2 (100k iterações,
  salt aleatório) via `crypto` nativo do Node.
- Cookie de sessão é `HttpOnly`, `SameSite=Lax`, assinado com HMAC-SHA256
  (`SESSION_SECRET`) — não é um JWT de biblioteca externa, é uma implementação
  mínima própria. A mesma sessão vale tanto pro chat quanto pro `/admin` (não há
  dois níveis de permissão — é uso pessoal de uma pessoa só).
- Preview de HTML gerado por IA roda em iframe sandboxed sem acesso ao mesmo
  contexto de origem do app (ver 6.6).
- Nenhuma chave (API key, senha) fica hardcoded no repositório — tudo vem de
  variáveis de ambiente ou é digitado pelo usuário via `/admin`.

## 10. Deploy

### Vercel (ambiente principal, já configurado)
- Projeto **já está conectado ao GitHub** via integração nativa da Vercel
  (confirmado: aparece "Connect Git Repository ✓" no checklist de produção do
  projeto). Isso significa que **todo merge para `main` dispara redeploy
  automático** — não é necessário nenhuma ação manual na Vercel depois de um PR
  mesclado, só aguardar 1-2 minutos.
- Domínio de produção: `claude-mobile-lab.vercel.app`.
- Variáveis de ambiente já configuradas (ver seção 5).
- **Pendente:** ativar Postgres (Storage → Create Database) pra memória de
  conversas persistir de verdade entre deploys — sem isso, funciona só durante o
  tempo de vida de cada instância serverless (ver seção 6.1.1). O Estúdio de
  Artes (seção 7) não usa esse Postgres — os resultados de imagem/vídeo não são
  persistidos de propósito.
- **Importante:** este projeto foi desenvolvido a partir de um ambiente sandbox
  cujo proxy de rede bloqueia acesso a `vercel.com`/`api.vercel.com` por política —
  ou seja, uma IA trabalhando neste repo a partir de um ambiente parecido **não
  conseguirá** rodar `vercel` CLI, fazer login ou deploy direto. O caminho correto
  é sempre: commit → push → PR → merge, e deixar a integração Git da Vercel
  reimplantar sozinha.

### Hostinger / Termux (alternativa, documentada mas não testada em produção)
- Requer plano com suporte a Node.js Apps (hPanel).
- `npm install --production` + `.env` local + `node server.js`.
- Filesystem persistente → painel `/admin` grava direto em
  `data/runtime-config.json`.
- Ver instruções completas no `README.md` do repositório.

## 11. Histórico de Pull Requests (o que foi entregue em cada um)

| PR | Título | Conteúdo principal |
|---|---|---|
| #2 | Add Chat IA Aberta PWA with admin panel | Scaffold inicial: Express dual (Vercel+Node), chat, admin, OpenRouter proxy |
| #3 | Rename to MultiIA + complete PWA icon set | Renomeação "Chat IA Aberta" → "MultiIA", favicon.ico, ícones 16/32/180/192/512, meta tags iOS |
| #4 | Glassmorphism redesign + bottom nav + attachments | Fix de viewport (100dvh), tema glass, barra inferior, drawer da sidebar corrigido, anexos de imagem/texto, service worker network-first |
| #5 | Code blocks: copy/preview/download | Parser de blocos de código nas respostas, preview sandboxed, fix de overflow horizontal |
| #6 | PDF text extraction | pdf.js self-hosted, extração de texto de PDF nos anexos |
| #7 | OCR fallback for scanned PDFs | tesseract.js self-hosted + traineddata em português, fallback automático para PDFs sem texto |
| #8 | Docs + bug fixes + cross-device conversation memory | `multIA.md`, correção do z-index do backdrop (Novo Chat destravado), preview de HTML em tela cheia, `src/conversation-store.js` (Postgres/arquivo), login obrigatório no chat |
| #9 | WhatsApp preset + reply copy button + study templates | Preset "Revisar p/ WhatsApp", botão Copiar em toda resposta, 6 templates de técnica de estudo no seletor de prompts |
| #10 | Image/video generation via OpenRouter | `src/media-generation.js`, campo `kind` nos modelos, endpoints `/api/generate/image` e `/api/generate/video`, UI de mídia gerada no chat (só MiniMax por enquanto) |
| #11 | Fix imagem quebrada + Estúdio de Artes separado | Troca `minimax/image-01` (inexistente) por Nano Banana 2 via OpenRouter, opções de resolução/duração pro vídeo, geração de imagem/vídeo removida do chat e movida pra `/studio.html` com preview em tela cheia |
| #12 | Nano Banana 2 Lite como padrão | Adiciona Nano Banana 2 Lite (mais barato/rápido) como opção padrão de imagem via OpenRouter |
| #13 | Estúdio de Artes: API direta do Gemini | `src/gemini.js` substitui `src/media-generation.js`, `GEMINI_API_KEY` + campo no admin, MiniMax removido do vídeo, Veo 3.1 (Lite/Fast) no lugar de Omni Flash, upload de foto de referência e biblioteca de ideias de prompt no Estúdio |
| #14 | Toast de confirmação no admin + biblioteca de prompts ampliada + detecção de filtro de conteúdo | Toast + flash no botão ao salvar chaves/modelos/senha, ~27 novos templates de prompt (animação/ilustração, cinematográfico, publicitário) filtrados por tipo, `pollVideoJob` detecta bloqueio por política de conteúdo do Gemini |
| #15 | GPT Image (OpenAI) + animar imagem gerada + infográficos | `src/openai-images.js`, campo `provider` nos modelos, `OPENAI_API_KEY` + campo no admin, botão "Animar esta imagem" (imagem → vídeo), 2 templates de infográfico (estilo revista, vista explodida) |
| #16 | Ícone do app refeito em alta definição | Novo ícone (rede/nós, roxo/ciano) gerado via SVG + Playwright em 16/32/180/192/512px, `favicon.ico` reconstruído |
| #17 | Transcrição de áudio + fix de layout mobile | `src/openai-audio.js` + aba Áudio no Estúdio (`kind: 'audio'`), fix de `.app-shell`/`.login-shell` usando `100svh` em vez de `100dvh` (barra inferior escondida atrás da barra de endereço do navegador) |
| #18 (a caminho) | Fix proporção 1:1 inválida no Gemini + 9:16 como padrão | Remove `1:1` de `ASPECT_RATIOS` (rejeitada pela API real do Gemini), define `9:16` como padrão para imagem e vídeo |

Todos os PRs foram mesclados com **squash** para `main`. A branch de trabalho
(`claude/pwa-chat-open-ai-snbygj`) é resetada para `origin/main` no início de cada
nova rodada de mudanças (padrão adotado neste projeto: nunca empilhar commits
sobre um PR já mesclado).

## 12. Limitações conhecidas / possíveis próximos passos

- Memória de conversas entre aparelhos exige a mesma senha em ambos (não há
  conceito de múltiplos usuários/contas — é deliberadamente single-user).
- Na Vercel, a memória só sobrevive de verdade a um redeploy se o Postgres for
  ativado (ver seção 6.1.1 e 9) — isso ainda não foi feito/testado em produção.
- Anexos de imagem não sobrevivem a um reload de página (fica só uma marcação de
  texto "(imagem)" no histórico) — decisão deliberada para não estourar cota do
  localStorage com base64 grandes.
- Slugs de modelo no admin podem ficar desatualizados se a OpenRouter mudar os
  identificadores — checar https://openrouter.ai/models se o chat passar a
  reclamar de "modelo não encontrado".
- OCR e leitura de PDF rodam 100% no navegador do usuário (sem custo de servidor),
  mas por isso dependem do processador do aparelho — em celulares mais fracos,
  OCR de várias páginas pode demorar.
- Domínio próprio `criativopublicitario.com.br` (Hostinger) foi mencionado como
  possibilidade futura, mas ainda não foi configurado/testado.
- Nenhum teste automatizado (unit/e2e) foi deixado no repositório — toda a
  verificação até agora foi manual/exploratória (Playwright ad-hoc, descartado
  após uso).
- **Vídeo com foto de referência pode ser bloqueado por política de conteúdo
  do Gemini** (`raiMediaFilteredCount`) — confirmado em teste real com uma
  referência mostrando personagens reconhecíveis. `src/gemini.js` já detecta e
  reporta isso com uma mensagem clara, mas não há como contornar do lado do
  app — é uma restrição da própria API. Vídeo sem referência (texto puro) foi
  confirmado funcionando. Ver detalhes no fim da seção 7.
- Resultados do Estúdio de Artes não são persistidos entre reloads (mesma
  decisão de não guardar base64 grandes já aplicada a anexos de imagem no chat)
  — o usuário precisa baixar o que quiser guardar. Fotos de referência anexadas
  também se perdem ao recarregar a página (ficam só na memória da aba aberta).
- **Requer `GEMINI_API_KEY` e/ou `OPENAI_API_KEY` configuradas** (env var ou
  painel `/admin`) conforme os modelos habilitados — sem a chave do provedor
  certo, a geração retorna 503 com o nome da chave que falta.
- Gemini Omni Flash (vídeo) não foi implementado — usa uma API novíssima
  ("Interactions API") sem exemplo de chamada HTTP crua disponível; Veo 3.1 foi
  usado no lugar por ter um contrato mais bem documentado. Reavaliar Omni Flash
  quando a documentação/exemplos da Interactions API amadurecerem.
- **GPT Image (OpenAI) não aceita foto de referência ainda** — só gera a
  partir de texto. Anexar uma referência com ele selecionado mostra um aviso e
  a referência é ignorada (não é enviada à API). Implementar isso exigiria o
  endpoint `/v1/images/edits` (multipart), fora do escopo desta rodada.
- **Conversa de voz ao vivo (GPT-Realtime) foi pedida mas ainda não
  implementada** — é uma funcionalidade nova e maior (sessão WebRTC ao vivo,
  não um "gerador" como o resto do Estúdio), tratada como uma etapa própria de
  planejamento/implementação.
  **Achado (2026-07-05):** o usuário compartilhou um mini-projeto próprio
  ("vozai", PHP+HTML) como referência de como imaginava a conversa por voz —
  mas o zip está incompleto (falta o `app.js` que faria a gravação/resposta de
  áudio de verdade) e o que existe é só um botão de permissão de microfone +
  um chat de **texto** com a API da Anthropic (Claude), não uma implementação
  de voz em tempo real. Isso é evidência de que o padrão real desejado pode
  ser mais simples do que GPT-Realtime (ex: gravar → transcrever → responder
  em texto/voz, por turnos) — vale confirmar com o usuário antes de investir
  na integração WebRTC completa.
- Transcrição de áudio (seção 7) é só texto de entrada/saída — não gera nem
  reproduz áudio (isso seria a parte de "conversa por voz", ainda não
  implementada, ver item acima). Testado só com resposta mockada (Playwright);
  o `multipart/form-data` real da OpenAI ainda não foi confirmado com uma
  chamada de verdade.
- A biblioteca de ideias de prompt do Estúdio (seção 7) é uma lista fixa no
  código (`PROMPT_LIBRARY` em `studio.js`), não gerenciável pelo admin — expandir
  a lista exige editar o arquivo.

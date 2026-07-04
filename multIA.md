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

Todos acessados via **OpenRouter** (`OPENROUTER_API_KEY`), editáveis em `/admin`.
Cada modelo tem um campo **Tipo** (`kind`): `chat`, `image` ou `video` — controla em
qual optgroup do seletor de modelo ele aparece e qual API da OpenRouter é chamada.

| Modelo | Slug atual no admin | Tipo |
|---|---|---|
| GLM-5.2 | `z-ai/glm-5.2` | chat |
| Kimi K2.6 | `moonshotai/kimi-k2.6` | chat |
| DeepSeek V4-Pro | `deepseek/deepseek-v4-pro` | chat |
| Qwen3 | `qwen/qwen3` | chat |
| MiniMax M2.7 | `minimax/minimax-m2.7` | chat |
| Nano Banana 2 (Gemini) | `google/gemini-3.1-flash-image-preview` | image |
| MiniMax Video | `minimax/hailuo-2.3` | video |

> Os slugs foram um "melhor palpite" no momento da criação (modelos muito recentes).
> Se o chat der erro de modelo não encontrado, confira o slug exato em
> https://openrouter.ai/models e ajuste em `/admin`.
>
> **Correção de bug (2026-07-04):** o slug original de imagem, `minimax/image-01`,
> não existe na OpenRouter (a MiniMax não tem modelo de geração de imagem lá, só
> texto/visão) — todo teste real dava erro. Trocado por **Nano Banana 2**
> (`google/gemini-3.1-flash-image-preview`), confirmado na coleção de modelos de
> imagem da OpenRouter e usando a mesma chave já configurada (sem provedor novo).

**Geração de imagem/vídeo** agora vive em uma seção própria, separada do chat — ver
seção 7 (Estúdio de Artes). Cada geração tem **custo real** na conta OpenRouter (vídeo
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
src/media-generation.js               # Chamadas para as APIs de imagem/video da OpenRouter (ver seção 7)
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
| `OPENROUTER_API_KEY` | Autentica as chamadas de chat na OpenRouter | Vercel: Project Settings → Environment Variables. Hostinger: `.env` local ou painel `/admin` (persiste em `data/runtime-config.json`) |
| `ADMIN_PASSWORD` | Senha de login do `/admin` **e também do chat** (hash é o que realmente é comparado) | Idem acima |
| `SESSION_SECRET` | Segredo HMAC para assinar o cookie de sessão (chat + admin) | Idem acima |
| `PORT` | Porta ao rodar `node server.js` localmente | `.env` local; ignorado na Vercel |
| `POSTGRES_URL` (opcional) | Guarda o histórico de conversas em Postgres real — necessário na Vercel pra memória sobreviver a um redeploy | Vercel: Storage → Create Database → Postgres (preenche sozinho). Sem isso, cai no fallback de arquivo (`data/conversations.json`), que não persiste na Vercel |

Precedência em `src/config-store.js`: valores salvos em `data/runtime-config.json`
(via painel `/admin`) sobrepõem as variáveis de ambiente, exceto na Vercel, onde
gravação em arquivo é detectada como não-persistente (`process.env.VERCEL`) e o
painel avisa isso claramente ao usuário.

**Estado atual em produção:** as 3 variáveis foram configuradas na Vercel (senha e
segredo gerados por script, não estão neste arquivo por segurança — estão salvas
apenas na Vercel). Se precisar trocá-las, gere novos valores e atualize em
Environment Variables + Redeploy.

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
- Layout usa `100dvh` (não `100vh`) + `env(safe-area-inset-bottom)` para não cortar
  o composer atrás da barra do navegador mobile.
- Instalável como PWA: manifest com ícones 192/512, `favicon.ico` real,
  `apple-touch-icon` 180px, meta tags `apple-mobile-web-app-*`.
- Service worker (`service-worker.js`) usa estratégia **network-first** (não
  cache-first) para que deploys novos apareçam sem precisar limpar cache do site.
  Versão do cache é bumped manualmente (`CACHE_NAME`) a cada mudança relevante de
  assets — está em `multiia-shell-v11` no momento.

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

## 7. Estúdio de Artes — geração de imagem/vídeo (`public/studio.html` + `public/js/studio.js` + `src/media-generation.js`)

Página separada do chat (`/studio.html`, linkada na barra inferior e no admin),
com seu próprio login gate (mesma senha/cookie de sessão) e sua própria tela:
alternância Imagem/Vídeo, seletor de modelo, opções específicas do tipo
escolhido, campo de prompt e uma galeria de resultados (mais recente no topo).

- **Por que uma seção separada:** no primeiro teste real em produção (imagem e
  vídeo misturados como "modelos" dentro do seletor do chat), ficou confuso
  visualmente e a UX de resultado (bolha de chat) era pobre comparada à de
  código (sem preview em tela cheia, thumbnail de vídeo quebrado). Separar deixa
  o chat de texto limpo de novo e dá espaço pra uma UX pensada pra mídia.
- Cada modelo continua tendo o campo `kind` (`chat`/`image`/`video`) em
  `src/config-store.js`. `GET /api/models` (chat) e `GET /api/models/media`
  (imagem+vídeo) seguem existindo como antes; só o consumo mudou de página.
- **Opções por tipo:**
  - Imagem: proporção (`aspect_ratio`) — 1:1, 16:9, 9:16, 4:3, 3:4.
  - Vídeo: resolução (768p/1080p) e duração (6s/10s). O Hailuo 2.3 só suporta
    clipes de 10s em 768p (1080p vai até 6s) — a UI ajusta a duração
    automaticamente pra 6s se 1080p for escolhido, pra não mandar uma
    combinação inválida pra API.
- **API usada** (endpoints oficiais e recentes da própria OpenRouter, mesma
  chave do chat):
  - `POST https://openrouter.ai/api/v1/images` — síncrono. Corpo
    `{ model, prompt, aspect_ratio? }`. Resposta traz `data: [{ b64_json,
    media_type }]` (ou `url` dependendo do modelo); o servidor converte para
    `data:<mime>;base64,...` antes de devolver ao frontend.
  - `POST https://openrouter.ai/api/v1/videos` — assíncrono. Cria um job e
    retorna `{ id, status: "pending" }`. O frontend faz polling em
    `GET /api/generate/video/:jobId` → `GET https://openrouter.ai/api/v1/videos/{id}`
    a cada 5s (até ~90 tentativas, ~7.5min) até `status === "completed"`, então usa
    `unsigned_urls` para exibir (`<video controls>`) e baixar.
  - Ambos exigem sessão autenticada (`session.requireAdmin`), igual ao resto do
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
- **Modelos configurados:** Nano Banana 2 (`google/gemini-3.1-flash-image-preview`,
  imagem) e MiniMax Video (`minimax/hailuo-2.3`, vídeo) — ver tabela da seção 3.
  Editável em `/admin` como qualquer outro modelo.
- **Gemini Omni Flash (vídeo) ficou de fora por enquanto:** é um modelo muito
  recente do Google e, até onde foi possível confirmar, ainda não está
  disponível nos modelos de vídeo da OpenRouter (que hoje cobre Seedance, Veo
  3.1, Wan, Sora 2 Pro e Hailuo). Pra ter Omni Flash seria preciso integrar
  direto com a API do Google AI Studio (autenticação e formato de resposta
  diferentes, uma segunda chave de API) — decisão consciente de adiar isso até
  a OpenRouter adicionar suporte ou o contrato da API direta do Google ser
  validado com mais confiança.
- **Testado só com respostas mockadas** (Playwright, sem gastar crédito real):
  fluxo de imagem e vídeo completos, troca de tipo/modelo, ajuste automático de
  duração ao escolher 1080p, abertura/fechamento do preview em tela cheia. O
  slug do Nano Banana 2 e o formato exato de resposta da OpenRouter pra ele
  ainda precisam ser confirmados na primeira geração real em produção.

## 8. Painel administrador (`public/admin.html` + `public/js/admin.js`)

- Login por senha (`POST /api/admin/login`), sessão via cookie `admin_session`
  assinado com HMAC (`src/session.js`), válido por 12h.
- Mostra se a chave da OpenRouter está configurada (e a origem: variável de
  ambiente ou arquivo local) — nunca expõe o valor da chave já salva.
- Tabela de modelos: habilitar/desabilitar, editar slug e nome exibido, escolher
  o **Tipo** (Chat / Imagem / Vídeo — ver seção 7), adicionar ou remover
  linhas.
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
| #11 (a caminho) | Fix imagem quebrada + Estúdio de Artes separado | Troca `minimax/image-01` (inexistente) por Nano Banana 2 via OpenRouter, opções de resolução/duração pro vídeo, geração de imagem/vídeo removida do chat e movida pra `/studio.html` com preview em tela cheia |

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
- Geração de imagem/vídeo (seção 7) só foi testada com respostas mockadas — o
  slug e formato de resposta do Nano Banana 2 (`google/gemini-3.1-flash-image-preview`)
  ainda precisam ser confirmados na primeira geração real em produção.
- Resultados do Estúdio de Artes não são persistidos entre reloads (mesma
  decisão de não guardar base64 grandes já aplicada a anexos de imagem no chat)
  — o usuário precisa baixar o que quiser guardar.
- Gemini Omni Flash (vídeo) ficou de fora por não estar disponível via
  OpenRouter ainda — integrá-lo exigiria uma segunda chave/API direta do Google
  AI Studio, adiado até ter mais confiança no contrato dessa API ou suporte via
  OpenRouter.

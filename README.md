# Claude Mobile Lab

Laboratório de projetos desenvolvidos com Claude Code, GitHub, Termux e Vercel.

## Objetivo

Criar, testar e evoluir aplicações web, automações e protótipos diretamente pelo celular.

## Tecnologias

- Claude Code
- GitHub
- Termux
- Vercel
- HTML
- CSS
- JavaScript
- PHP

## Status

🚀 Em desenvolvimento

---

## Chat IA Aberta (PWA)

PWA de chat com acesso exclusivo a modelos abertos de IA via [OpenRouter](https://openrouter.ai),
no estilo do Open WebUI: seletor de modelo, presets de prompt, histórico de conversas
(salvo no navegador) e uma área de administrador protegida por senha para gerenciar a
chave de API e a lista de modelos habilitados.

Modelos padrão configurados (ajustáveis em `/admin`, os slugs da OpenRouter podem mudar
com o tempo — confira o slug exato do modelo em https://openrouter.ai/models antes de salvar):

- GLM-5.2
- Kimi K2.6
- DeepSeek V4-Pro
- Qwen3
- MiniMax M2.7

### Rodando localmente

```bash
npm install
cp .env.example .env   # preencha OPENROUTER_API_KEY, ADMIN_PASSWORD, SESSION_SECRET
npm start
```

Acesse `http://localhost:3000` para o chat e `http://localhost:3000/admin.html` para o painel
de administrador (senha inicial definida em `ADMIN_PASSWORD`).

### Deploy na Vercel

1. Importe este repositório na Vercel (framework preset: "Other").
2. Em **Project Settings → Environment Variables**, defina:
   - `OPENROUTER_API_KEY`
   - `ADMIN_PASSWORD`
   - `SESSION_SECRET`
3. Faça o deploy. O arquivo `vercel.json` já roteia `/api/*` para a função serverless
   (`api/index.js`) e serve o conteúdo de `public/` como site estático.

> Na Vercel o sistema de arquivos das funções é efêmero, então a chave de API deve ficar
> nas Environment Variables do projeto (não é persistida pelo painel `/admin` de forma
> permanente ali — o painel deixa isso claro).

### Deploy na Hostinger (via Termux/SSH)

1. Garanta que o plano da Hostinger tenha suporte a aplicações Node.js (hPanel → Node.js App).
2. Envie o projeto (git clone ou upload) para o servidor e rode `npm install --production`.
3. Crie o arquivo `.env` no servidor (não versionado) com `OPENROUTER_API_KEY`,
   `ADMIN_PASSWORD` e `SESSION_SECRET`.
4. Configure o app Node para iniciar com `node server.js` e aponte o domínio
   `criativopublicitario.com.br` para essa aplicação.
5. Nesse ambiente o sistema de arquivos é persistente: a chave de API e a lista de
   modelos salvas pelo painel `/admin` são gravadas em `data/runtime-config.json`
   (arquivo local, fora do controle de versão).

### Estrutura

```
server.js            # Express app (usado local/Hostinger e reexportado para a Vercel)
api/index.js          # Wrapper serverless para a Vercel
src/config-store.js    # Leitura/escrita da config (chave de API, modelos, senha admin)
src/session.js         # Sessão de admin via cookie assinado (HMAC)
src/openrouter.js       # Proxy de streaming para a API de chat da OpenRouter
public/                # Frontend estático do PWA (chat + admin)
```

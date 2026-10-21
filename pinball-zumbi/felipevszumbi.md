# Felipe vs Zumbi: guia do projeto (leia isto primeiro)

Jogo particular e familiar para Felipe Maximus Brandão. Não é para loja de apps. Pinball + defesa com plantas + fusão, retrato 9:16, PWA em HTML/CSS/JS, hospedado na Hostinger (sem Vercel).
Template e referência oficial: **pinball-zumbi-fase1g** (Fase 1 aprovada). Novas fases reaproveitam o motor e trocam cenário e desafio.

## 1. Regras de trabalho com o Marcelo
- Responder em pt-BR, direto, curto, sem travessões.
- Mudança cirúrgica: não alterar o que não foi pedido.
- Não usar subagentes nem ler arquivos desnecessários.
- Nunca publicar, enviar, apagar ou subir nada (GitHub, Vercel, servidor) sem autorização explícita. Deploy é feito por ele, à mão, na Hostinger.
- Toda entrega termina com os blocos **Construído** e **Decisões suas** e um checklist (abrir no celular, botão Voltar, versão do cache do Service Worker incrementada, conferir no servidor). Marcar o que não foi verificado.
- Entrega = um .zip da pasta inteira do jogo (sem node_modules), nome `pinball-zumbi-faseNx.zip`.
- Risco jurídico/regulatório: parar e avisar antes de seguir.

## 2. Estado atual
- Fase 1 "Jardim da Fonte" concluída e aprovada (online em `https://criativopublicitario.com.br/Games/pinball-zumbi-fase1g/`).
- Seleção de personagem pronta (visual apenas): Felipe na Escola, Felipe Esportivo, Felipe Zumbi, escolha salva em `pz25_save.char`.
- Fases do projeto (imagem "Fases do Jogo"): 1 Jardim, 2 Rua, 3 Parquinho, 4 Escola, 5 Fazenda, 6 Cemitério (chefão final). São **6 fases**. Atenção: `PLAN` em `fonte/src/config.js` ainda lista 7 nomes antigos e precisa ser atualizado na Fase 2.
- Cada fase: 5 ondas, a última com o chefão da fase (onda 5), a fase 6 termina com o chefe final.
- Rodando hoje só a Fase 1 (`SCEN` tem 1 entrada).

## 3. Regras de jogo (já implementadas, valem para todas as fases)
- Mesa 540x960 lógicos sobre fundo fixo 941x1672. Bola cromada raio 23, dourada 27, sementes 23.
- 10 bolas por fase. Bola que cai no lançador volta de graça; fora do lançador conta como perdida.
- Vidas: 3 corações, +1 a cada 2500 pontos na fase, máximo 5. Aparece "+1 vida".
- Derrota: 3 zumbis na barreira, ou bolas acabaram, ou vidas zeradas. Na última onda, 2 zumbis na barreira = 1 coração. Chefão que cruza a barreira = derrota imediata.
- 4 locais de poder `[+]`. Plantas: Atirador 40, Gelo 60, Cereja 80, Girassol 30 (preço base da fase 1). A bola atravessa as plantas. Fusão: 2 do mesmo tipo sobem 1 nível, máximo nível 5.
- Plantas perdem vida sozinhas (`PLANT_DECAY` 2,2/s) e os zumbis as comem.
- Semente dourada: combo de 5, bola fica dourada (raio 27).
- Árvore de Sementes (só Fase 1, `tree:true`): 10 acertos da bola principal soltam 2 sementes, uma vez por partida.
- Luzes no piso (rollovers): 3 acesas = +150 pontos e +15 moedas.
- Zumbis: velocidade individual variada (0,8 a 1,25), a cada 4º vem um corredor rápido, desviam de obstáculos e destravam sozinhos.
- Botão Voltar do celular abre pausa/sair, nunca fecha o jogo.

### Progressão por fase (índice 0 = Fase 1)
- Preço dos itens: `PRICE_GROWTH = 1.5` composto (fase 1 = 1,0; fase 2 = 1,5; fase 3 = 2,25; fase 6 = 7,6). Pode pesar nas últimas fases: o Marcelo decide se troca para linear.
- Zumbis: `ENEMY_GROWTH = 1.05` composto, aplicado na velocidade e no alcance de faro (`enemyMul(scenIdx)`).
- Moedas por zumbi já crescem com a fase (`+ si*2`) e a vida base dos zumbis com `1.3*si`.
- Fase 1 nunca muda por conta das fases novas. Se o Marcelo pedir ajuste de dificuldade, mexer só nas constantes.

## 4. Estrutura de pastas
```
pinball-zumbi-faseNx/            (a pasta inteira vai para o servidor, MENOS fonte/)
  index.html                     gerado pelo build
  game.js                        gerado pelo build (esbuild)
  service-worker.js              cache offline (versão pinball-zumbi-vN)
  manifest.webmanifest, favicon.ico, LEIA-ME.md, felipevszumbi.md
  assets/
    fase1/   fundo.webp + sprites png (zumbi_*, atirador, gelo, cereja, girassol, lixeira, lixeira2, barreira, flipper, lancador, marcador, semente, arvore)
    felipe/  15 retratos: {escola|esportivo|zumbi}_{feliz|concentrado|assustado|triste|vitoria}.webp
    ui/      menu.webp, thumb-fonte.webp, og-icone.jpg (600x600), card-{escola,esportivo,zumbi}.webp
    icones/  icone-192/512/maskable, apple-touch-icon, favicon-32/48
  fonte/                         código-fonte (não sobe para o servidor)
    index.template.html          telas, CSS, HUD (unidades cqw)
    site.config.json             baseUrl da pasta no servidor (usado no og:image do WhatsApp)
    build.mjs, package.json      npm run build  ou  node build.mjs
    src/config.js                constantes, preços, cenário (SCEN), PLAN
    src/physics.js               paredes, flippers, colisões (480 Hz por sub-passo)
    src/render.js                desenho do fundo, sprites, flippers, bolas, zumbis, plantas
    src/assets.js                carrega sprites (BASE fixa em 'assets/fase1/')
    src/audio.js                 sons sintetizados
    src/main.js                  regras, ondas, HUD, toques, menus, seleção de personagem, boot
    tools/build_assets.py        recorta sprites e fundo das imagens de referência
    tools/build_brand.py         ícones 1:1, favicon, imagem de compartilhamento
    tools/build_chars.py         retratos e cards de personagem
    tools/build_sw.py            gera a lista de cache do service worker
```

## 5. Como uma fase nova é montada (receita)
1. Marcelo cria as imagens de referência da fase e envia (ver seção 6).
2. Copiar a pasta da fase 1g para `pinball-zumbi-fase2a` (mesma estrutura), criar `assets/fase2/`.
3. Gerar `fundo.webp` (941x1672) e sprites novos por script em `tools/` (flood-fill de fundo liso, igual à Fase 1). Itens que se repetem (plantas, zumbi, flipper, lançador, barreira) reaproveitam os da Fase 1 quando a referência não trouxer versões novas.
4. **Primeira tarefa da Fase 2:** `assets.js` usa `BASE = 'assets/fase1/'` fixo. Trocar para `assets/faseN/` conforme o cenário ativo (campo `dir` em `SCEN`), com fallback para os sprites comuns. É isso que permite juntar todas as fases em um arquivo no final.
5. Adicionar uma entrada em `SCEN` (config.js): `id, name, sub, obstacles[], rollovers[], slots[], lamps[]`. Obstáculos: `{k, x, y, r, zr, kick, e}` (r = raio da bola, zr = raio de desvio do zumbi, kick = impulso, e = elasticidade), em coordenadas lógicas 540x960. Marcar a posição exata sobre o fundo e testar.
6. Ajustar o que é específico da fase: obstáculos, mecânica especial (a Fase 1 tem a árvore de sementes), tipo de chefão, desafio da onda 5.
7. Atualizar `PLAN` com os 6 nomes finais, thumbnail da fase em `assets/ui`, texto da tela de fases.
8. Atualizar `site.config.json` com a pasta nova, `node build.mjs`, `python3 fonte/tools/build_sw.py . vN` e acrescentar `"./favicon.ico"` na lista do `service-worker.js` (`sed 's#"./game.js"#"./favicon.ico", "./game.js"#'`).
9. Testar (seção 7), commitar localmente, gerar o zip e entregar.

## 6. O que o Marcelo envia por fase
- Imagem do cenário completo da fase (vertical 9:16, sem HUD), usada como fundo.
- Folha de itens da fase: obstáculos, chefão, decorações, se houver novos.
- Coordenadas ou marcação (pode ser desenho sobre a imagem) de: 4 locais de poder `[+]`, obstáculos, portão de entrada dos zumbis, 3 luzes do piso.
- Desafio especial da fase em uma frase (ex.: Rua com carro que bloqueia, Cemitério com túmulos que geram zumbis).
- Nome da pasta de destino no servidor.
- Dizer se algum valor muda (preço, zumbi, número de bolas).

## 7. Testes obrigatórios antes de entregar (rodar em Chromium via Playwright)
- Carregamento sem erros de console nem arquivos faltando.
- Menu, Personagens (selecionar, confirmar, retrato no jogo), Fases, Jogar.
- Toque: armar carta e tocar no slot, fusão, arrastar planta, 2 dedos nos flippers, mira do lançador.
- Regras: corações, última onda, chefão cruzando, bolas, bolso do lançador.
- Zumbis chegam à barreira sem travar (pior tempo parado abaixo de ~1 s) e o chefão chega em ~48 s.
- Voltar do celular abre pausa; offline carrega pelo cache.
Obs.: robô não mede dificuldade. Quem decide se está fácil ou difícil é o Marcelo jogando.

## 8. Cuidados conhecidos
- Não usar `pkill` junto com outros comandos na mesma linha (derruba o shell).
- Subir sempre a pasta inteira (sem `fonte/`). Para WhatsApp mostrar o ícone, o `baseUrl` precisa ser exatamente a pasta publicada, e usar pasta com nome novo evita cache do WhatsApp.
- Sprites: caminho do fundo da referência é liso; se o fundo da nova imagem tiver degradê, ajustar tolerância no flood-fill.
- Aumentar a versão do service worker a cada entrega.
- Pneu e pinos foram removidos da Fase 1 por prejudicarem a jogabilidade. O pneu volta na Rua (Fase 2) como obstáculo de cenário.
- Instalação na tela inicial ("Instalar / Jogar online") ficou para depois.

## 9. Visão final
Juntar as 6 fases em um único jogo (`assets/fase1` a `fase6`, 6 entradas em `SCEN`, tela de fases com estrelas e desbloqueio), subir em domínio exclusivo (ex.: felipevszumbi.criativopublicitario.com.br). Futuro opcional: versão Android/iOS, que exigiria trocar personagens e elementos com direitos autorais.

## 10. Prompt para abrir uma nova conversa
> Leia o arquivo felipevszumbi.md anexo e siga as regras. Vamos construir a Fase N (nome). Anexei a pasta pinball-zumbi-fase1g (template) e as imagens de referência da fase. Desafio especial: ___. Pasta no servidor: ___. Primeiro repita em uma frase o que entendeu e liste as decisões que dependem de mim, antes de alterar qualquer coisa.

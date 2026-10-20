# Felipe vs Zumbi: Pinball (Fase 1, versão 1c)

Fase 1 (Jardim da Fonte) montada com o **fundo fixo** e os **itens exatos** das imagens de referência:
cada item (zumbi, plantas, lixeira, pneu, barreira, flippers, lançador) é um sprite recortado da folha de itens,
sobre o fundo fixo, com a física de pinball própria (bola, flippers, bumpers).

## Como publicar
Suba **só estes itens** no servidor, mantendo a estrutura:
`index.html`, `game.js`, `service-worker.js`, `manifest.webmanifest` e a pasta `assets/`.
(A pasta `fonte/` é só o código-fonte, não precisa ir para o servidor.)

## Como alterar o jogo
Código em `fonte/src/`:
- `config.js`: posições dos obstáculos e dos 4 locais de poderes, preços, dano, tamanho da mesa
- `physics.js`: paredes, guias, flippers e colisões
- `render.js`: desenho (fundo, sprites, brilhos, partículas)
- `assets.js`: carrega os sprites e desenha o Atirador (ainda sem sprite na folha de referência)
- `main.js`: regras, ondas, preços, toques e menus
- `index.template.html`: telas e estilos

Depois de editar:
```
cd fonte
npm install        (só na primeira vez)
npm run build      (gera ../game.js e ../index.html)
```
Ferramentas em `fonte/tools/`:
- `build_assets.py <referencias> <pasta_do_jogo>`: recorta sprites da folha (24.webp), retratos do Felipe e a semente dourada do guia (28.webp), usa o fundo (31.webp) e recorta a árvore do fundo
- `build_brand.py <referencias> <pasta_do_jogo>`: ícones quadrados 1:1 (29.webp), favicon e imagem de compartilhamento (WhatsApp)
- `build_sw.py <pasta_do_jogo> <versao>`: lista de arquivos do modo offline (service worker)

Endereço do jogo no servidor: `fonte/site.config.json` (`baseUrl`). A imagem de compartilhamento do WhatsApp precisa do
endereço completo, então se subir em outra pasta, altere o `baseUrl` e rode `npm run build` (ou edite as linhas `og:` do `index.html`).

A cada alteração publicada, aumente a versão em `service-worker.js` (`pinball-zumbi-v9` para `v10`...).

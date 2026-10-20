# Felipe vs Zumbi: Pinball (Fase 1, versão 2.5D com arte de referência)

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
Os sprites foram gerados por `fonte/tools/build_assets.py` a partir das imagens de referência
(18, 19 e 20). Para refazer: `python3 fonte/tools/build_assets.py <pasta_das_referencias> assets/fase1`.

A cada alteração publicada, aumente a versão em `service-worker.js` (`pinball-zumbi-v4` para `v5`...).

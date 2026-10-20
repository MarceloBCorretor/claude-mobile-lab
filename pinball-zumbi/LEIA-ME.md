# Felipe vs Zumbi: Pinball 3D (versão 2)

Pinball 3D no navegador com defesa de plantas, fusão, 3 cenários e chefões.
Three.js (3D, sombras, bloom) com física de pinball própria (bola, flippers, bumpers).

## Como publicar
Suba **só estes arquivos** no servidor (ou Vercel), mantendo a estrutura:
`index.html`, `game.js`, `service-worker.js`, `manifest.webmanifest` e a pasta `assets/`.

## Como alterar o jogo
O código-fonte fica em `fonte/src/`:
- `config.js`: cenários, obstáculos, posição dos slots, preços, dano
- `physics.js`: mesa, paredes, flippers e colisões da bola
- `models.js`: modelos 3D (zumbis voxel, plantas, obstáculos, chão)
- `scene.js`: câmera, luzes, bloom, partículas, sombras
- `main.js`: regras do jogo, ondas, HUD, toques e menus
- `index.template.html`: telas e estilos (HUD)

Depois de editar:
```
cd fonte
npm install        (só na primeira vez)
npm run build      (gera ../game.js e ../index.html)
```
A cada alteração publicada, aumente a versão em `service-worker.js` (`pinball-zumbi-v2` para `v3`...).

## Imagens do Felipe
`assets/felipe/` tem os 6 retratos de reação (feliz, triste, assustado, concentrado, vitória, upiii).
Para trocar, mantenha os mesmos nomes de arquivo (WebP quadrado, 256x256).

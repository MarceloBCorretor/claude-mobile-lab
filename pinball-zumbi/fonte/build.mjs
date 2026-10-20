import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
await build({ entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', target: ['es2020'], outfile: '../game.js', legalComments: 'none' });
// o endereço da pasta onde o jogo fica publicado entra nas imagens de compartilhamento (WhatsApp exige endereço completo)
const { baseUrl } = JSON.parse(readFileSync('site.config.json', 'utf8'));
writeFileSync('../index.html', readFileSync('index.template.html', 'utf8').replaceAll('{{BASE_URL}}', baseUrl));
console.log('game.js e index.html gerados (baseUrl: ' + baseUrl + ')');

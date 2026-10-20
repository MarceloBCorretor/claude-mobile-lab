import { build } from 'esbuild';
import { copyFileSync } from 'node:fs';
await build({ entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', target: ['es2020'], outfile: '../game.js', legalComments: 'none' });
copyFileSync('index.template.html', '../index.html');
console.log('game.js e index.html gerados');

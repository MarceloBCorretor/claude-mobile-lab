if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then((reg) => {
      // Forca checar por uma versao nova toda vez que o app abre - sem isso,
      // o navegador so revalida o service-worker.js de tempos em tempos e o
      // usuario pode ficar preso numa versao antiga por bastante tempo. Nao
      // recarrega a pagina sozinho ao detectar uma versao nova (isso ja foi
      // tentado e descartado: o evento "controllerchange" tambem dispara na
      // primeira ativacao do service worker, nao so em atualizacoes de verdade,
      // e recarregar do nada apagaria o que a pessoa estivesse digitando, tipo
      // a senha de login ou um prompt em andamento). O fetch network-first do
      // service-worker.js ja garante conteudo atualizado a cada carregamento
      // online; o unico gatilho que faltava era o cache HTTP do navegador para
      // os proprios arquivos estaticos, resolvido via Cache-Control no vercel.json.
      reg.update().catch(() => {});
    }).catch(() => {});
  });
}

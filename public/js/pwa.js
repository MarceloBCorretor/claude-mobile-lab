// Bump junto com CACHE_NAME em service-worker.js. Isso muda a URL de registro
// do service worker (?v=...) a cada versao - uma URL nunca antes vista nao tem
// como estar "stale" em nenhuma camada de cache (HTTP do navegador, CDN etc.),
// entao o navegador e obrigado a buscar o arquivo de verdade, independente de
// qualquer Cache-Control estar certo ou nao. Sem isso, a atualizacao do proprio
// service-worker.js dependia inteiramente do Cache-Control do servidor - e
// esse foi exatamente o motivo de varias rodadas de "a mudanca nao aparece".
const SW_VERSION = 'v22';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`/service-worker.js?v=${SW_VERSION}`).then((reg) => {
      // Forca checar por uma versao nova toda vez que o app abre, por garantia.
      reg.update().catch(() => {});
    }).catch(() => {});
  });
}

(() => {
  const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'];
  const VIDEO_RESOLUTIONS = ['768p', '1080p'];
  const VIDEO_DURATIONS = ['6s', '10s'];

  const loginShell = document.getElementById('loginShell');
  const appShell = document.getElementById('appShell');
  const loginPassword = document.getElementById('loginPassword');
  const loginBtn = document.getElementById('loginBtn');
  const loginFeedback = document.getElementById('loginFeedback');
  const statusBanner = document.getElementById('statusBanner');
  const kindToggle = document.getElementById('kindToggle');
  const studioModelSelect = document.getElementById('studioModelSelect');
  const studioOptions = document.getElementById('studioOptions');
  const studioGallery = document.getElementById('studioGallery');
  const emptyState = document.getElementById('emptyState');
  const mainContent = document.getElementById('mainContent');
  const promptInput = document.getElementById('promptInput');
  const sendBtn = document.getElementById('sendBtn');

  let mediaModels = [];
  let activeKind = 'image';

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function showBanner(kind, text) {
    statusBanner.style.display = 'flex';
    statusBanner.innerHTML = `<span class="status-dot ${kind === 'warn' ? 'off' : ''}"></span>${escapeHtml(text)}`;
  }

  // --- Auth gate (same login as chat/admin) --------------------------------

  function showLogin() {
    loginShell.style.display = 'flex';
    appShell.style.display = 'none';
  }
  function showApp() {
    loginShell.style.display = 'none';
    appShell.style.display = 'flex';
  }

  async function checkAuthAndBoot() {
    try {
      const res = await fetch('/api/conversations');
      if (res.status === 401) {
        showLogin();
        return;
      }
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      showApp();
      loadModels();
    } catch {
      showLogin();
      loginFeedback.textContent = 'Nao foi possivel conectar ao servidor.';
    }
  }

  loginBtn.addEventListener('click', async () => {
    loginFeedback.textContent = '';
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword.value })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Falha no login');
      }
      loginPassword.value = '';
      checkAuthAndBoot();
    } catch (err) {
      loginFeedback.textContent = err.message;
    }
  });
  loginPassword.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loginBtn.click();
  });

  // --- Models / kind toggle --------------------------------------------------

  async function loadModels() {
    try {
      const res = await fetch('/api/models/media');
      const data = await res.json().catch(() => ({ models: [] }));
      mediaModels = data.models || [];
      renderModelSelect();
      if (!mediaModels.length) {
        showBanner('warn', 'Nenhum modelo de imagem/video habilitado. Configure em /admin.');
      } else {
        showBanner('ok', `${mediaModels.length} modelo(s) de imagem/video via OpenRouter`);
      }
    } catch {
      showBanner('warn', 'Nao foi possivel carregar a lista de modelos.');
    }
  }

  function renderModelSelect() {
    const filtered = mediaModels.filter((m) => m.kind === activeKind);
    studioModelSelect.innerHTML = filtered.map((m) => `<option value="${m.id}">${escapeHtml(m.label)}</option>`).join('')
      || `<option value="">Nenhum modelo de ${activeKind === 'image' ? 'imagem' : 'video'} habilitado</option>`;
    renderOptions();
  }

  function renderOptions() {
    if (activeKind === 'image') {
      studioOptions.innerHTML = `
        <label class="studio-option">
          Proporcao
          <select id="aspectRatioSelect">${ASPECT_RATIOS.map((r) => `<option value="${r}">${r}</option>`).join('')}</select>
        </label>`;
    } else {
      studioOptions.innerHTML = `
        <label class="studio-option">
          Resolucao
          <select id="resolutionSelect">${VIDEO_RESOLUTIONS.map((r) => `<option value="${r}">${r}</option>`).join('')}</select>
        </label>
        <label class="studio-option">
          Duracao
          <select id="durationSelect">${VIDEO_DURATIONS.map((d) => `<option value="${d}">${d}</option>`).join('')}</select>
        </label>`;
      const resolutionSelect = document.getElementById('resolutionSelect');
      const durationSelect = document.getElementById('durationSelect');
      // Hailuo 2.3 only supports 10s clips at 768p (1080p tops out at 6s).
      resolutionSelect.addEventListener('change', () => {
        if (resolutionSelect.value === '1080p') durationSelect.value = '6s';
      });
    }
  }

  kindToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('.kind-btn');
    if (!btn) return;
    kindToggle.querySelectorAll('.kind-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    activeKind = btn.dataset.kind;
    renderModelSelect();
  });

  // --- Fullscreen media preview (same pattern as the code-block preview) ---

  let fullscreenPreviewEl = null;
  function openFullscreenPreview(url, kind) {
    if (fullscreenPreviewEl) fullscreenPreviewEl.remove();
    fullscreenPreviewEl = document.createElement('div');
    fullscreenPreviewEl.className = 'fullscreen-preview';

    const header = document.createElement('div');
    header.className = 'fullscreen-preview-header';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'code-action-btn';
    closeBtn.innerHTML = '✕ <span>Fechar</span>';
    closeBtn.addEventListener('click', closeFullscreenPreview);

    const downloadBtn = document.createElement('a');
    downloadBtn.className = 'code-action-btn primary';
    downloadBtn.href = url;
    downloadBtn.target = '_blank';
    downloadBtn.rel = 'noopener';
    downloadBtn.innerHTML = '⬇ <span>Abrir/Baixar</span>';

    header.append(closeBtn, downloadBtn);

    const media = document.createElement(kind === 'video' ? 'video' : 'img');
    media.className = 'fullscreen-preview-media';
    media.src = url;
    if (kind === 'video') { media.controls = true; media.playsInline = true; media.autoplay = true; }

    fullscreenPreviewEl.append(header, media);
    mainContent.appendChild(fullscreenPreviewEl);
  }

  function closeFullscreenPreview() {
    if (fullscreenPreviewEl) fullscreenPreviewEl.remove();
    fullscreenPreviewEl = null;
  }

  // --- Gallery rendering ------------------------------------------------

  function addPendingCard(text) {
    emptyState.style.display = 'none';
    const card = document.createElement('div');
    card.className = 'studio-card pending';
    card.innerHTML = `<div class="studio-card-status">${escapeHtml(text)}</div>`;
    studioGallery.prepend(card);
    return card;
  }

  function renderResultCard(card, { kind, urls, prompt, modelLabel }) {
    card.className = 'studio-card';
    card.innerHTML = '';

    urls.forEach((url) => {
      const el = document.createElement(kind === 'video' ? 'video' : 'img');
      el.src = url;
      el.className = 'generated-media';
      if (kind === 'video') { el.controls = true; el.playsInline = true; }
      el.addEventListener('click', () => openFullscreenPreview(url, kind));
      card.appendChild(el);
    });

    const meta = document.createElement('div');
    meta.className = 'studio-card-meta';
    meta.textContent = `${modelLabel} - ${prompt}`;
    card.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'media-actions';
    urls.forEach((url, idx) => {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.className = 'code-action-btn';
      a.download = `multiia-${kind}-${idx + 1}.${kind === 'video' ? 'mp4' : 'png'}`;
      a.innerHTML = '⬇ <span>Abrir/Baixar</span>';
      actions.appendChild(a);
    });
    card.appendChild(actions);
  }

  function renderErrorCard(card, message) {
    card.className = 'studio-card';
    card.innerHTML = `<div class="msg-feedback error">${escapeHtml(message)}</div>`;
  }

  // --- Generation ---------------------------------------------------------

  async function generate() {
    const prompt = promptInput.value.trim();
    if (!prompt) {
      showBanner('warn', 'Digite uma descricao para gerar.');
      return;
    }
    const modelId = studioModelSelect.value;
    if (!modelId) {
      showBanner('warn', 'Nenhum modelo habilitado para esse tipo de geracao.');
      return;
    }
    const modelLabel = mediaModels.find((m) => m.id === modelId)?.label || modelId;
    const kind = activeKind;

    sendBtn.disabled = true;
    const card = addPendingCard(kind === 'video' ? 'Gerando video... isso pode levar alguns minutos.' : 'Gerando imagem...');

    try {
      if (kind === 'image') {
        const aspectRatio = document.getElementById('aspectRatioSelect')?.value;
        const res = await fetch('/api/generate/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelId, prompt, aspectRatio })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
        if (!data.images || !data.images.length) throw new Error('Nenhuma imagem retornada.');
        renderResultCard(card, { kind, urls: data.images, prompt, modelLabel });
      } else {
        const resolution = document.getElementById('resolutionSelect')?.value;
        const duration = document.getElementById('durationSelect')?.value;
        const startRes = await fetch('/api/generate/video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelId, prompt, resolution, duration })
        });
        const job = await startRes.json();
        if (!startRes.ok) throw new Error(job.error || `Erro ${startRes.status}`);

        let status = job.status;
        let unsignedUrls = [];
        const maxAttempts = 90;
        for (let i = 0; i < maxAttempts; i++) {
          if (status === 'completed' || status === 'failed') break;
          await sleep(5000);
          const pollRes = await fetch(`/api/generate/video/${job.id}`);
          const pollData = await pollRes.json();
          if (!pollRes.ok) throw new Error(pollData.error || `Erro ${pollRes.status}`);
          status = pollData.status;
          unsignedUrls = pollData.unsignedUrls || [];
          card.innerHTML = `<div class="studio-card-status">Gerando video... status: ${escapeHtml(status)} (tentativa ${i + 1})</div>`;
        }
        if (status !== 'completed' || !unsignedUrls.length) {
          throw new Error(status === 'failed' ? 'A geracao do video falhou.' : 'O video nao ficou pronto a tempo.');
        }
        renderResultCard(card, { kind, urls: unsignedUrls, prompt, modelLabel });
      }
      promptInput.value = '';
    } catch (err) {
      renderErrorCard(card, `Erro: ${err.message}`);
    } finally {
      sendBtn.disabled = false;
    }
  }

  sendBtn.addEventListener('click', generate);
  promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      generate();
    }
  });

  checkAuthAndBoot();
})();

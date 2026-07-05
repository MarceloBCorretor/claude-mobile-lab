(() => {
  const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'];
  const VIDEO_RESOLUTIONS = ['720p', '1080p'];
  const MAX_REFERENCE_IMAGES = 3;

  // Ideias de prompt prontas (adaptadas de um tutorial de ensaio fotografico
  // com Gemini) - inserem o texto no campo de prompt para o usuario editar,
  // mesmo padrao das "Tecnicas de estudo" do chat. Funcionam melhor com uma
  // foto de referencia anexada (botao 📎 abaixo).
  const PROMPT_LIBRARY = [
    {
      id: 'restore-photo',
      label: '🖼️ Restaurar foto antiga',
      template: 'Restaure esta foto antiga anexada. Mantenha a autenticidade dos rostos e expressoes originais '
        + '(sem alterar as feicoes). Remova arranhoes, manchas e sinais de desgaste, aumente nitidez e resolucao, '
        + 'otimize a iluminacao para um visual natural, ajuste contraste e cores de forma realista (colorize se '
        + 'for preto e branco, mantendo tons de epoca), suavize a pele sem parecer artificial, e mantenha a '
        + 'composicao original.'
    },
    {
      id: 'couple-beach',
      label: '🌊 Ensaio romantico na praia',
      template: 'Use a foto anexada como referencia exata dos rostos e poses; nao altere nossas feicoes. Crie uma '
        + 'cena de nos dois em uma praia deserta ao entardecer, olhando um para o outro, iluminacao suave e '
        + 'intimista. Respeite a proporcao e a composicao da foto base.'
    },
    {
      id: 'couple-studio',
      label: '🖤 Retrato de casal em estudio',
      template: 'Use a foto anexada como referencia exata dos rostos; nao altere as feicoes. Crie um retrato '
        + 'profissional ultra-realista de estudio, casal abracado, iluminacao suave, fundo neutro, estetica '
        + 'moderna e clean, alta definicao.'
    },
    {
      id: 'couple-bw',
      label: '🤍 Retrato fine art em P&B',
      template: 'Use a foto anexada como referencia exata dos rostos; nao altere tracos faciais. Crie um retrato '
        + 'de estudio em preto e branco, estilo fine art, pose intima e serena, iluminacao suave e difusa, fundo '
        + 'escuro solido, atmosfera atemporal e emocional.'
    },
    {
      id: 'flowers-field',
      label: '🌻 Ensaio em campo de flores',
      template: 'Use a foto anexada como referencia exata dos rostos; preserve todos os tracos faciais. Crie um '
        + 'ensaio romantico em um campo vibrante de flores, iluminacao suave e neblina eterea, atmosfera alegre '
        + 'e natural, estilo cinematografico.'
    },
    {
      id: 'urban-rain',
      label: '🌃 Rua chuvosa a noite',
      template: 'Use a foto anexada como referencia exata dos rostos e poses; nao altere nenhuma feicao. Crie uma '
        + 'cena cinematografica em uma rua a noite sob chuva leve, reflexos de luzes de neon no chao molhado, '
        + 'atmosfera romantica e moderna.'
    },
    {
      id: 'dramatic-angles',
      label: '🎬 Angulos dramaticos (4 estilos)',
      template: 'Transforme a foto anexada em um conjunto de 4 estilos fotorrealistas e cinematograficos, cada '
        + 'um com um angulo de camera dinamico e diferente, mantendo a mesma pessoa/pessoas e o ambiente original '
        + 'expandido, com iluminacao cinematografica e cores de alto contraste.'
    },
    {
      id: 'animate-scene',
      label: '🎥 Animar a cena (video)',
      template: 'Anime esta cena mantendo os rostos e roupas fieis a imagem de referencia anexada, com um '
        + 'movimento de camera suave e natural e iluminacao consistente com a foto original.'
    }
  ];

  const loginShell = document.getElementById('loginShell');
  const appShell = document.getElementById('appShell');
  const loginPassword = document.getElementById('loginPassword');
  const loginBtn = document.getElementById('loginBtn');
  const loginFeedback = document.getElementById('loginFeedback');
  const statusBanner = document.getElementById('statusBanner');
  const kindToggle = document.getElementById('kindToggle');
  const studioModelSelect = document.getElementById('studioModelSelect');
  const studioOptions = document.getElementById('studioOptions');
  const promptLibrarySelect = document.getElementById('promptLibrarySelect');
  const studioGallery = document.getElementById('studioGallery');
  const emptyState = document.getElementById('emptyState');
  const mainContent = document.getElementById('mainContent');
  const promptInput = document.getElementById('promptInput');
  const sendBtn = document.getElementById('sendBtn');
  const attachBtn = document.getElementById('attachBtn');
  const fileInput = document.getElementById('fileInput');
  const attachmentsRow = document.getElementById('attachmentsRow');

  let mediaModels = [];
  let activeKind = 'image';
  let referenceImages = []; // [{ name, dataUrl }]

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

  // --- Prompt library -------------------------------------------------------

  promptLibrarySelect.innerHTML += PROMPT_LIBRARY.map((p) => `<option value="${p.id}">${escapeHtml(p.label)}</option>`).join('');
  promptLibrarySelect.addEventListener('change', () => {
    const item = PROMPT_LIBRARY.find((p) => p.id === promptLibrarySelect.value);
    if (!item) return;
    promptInput.value = item.template;
    promptInput.focus();
    promptLibrarySelect.value = '';
  });

  // --- Reference image upload ------------------------------------------------

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  function renderAttachments() {
    attachmentsRow.innerHTML = '';
    referenceImages.forEach((ref, idx) => {
      const chip = document.createElement('div');
      chip.className = 'attachment-chip';
      chip.innerHTML = `<img src="${ref.dataUrl}" alt="" /><span class="name">${escapeHtml(ref.name)}</span>`;
      const rm = document.createElement('button');
      rm.textContent = '✕';
      rm.title = 'Remover referencia';
      rm.addEventListener('click', () => {
        referenceImages.splice(idx, 1);
        renderAttachments();
      });
      chip.appendChild(rm);
      attachmentsRow.appendChild(chip);
    });
  }

  attachBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const files = Array.from(fileInput.files || []).slice(0, MAX_REFERENCE_IMAGES - referenceImages.length);
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const dataUrl = await readFileAsDataUrl(file);
      referenceImages.push({ name: file.name, dataUrl });
    }
    fileInput.value = '';
    renderAttachments();
    if (referenceImages.length) {
      showBanner('ok', `${referenceImages.length} foto(s) de referencia anexada(s).`);
    }
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
        showBanner('ok', `${mediaModels.length} modelo(s) de imagem/video via Gemini`);
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
          Proporcao
          <select id="aspectRatioSelect">${ASPECT_RATIOS.map((r) => `<option value="${r}">${r}</option>`).join('')}</select>
        </label>
        <label class="studio-option">
          Resolucao
          <select id="resolutionSelect">${VIDEO_RESOLUTIONS.map((r) => `<option value="${r}">${r}</option>`).join('')}</select>
        </label>`;
    }
    studioOptions.appendChild(promptLibrarySelect);
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
          body: JSON.stringify({ modelId, prompt, aspectRatio, referenceImages: referenceImages.map((r) => r.dataUrl) })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
        if (!data.images || !data.images.length) throw new Error('Nenhuma imagem retornada.');
        renderResultCard(card, { kind, urls: data.images, prompt, modelLabel });
      } else {
        const aspectRatio = document.getElementById('aspectRatioSelect')?.value;
        const resolution = document.getElementById('resolutionSelect')?.value;
        const startRes = await fetch('/api/generate/video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelId, prompt, aspectRatio, resolution, referenceImage: referenceImages[0]?.dataUrl })
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

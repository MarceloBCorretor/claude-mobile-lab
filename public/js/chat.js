(() => {
  const STORAGE_KEY = 'multiia_conversations_v1';
  const MAX_TEXT_CHARS = 20000;
  const MAX_PDF_PAGES = 40;
  const MAX_OCR_PAGES = 10;
  const MIN_TEXT_LAYER_CHARS = 20;
  const MAX_FILE_BYTES = 6 * 1024 * 1024;
  const TEXT_EXTENSIONS = ['.txt', '.md', '.csv', '.json'];

  const PROMPT_PRESETS = [
    { id: '', label: 'Selecionar um Prompt', system: '' },
    { id: 'assistant', label: 'Assistente geral', system: 'Voce e um assistente util, direto e honesto.' },
    { id: 'dev', label: 'Programador', system: 'Voce e um engenheiro de software senior. Responda com codigo claro e explicacoes objetivas.' },
    { id: 'translator', label: 'Tradutor PT<->EN', system: 'Voce traduz textos entre portugues e ingles mantendo o tom original.' },
    { id: 'copy', label: 'Redator publicitario', system: 'Voce e um redator publicitario criativo, focado em textos persuasivos e curtos.' }
  ];

  const modelSelect = document.getElementById('modelSelect');
  const promptSelect = document.getElementById('promptSelect');
  const mainContent = document.getElementById('mainContent');
  const chatInner = document.getElementById('chatInner');
  const emptyState = document.getElementById('emptyState');
  const promptInput = document.getElementById('promptInput');
  const sendBtn = document.getElementById('sendBtn');
  const attachBtn = document.getElementById('attachBtn');
  const fileInput = document.getElementById('fileInput');
  const attachmentsRow = document.getElementById('attachmentsRow');
  const statusBanner = document.getElementById('statusBanner');
  const conversationList = document.getElementById('conversationList');
  const newChatBtn = document.getElementById('newChatBtn');
  const sidebar = document.getElementById('sidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
  const navHistory = document.getElementById('navHistory');
  const navPrompts = document.getElementById('navPrompts');

  let models = [];
  let conversations = loadConversations();
  let activeId = conversations.length ? conversations[0].id : createConversation();
  let pendingAttachments = [];

  function loadConversations() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }

  function createConversation() {
    const conv = { id: `c${Date.now()}`, title: 'Novo Chat', messages: [] };
    conversations.unshift(conv);
    persist();
    return conv.id;
  }

  function getActive() {
    return conversations.find((c) => c.id === activeId);
  }

  function renderSidebar() {
    conversationList.innerHTML = '';
    conversations.forEach((conv) => {
      const item = document.createElement('div');
      item.className = 'conversation-item' + (conv.id === activeId ? ' active' : '');
      item.innerHTML = `<span>${escapeHtml(conv.title)}</span><button class="del-btn" title="Excluir">✕</button>`;
      item.querySelector('span').addEventListener('click', () => {
        activeId = conv.id;
        renderSidebar();
        renderMessages();
        closeSidebar();
      });
      item.querySelector('.del-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        conversations = conversations.filter((c) => c.id !== conv.id);
        if (!conversations.length) activeId = createConversation();
        else if (activeId === conv.id) activeId = conversations[0].id;
        persist();
        renderSidebar();
        renderMessages();
      });
      conversationList.appendChild(item);
    });
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function renderMessages() {
    const conv = getActive();
    chatInner.innerHTML = '';
    if (!conv.messages.length) {
      chatInner.appendChild(emptyState);
      return;
    }
    conv.messages.forEach((m) => appendMessageEl(m.role, m.content));
    chatInner.scrollTop = chatInner.scrollHeight;
  }

  function appendMessageEl(role, content) {
    const wrap = document.createElement('div');
    wrap.className = `msg ${role}`;
    wrap.innerHTML = `<div class="avatar">${role === 'user' ? '🙂' : '🤖'}</div><div class="bubble"></div>`;
    const bubble = wrap.querySelector('.bubble');
    if (role === 'assistant') {
      renderRichContent(bubble, content);
    } else {
      bubble.textContent = content;
    }
    chatInner.appendChild(wrap);
    document.querySelector('.chat-scroll').scrollTop = 999999;
    return bubble;
  }

  // --- Code block rendering (copy / preview / download) -------------------

  const CODE_FENCE_RE = /```(\w*)\n?([\s\S]*?)```/g;

  function looksLikeHtml(lang, code) {
    if (/^html$/i.test(lang)) return true;
    const trimmed = code.trim();
    return /^<!doctype html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed);
  }

  function renderRichContent(bubble, text) {
    bubble.innerHTML = '';
    bubble.classList.remove('pending');
    let lastIndex = 0;
    let match;
    CODE_FENCE_RE.lastIndex = 0;
    let hasBlock = false;

    while ((match = CODE_FENCE_RE.exec(text)) !== null) {
      hasBlock = true;
      const [full, lang, code] = match;
      if (match.index > lastIndex) {
        appendTextNode(bubble, text.slice(lastIndex, match.index));
      }
      bubble.appendChild(buildCodeBlock(lang.trim(), code.replace(/\n$/, '')));
      lastIndex = match.index + full.length;
    }
    if (!hasBlock) {
      bubble.textContent = text;
      return;
    }
    if (lastIndex < text.length) {
      appendTextNode(bubble, text.slice(lastIndex));
    }
  }

  function appendTextNode(container, text) {
    if (!text.trim()) return;
    const span = document.createElement('span');
    span.className = 'bubble-text';
    span.textContent = text;
    container.appendChild(span);
  }

  function downloadHtmlFile(code) {
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `multiia-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function copyToClipboard(code, btn, labelIdle) {
    try {
      await navigator.clipboard.writeText(code);
      btn.innerHTML = '✅ <span>Copiado</span>';
    } catch {
      btn.innerHTML = '⚠️ <span>Falhou</span>';
    }
    setTimeout(() => { btn.innerHTML = labelIdle; }, 1800);
  }

  // --- Fullscreen HTML preview (fills the area between topbar and bottom nav) --

  let fullscreenPreviewEl = null;
  function openFullscreenPreview(code) {
    if (!fullscreenPreviewEl) {
      fullscreenPreviewEl = document.createElement('div');
      fullscreenPreviewEl.className = 'fullscreen-preview';

      const header = document.createElement('div');
      header.className = 'fullscreen-preview-header';

      const closeBtn = document.createElement('button');
      closeBtn.className = 'code-action-btn';
      closeBtn.innerHTML = '✕ <span>Fechar</span>';
      closeBtn.addEventListener('click', closeFullscreenPreview);

      const copyBtn = document.createElement('button');
      copyBtn.className = 'code-action-btn';
      copyBtn.innerHTML = '📋 <span>Copiar</span>';
      copyBtn.addEventListener('click', () => copyToClipboard(fullscreenPreviewEl.dataset.code, copyBtn, '📋 <span>Copiar</span>'));

      const downloadBtn = document.createElement('button');
      downloadBtn.className = 'code-action-btn primary';
      downloadBtn.innerHTML = '⬇ <span>Baixar .html</span>';
      downloadBtn.addEventListener('click', () => downloadHtmlFile(fullscreenPreviewEl.dataset.code));

      header.append(closeBtn, copyBtn, downloadBtn);

      const iframe = document.createElement('iframe');
      iframe.className = 'fullscreen-preview-iframe';
      iframe.setAttribute('sandbox', 'allow-scripts');

      fullscreenPreviewEl.append(header, iframe);
      mainContent.appendChild(fullscreenPreviewEl);
    }
    fullscreenPreviewEl.dataset.code = code;
    fullscreenPreviewEl.querySelector('iframe').srcdoc = code;
    fullscreenPreviewEl.style.display = 'flex';
  }

  function closeFullscreenPreview() {
    if (fullscreenPreviewEl) fullscreenPreviewEl.style.display = 'none';
  }

  function buildCodeBlock(lang, code) {
    const isHtml = looksLikeHtml(lang, code);
    const block = document.createElement('div');
    block.className = 'code-block';

    const header = document.createElement('div');
    header.className = 'code-block-header';
    header.innerHTML = `<span class="code-lang">${escapeHtml(lang || 'codigo')}</span>`;

    const actions = document.createElement('div');
    actions.className = 'code-actions';

    if (isHtml) {
      const previewBtn = document.createElement('button');
      previewBtn.className = 'code-action-btn';
      previewBtn.innerHTML = '👁 <span>Preview</span>';
      previewBtn.addEventListener('click', () => openFullscreenPreview(code));
      actions.appendChild(previewBtn);
    }

    const copyBtn = document.createElement('button');
    copyBtn.className = 'code-action-btn';
    copyBtn.innerHTML = '📋 <span>Copiar</span>';
    copyBtn.addEventListener('click', () => copyToClipboard(code, copyBtn, '📋 <span>Copiar</span>'));
    actions.appendChild(copyBtn);

    if (isHtml) {
      const downloadBtn = document.createElement('button');
      downloadBtn.className = 'code-action-btn primary';
      downloadBtn.innerHTML = '⬇ <span>Baixar .html</span>';
      downloadBtn.addEventListener('click', () => downloadHtmlFile(code));
      actions.appendChild(downloadBtn);
    }

    header.appendChild(actions);
    block.appendChild(header);

    const pre = document.createElement('pre');
    const codeEl = document.createElement('code');
    codeEl.textContent = code;
    pre.appendChild(codeEl);
    block.appendChild(pre);

    return block;
  }

  async function loadModels() {
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      models = data.models || [];
      modelSelect.innerHTML = models.map((m) => `<option value="${m.id}">${escapeHtml(m.label)}</option>`).join('');
      if (!models.length) {
        showBanner('warn', 'Nenhum modelo habilitado. Configure em /admin.');
      } else {
        showBanner('ok', `${models.length} modelo(s) disponivel(is) via OpenRouter`);
      }
    } catch {
      showBanner('warn', 'Nao foi possivel carregar a lista de modelos.');
    }
  }

  function showBanner(kind, text) {
    statusBanner.style.display = 'flex';
    statusBanner.innerHTML = `<span class="status-dot ${kind === 'warn' ? 'off' : ''}"></span>${escapeHtml(text)}`;
  }

  promptSelect.innerHTML = PROMPT_PRESETS.map((p) => `<option value="${p.id}">${escapeHtml(p.label)}</option>`).join('');

  // --- Sidebar drawer -------------------------------------------------

  function openSidebar() {
    sidebar.classList.add('sidebar-open');
    sidebarBackdrop.classList.add('show');
  }
  function closeSidebar() {
    sidebar.classList.remove('sidebar-open');
    sidebarBackdrop.classList.remove('show');
  }
  function toggleSidebar() {
    sidebar.classList.contains('sidebar-open') ? closeSidebar() : openSidebar();
  }

  toggleSidebarBtn.addEventListener('click', toggleSidebar);
  navHistory.addEventListener('click', toggleSidebar);
  sidebarBackdrop.addEventListener('click', closeSidebar);

  navPrompts.addEventListener('click', () => {
    if (typeof promptSelect.showPicker === 'function') {
      try { promptSelect.showPicker(); return; } catch { /* fall through */ }
    }
    promptSelect.focus();
  });

  // --- Attachments ------------------------------------------------------

  function fileExtension(name) {
    const idx = name.lastIndexOf('.');
    return idx === -1 ? '' : name.slice(idx).toLowerCase();
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  function truncateText(text) {
    if (text.length <= MAX_TEXT_CHARS) return { text, truncated: false };
    return { text: text.slice(0, MAX_TEXT_CHARS), truncated: true };
  }

  // --- PDF text extraction (lazy-loaded pdf.js, no external CDN) ----------

  let pdfjsPromise = null;
  function loadPdfJs() {
    if (!pdfjsPromise) {
      pdfjsPromise = import('/js/vendor/pdfjs/pdf.min.mjs').then((mod) => {
        mod.GlobalWorkerOptions.workerSrc = '/js/vendor/pdfjs/pdf.worker.min.mjs';
        return mod;
      });
    }
    return pdfjsPromise;
  }

  async function extractPdfText(file) {
    const pdfjsLib = await loadPdfJs();
    const buf = await file.arrayBuffer();
    const doc = await pdfjsLib.getDocument({
      data: buf,
      cMapUrl: '/js/vendor/pdfjs/cmaps/',
      cMapPacked: true
    }).promise;

    const pageCount = Math.min(doc.numPages, MAX_PDF_PAGES);
    let text = '';
    for (let i = 1; i <= pageCount; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((it) => it.str).join(' ') + '\n\n';
      if (text.length > MAX_TEXT_CHARS * 1.5) break;
    }
    return { text: text.trim(), totalPages: doc.numPages, readPages: pageCount };
  }

  // --- OCR fallback for scanned/image-only PDFs (lazy-loaded tesseract.js) -

  let ocrWorkerPromise = null;
  function getOcrWorker() {
    if (!ocrWorkerPromise) {
      ocrWorkerPromise = import('/js/vendor/tesseract/tesseract.esm.min.js').then(({ default: Tesseract }) =>
        Tesseract.createWorker('por', 1, {
          workerPath: '/js/vendor/tesseract/worker.min.js',
          corePath: '/js/vendor/tesseract/tesseract-core-simd-lstm.wasm.js',
          langPath: '/js/vendor/tesseract/lang'
        })
      );
    }
    return ocrWorkerPromise;
  }

  async function ocrPdf(file, onProgress) {
    const pdfjsLib = await loadPdfJs();
    const buf = await file.arrayBuffer();
    const doc = await pdfjsLib.getDocument({
      data: buf,
      cMapUrl: '/js/vendor/pdfjs/cmaps/',
      cMapPacked: true
    }).promise;

    const pageCount = Math.min(doc.numPages, MAX_OCR_PAGES);
    const worker = await getOcrWorker();
    let text = '';
    for (let i = 1; i <= pageCount; i++) {
      onProgress(i, pageCount);
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
      const { data } = await worker.recognize(canvas);
      text += `${data.text}\n\n`;
      if (text.length > MAX_TEXT_CHARS * 1.5) break;
    }
    return { text: text.trim(), totalPages: doc.numPages, readPages: pageCount };
  }

  async function handleFiles(fileList) {
    for (const file of Array.from(fileList)) {
      if (file.size > MAX_FILE_BYTES) {
        showBanner('warn', `"${file.name}" e muito grande (limite 6MB).`);
        continue;
      }
      const ext = fileExtension(file.name);
      if (file.type.startsWith('image/')) {
        const dataUrl = await readFileAsDataUrl(file);
        pendingAttachments.push({ type: 'image', name: file.name, dataUrl });
        renderAttachments();
      } else if (TEXT_EXTENSIONS.includes(ext) || file.type.startsWith('text/')) {
        const { text, truncated } = truncateText(await readFileAsText(file));
        pendingAttachments.push({ type: 'text', name: file.name, content: text, truncated });
        renderAttachments();
      } else if (ext === '.pdf' || file.type === 'application/pdf') {
        const placeholder = { type: 'pdf', name: file.name, status: 'loading' };
        pendingAttachments.push(placeholder);
        renderAttachments();
        try {
          const { text: rawText, totalPages, readPages } = await extractPdfText(file);
          if (!pendingAttachments.includes(placeholder)) continue;

          if (rawText && rawText.length >= MIN_TEXT_LAYER_CHARS) {
            const { text, truncated } = truncateText(rawText);
            placeholder.status = 'ready';
            placeholder.content = text;
            placeholder.truncated = truncated || readPages < totalPages;
            renderAttachments();
            continue;
          }

          // No (usable) text layer - probably a scanned/image-only PDF. Fall back to OCR.
          placeholder.status = 'ocr';
          placeholder.ocrProgress = 'preparando...';
          renderAttachments();

          const { text: ocrText, totalPages: ocrTotal, readPages: ocrRead } = await ocrPdf(file, (page, total) => {
            if (!pendingAttachments.includes(placeholder)) return;
            placeholder.ocrProgress = `${page}/${total}`;
            renderAttachments();
          });
          if (!pendingAttachments.includes(placeholder)) continue;

          if (!ocrText || ocrText.length < 5) {
            pendingAttachments.splice(pendingAttachments.indexOf(placeholder), 1);
            showBanner('warn', `Nao foi possivel extrair texto de "${file.name}" nem por OCR.`);
          } else {
            const { text, truncated } = truncateText(ocrText);
            placeholder.status = 'ready';
            placeholder.content = text;
            placeholder.truncated = truncated || ocrRead < ocrTotal;
            placeholder.viaOcr = true;
          }
        } catch (err) {
          if (pendingAttachments.includes(placeholder)) {
            pendingAttachments.splice(pendingAttachments.indexOf(placeholder), 1);
          }
          showBanner('warn', `Nao foi possivel ler "${file.name}" (PDF protegido, corrompido, ou OCR indisponivel neste navegador).`);
        }
        renderAttachments();
      } else {
        showBanner('warn', `Leitura de "${file.name}" ainda nao e suportada (imagens, PDF e arquivos de texto por enquanto).`);
      }
    }
  }

  function renderAttachments() {
    attachmentsRow.innerHTML = '';
    pendingAttachments.forEach((att, idx) => {
      const chip = document.createElement('div');
      chip.className = 'attachment-chip';
      let preview = `<span class="chip-icon">📄</span>`;
      if (att.type === 'image') preview = `<img src="${att.dataUrl}" alt="" />`;
      else if (att.type === 'pdf') preview = `<span class="chip-icon">${att.status === 'ready' ? '📕' : '⏳'}</span>`;
      let label = att.name;
      if (att.type === 'pdf') {
        if (att.status === 'loading') label = `${att.name} (lendo...)`;
        else if (att.status === 'ocr') label = `${att.name} (OCR ${att.ocrProgress || ''})`;
        else if (att.viaOcr) label = `${att.name} (via OCR)`;
      }
      chip.innerHTML = `${preview}<span class="name">${escapeHtml(label)}</span><button title="Remover">✕</button>`;
      chip.querySelector('button').addEventListener('click', () => {
        pendingAttachments.splice(idx, 1);
        renderAttachments();
      });
      attachmentsRow.appendChild(chip);
    });
  }

  attachBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) handleFiles(fileInput.files);
    fileInput.value = '';
  });

  function buildApiContent(text) {
    const textFiles = pendingAttachments.filter((a) => a.type === 'text' || (a.type === 'pdf' && a.status === 'ready'));
    const imageFiles = pendingAttachments.filter((a) => a.type === 'image');

    let combinedText = text;
    textFiles.forEach((f) => {
      combinedText += `\n\n--- arquivo: ${f.name}${f.truncated ? ' (truncado)' : ''} ---\n${f.content}\n--- fim do arquivo ---`;
    });

    if (!imageFiles.length) return combinedText;

    const content = [{ type: 'text', text: combinedText || '(veja a(s) imagem(ns) anexada(s))' }];
    imageFiles.forEach((f) => content.push({ type: 'image_url', image_url: { url: f.dataUrl } }));
    return content;
  }

  function buildDisplayContent(text) {
    let display = text;
    pendingAttachments.forEach((a) => {
      const label = a.type === 'image' ? 'imagem' : a.type === 'pdf' ? 'PDF' : 'arquivo de texto';
      display += `\n📎 ${a.name} (${label})`;
    });
    return display;
  }

  // --- Sending ------------------------------------------------------------

  async function sendMessage() {
    const text = promptInput.value.trim();
    if ((!text && !pendingAttachments.length) || sendBtn.disabled) return;
    if (pendingAttachments.some((a) => a.status === 'loading' || a.status === 'ocr')) {
      showBanner('warn', 'Aguarde a leitura do PDF (ou o OCR) terminar antes de enviar.');
      return;
    }
    const conv = getActive();

    const apiContent = buildApiContent(text);
    const displayContent = buildDisplayContent(text);

    if (conv.messages.length === 0) {
      conv.title = (text || pendingAttachments[0]?.name || 'Novo Chat').slice(0, 40);
    }
    conv.messages.push({ role: 'user', content: displayContent });
    persist();
    renderSidebar();
    renderMessages();
    promptInput.value = '';
    pendingAttachments = [];
    renderAttachments();
    autoResize();

    const bubble = appendMessageEl('assistant', '');
    bubble.classList.add('pending');

    sendBtn.disabled = true;
    try {
      const preset = PROMPT_PRESETS.find((p) => p.id === promptSelect.value);
      const apiMessages = [];
      if (preset && preset.system) apiMessages.push({ role: 'system', content: preset.system });
      apiMessages.push(...conv.messages.slice(0, -1));
      apiMessages.push({ role: 'user', content: apiContent });

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId: modelSelect.value, messages: apiMessages })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erro ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === '[DONE]') continue;
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content || '';
            if (delta) {
              full += delta;
              bubble.textContent = full;
              document.querySelector('.chat-scroll').scrollTop = 999999;
            }
          } catch {
            /* ignore keep-alive/comment lines */
          }
        }
      }
      bubble.classList.remove('pending');
      renderRichContent(bubble, full || '(sem resposta)');
      conv.messages.push({ role: 'assistant', content: full || '(sem resposta)' });
      persist();
    } catch (err) {
      bubble.classList.remove('pending');
      bubble.textContent = `Erro: ${err.message}`;
      bubble.style.color = 'var(--danger)';
    } finally {
      sendBtn.disabled = false;
    }
  }

  function autoResize() {
    promptInput.style.height = 'auto';
    promptInput.style.height = `${Math.min(promptInput.scrollHeight, 160)}px`;
  }

  promptInput.addEventListener('input', autoResize);
  promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  sendBtn.addEventListener('click', sendMessage);
  newChatBtn.addEventListener('click', () => {
    activeId = createConversation();
    renderSidebar();
    renderMessages();
    closeSidebar();
  });

  renderSidebar();
  renderMessages();
  loadModels();
})();

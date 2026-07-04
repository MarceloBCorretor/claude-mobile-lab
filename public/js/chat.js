(() => {
  const STORAGE_KEY = 'multiia_conversations_v1';
  const MAX_TEXT_CHARS = 20000;
  const MAX_PDF_PAGES = 40;
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

  function buildCodeBlock(lang, code) {
    const isHtml = looksLikeHtml(lang, code);
    const block = document.createElement('div');
    block.className = 'code-block';

    const header = document.createElement('div');
    header.className = 'code-block-header';
    header.innerHTML = `<span class="code-lang">${escapeHtml(lang || 'codigo')}</span>`;

    const actions = document.createElement('div');
    actions.className = 'code-actions';

    let previewWrap = null;
    if (isHtml) {
      const previewBtn = document.createElement('button');
      previewBtn.className = 'code-action-btn';
      previewBtn.innerHTML = '👁 <span>Preview</span>';
      previewWrap = document.createElement('div');
      previewWrap.className = 'code-preview-wrap';
      previewWrap.hidden = true;
      let loaded = false;
      previewBtn.addEventListener('click', () => {
        const willShow = previewWrap.hidden;
        previewWrap.hidden = !willShow;
        previewBtn.innerHTML = willShow ? '✕ <span>Fechar</span>' : '👁 <span>Preview</span>';
        if (willShow && !loaded) {
          const iframe = document.createElement('iframe');
          iframe.className = 'code-preview-iframe';
          iframe.setAttribute('sandbox', 'allow-scripts');
          iframe.srcdoc = code;
          previewWrap.appendChild(iframe);
          loaded = true;
        }
      });
      actions.appendChild(previewBtn);
    }

    const copyBtn = document.createElement('button');
    copyBtn.className = 'code-action-btn';
    copyBtn.innerHTML = '📋 <span>Copiar</span>';
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code);
        copyBtn.innerHTML = '✅ <span>Copiado</span>';
      } catch {
        copyBtn.innerHTML = '⚠️ <span>Falhou</span>';
      }
      setTimeout(() => { copyBtn.innerHTML = '📋 <span>Copiar</span>'; }, 1800);
    });
    actions.appendChild(copyBtn);

    if (isHtml) {
      const downloadBtn = document.createElement('button');
      downloadBtn.className = 'code-action-btn primary';
      downloadBtn.innerHTML = '⬇ <span>Baixar .html</span>';
      downloadBtn.addEventListener('click', () => {
        const blob = new Blob([code], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `multiia-${Date.now()}.html`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      });
      actions.appendChild(downloadBtn);
    }

    header.appendChild(actions);
    block.appendChild(header);
    if (previewWrap) block.appendChild(previewWrap);

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
          if (!rawText) {
            pendingAttachments.splice(pendingAttachments.indexOf(placeholder), 1);
            showBanner('warn', `"${file.name}" nao tem texto selecionavel (provavelmente e um PDF escaneado/imagem). Leitura por OCR ainda nao e suportada.`);
          } else {
            const { text, truncated } = truncateText(rawText);
            placeholder.status = 'ready';
            placeholder.content = text;
            placeholder.truncated = truncated || readPages < totalPages;
          }
        } catch (err) {
          if (pendingAttachments.includes(placeholder)) {
            pendingAttachments.splice(pendingAttachments.indexOf(placeholder), 1);
          }
          showBanner('warn', `Nao foi possivel ler "${file.name}" (PDF protegido ou corrompido).`);
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
      else if (att.type === 'pdf') preview = `<span class="chip-icon">${att.status === 'loading' ? '⏳' : '📕'}</span>`;
      const label = att.type === 'pdf' && att.status === 'loading' ? `${att.name} (lendo...)` : att.name;
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
    if (pendingAttachments.some((a) => a.status === 'loading')) {
      showBanner('warn', 'Aguarde a leitura do PDF terminar antes de enviar.');
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

(() => {
  const STORAGE_KEY = 'multiia_conversations_v1';
  const MAX_TEXT_CHARS = 6000;
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
    wrap.querySelector('.bubble').textContent = content;
    chatInner.appendChild(wrap);
    document.querySelector('.chat-scroll').scrollTop = 999999;
    return wrap.querySelector('.bubble');
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
      } else if (TEXT_EXTENSIONS.includes(ext) || file.type.startsWith('text/')) {
        let text = await readFileAsText(file);
        let truncated = false;
        if (text.length > MAX_TEXT_CHARS) {
          text = text.slice(0, MAX_TEXT_CHARS);
          truncated = true;
        }
        pendingAttachments.push({ type: 'text', name: file.name, content: text, truncated });
      } else {
        showBanner('warn', `Leitura de "${file.name}" ainda nao e suportada (apenas imagens e arquivos de texto por enquanto).`);
      }
    }
    renderAttachments();
  }

  function renderAttachments() {
    attachmentsRow.innerHTML = '';
    pendingAttachments.forEach((att, idx) => {
      const chip = document.createElement('div');
      chip.className = 'attachment-chip';
      const preview = att.type === 'image'
        ? `<img src="${att.dataUrl}" alt="" />`
        : `<span class="chip-icon">📄</span>`;
      chip.innerHTML = `${preview}<span class="name">${escapeHtml(att.name)}</span><button title="Remover">✕</button>`;
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
    const textFiles = pendingAttachments.filter((a) => a.type === 'text');
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
      display += `\n📎 ${a.name}${a.type === 'image' ? ' (imagem)' : ' (arquivo de texto)'}`;
    });
    return display;
  }

  // --- Sending ------------------------------------------------------------

  async function sendMessage() {
    const text = promptInput.value.trim();
    if ((!text && !pendingAttachments.length) || sendBtn.disabled) return;
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

(() => {
  const STORAGE_KEY = 'multiia_conversations_v1';
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
  const statusBanner = document.getElementById('statusBanner');
  const conversationList = document.getElementById('conversationList');
  const newChatBtn = document.getElementById('newChatBtn');
  const sidebar = document.getElementById('sidebar');
  const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');

  let models = [];
  let conversations = loadConversations();
  let activeId = conversations.length ? conversations[0].id : createConversation();

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

  async function sendMessage() {
    const text = promptInput.value.trim();
    if (!text || sendBtn.disabled) return;
    const conv = getActive();
    if (conv.messages.length === 0) {
      conv.title = text.slice(0, 40);
    }
    conv.messages.push({ role: 'user', content: text });
    persist();
    renderSidebar();
    renderMessages();
    promptInput.value = '';
    autoResize();

    const bubble = appendMessageEl('assistant', '');
    bubble.classList.add('pending');

    sendBtn.disabled = true;
    try {
      const preset = PROMPT_PRESETS.find((p) => p.id === promptSelect.value);
      const apiMessages = [];
      if (preset && preset.system) apiMessages.push({ role: 'system', content: preset.system });
      apiMessages.push(...conv.messages);

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
  });
  toggleSidebarBtn.addEventListener('click', () => sidebar.classList.toggle('collapsed'));

  renderSidebar();
  renderMessages();
  loadModels();
})();

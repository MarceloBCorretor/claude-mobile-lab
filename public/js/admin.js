(() => {
  const loginShell = document.getElementById('loginShell');
  const adminShell = document.getElementById('adminShell');
  const loginPassword = document.getElementById('loginPassword');
  const loginBtn = document.getElementById('loginBtn');
  const loginFeedback = document.getElementById('loginFeedback');
  const platformBanner = document.getElementById('platformBanner');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const apiKeyStatusLabel = document.getElementById('apiKeyStatusLabel');
  const saveKeyBtn = document.getElementById('saveKeyBtn');
  const keyFeedback = document.getElementById('keyFeedback');
  const geminiKeyInput = document.getElementById('geminiKeyInput');
  const geminiKeyStatusLabel = document.getElementById('geminiKeyStatusLabel');
  const saveGeminiKeyBtn = document.getElementById('saveGeminiKeyBtn');
  const geminiKeyFeedback = document.getElementById('geminiKeyFeedback');
  const modelsBody = document.getElementById('modelsBody');
  const addModelBtn = document.getElementById('addModelBtn');
  const saveModelsBtn = document.getElementById('saveModelsBtn');
  const modelsFeedback = document.getElementById('modelsFeedback');
  const currentPasswordInput = document.getElementById('currentPasswordInput');
  const newPasswordInput = document.getElementById('newPasswordInput');
  const changePasswordBtn = document.getElementById('changePasswordBtn');
  const passwordFeedback = document.getElementById('passwordFeedback');
  const logoutBtn = document.getElementById('logoutBtn');

  function setFeedback(el, text, ok) {
    el.textContent = text;
    el.className = `msg-feedback ${ok ? 'ok' : 'error'}`;
  }

  let toastEl = null;
  let toastTimer = null;
  function showToast(text) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'admin-toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = text;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  function renderModelsTable(models) {
    modelsBody.innerHTML = '';
    models.forEach((m) => addModelRow(m));
  }

  function addModelRow(model = { id: '', label: '', enabled: true, kind: 'chat' }) {
    const tr = document.createElement('tr');
    const kind = model.kind || 'chat';
    tr.innerHTML = `
      <td><input type="checkbox" ${model.enabled ? 'checked' : ''} class="m-enabled" /></td>
      <td><input type="text" class="m-id" value="${model.id.replace(/"/g, '&quot;')}" placeholder="ex: z-ai/glm-5.2" /></td>
      <td><input type="text" class="m-label" value="${model.label.replace(/"/g, '&quot;')}" placeholder="Nome exibido" /></td>
      <td>
        <select class="m-kind">
          <option value="chat" ${kind === 'chat' ? 'selected' : ''}>Chat</option>
          <option value="image" ${kind === 'image' ? 'selected' : ''}>Imagem</option>
          <option value="video" ${kind === 'video' ? 'selected' : ''}>Video</option>
        </select>
      </td>
      <td><button class="rm-btn" title="Remover">✕</button></td>
    `;
    tr.querySelector('.rm-btn').addEventListener('click', () => tr.remove());
    modelsBody.appendChild(tr);
  }

  function collectModels() {
    return Array.from(modelsBody.querySelectorAll('tr')).map((tr) => ({
      id: tr.querySelector('.m-id').value.trim(),
      label: tr.querySelector('.m-label').value.trim(),
      enabled: tr.querySelector('.m-enabled').checked,
      kind: tr.querySelector('.m-kind').value
    })).filter((m) => m.id);
  }

  async function loadConfig() {
    const res = await fetch('/api/admin/config');
    if (res.status === 401) {
      showLogin();
      return;
    }
    const data = await res.json();
    showAdmin();

    if (data.platform === 'vercel') {
      platformBanner.innerHTML = `<div class="banner warn">Rodando na Vercel: o sistema de arquivos e efemero. Para persistencia garantida das chaves de API, defina <code>OPENROUTER_API_KEY</code> e/ou <code>GEMINI_API_KEY</code> em Project Settings &rarr; Environment Variables e faca redeploy. Alteracoes feitas aqui valem apenas ate o proximo cold start/deploy.</div>`;
    } else {
      platformBanner.innerHTML = `<div class="banner info">Rodando em ambiente Node persistente (ex: Hostinger). As alteracoes salvas aqui sao gravadas em <code>data/runtime-config.json</code> no servidor.</div>`;
    }

    apiKeyStatusLabel.textContent = data.apiKeyConfigured
      ? `Configurada (origem: ${data.apiKeySource === 'env' ? 'variavel de ambiente' : 'painel admin'})`
      : 'Nao configurada';

    geminiKeyStatusLabel.textContent = data.geminiApiKeyConfigured
      ? `Configurada (origem: ${data.geminiApiKeySource === 'env' ? 'variavel de ambiente' : 'painel admin'})`
      : 'Nao configurada';

    renderModelsTable(data.models || []);
  }

  function showLogin() {
    loginShell.style.display = 'flex';
    adminShell.style.display = 'none';
  }
  function showAdmin() {
    loginShell.style.display = 'none';
    adminShell.style.display = 'block';
  }

  loginBtn.addEventListener('click', async () => {
    setFeedback(loginFeedback, '', true);
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
      loadConfig();
    } catch (err) {
      setFeedback(loginFeedback, err.message, false);
    }
  });
  loginPassword.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loginBtn.click();
  });

  saveKeyBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      setFeedback(keyFeedback, 'Informe uma chave antes de salvar.', false);
      return;
    }
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar');
      apiKeyInput.value = '';
      setFeedback(keyFeedback, data.persisted ? 'Chave salva e persistida no servidor.' : 'Chave aplicada nesta instancia (nao persistida - ambiente efemero).', true);
      showToast('✅ Chave da OpenRouter salva com sucesso');
      const original = saveKeyBtn.textContent;
      saveKeyBtn.textContent = '✅ Salva!';
      setTimeout(() => { saveKeyBtn.textContent = original; }, 1800);
      loadConfig();
    } catch (err) {
      setFeedback(keyFeedback, err.message, false);
    }
  });

  saveGeminiKeyBtn.addEventListener('click', async () => {
    const geminiApiKey = geminiKeyInput.value.trim();
    if (!geminiApiKey) {
      setFeedback(geminiKeyFeedback, 'Informe uma chave antes de salvar.', false);
      return;
    }
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geminiApiKey })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar');
      geminiKeyInput.value = '';
      setFeedback(geminiKeyFeedback, data.persisted ? 'Chave salva e persistida no servidor.' : 'Chave aplicada nesta instancia (nao persistida - ambiente efemero).', true);
      showToast('✅ Chave do Gemini salva com sucesso');
      const original = saveGeminiKeyBtn.textContent;
      saveGeminiKeyBtn.textContent = '✅ Salva!';
      setTimeout(() => { saveGeminiKeyBtn.textContent = original; }, 1800);
      loadConfig();
    } catch (err) {
      setFeedback(geminiKeyFeedback, err.message, false);
    }
  });

  addModelBtn.addEventListener('click', () => addModelRow());

  saveModelsBtn.addEventListener('click', async () => {
    const models = collectModels();
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ models })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar');
      setFeedback(modelsFeedback, data.persisted ? 'Modelos salvos e persistidos no servidor.' : 'Modelos aplicados nesta instancia (nao persistidos - ambiente efemero).', true);
      showToast('✅ Modelos salvos com sucesso');
    } catch (err) {
      setFeedback(modelsFeedback, err.message, false);
    }
  });

  changePasswordBtn.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/admin/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: currentPasswordInput.value,
          newPassword: newPasswordInput.value
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao alterar senha');
      currentPasswordInput.value = '';
      newPasswordInput.value = '';
      setFeedback(passwordFeedback, data.persisted ? 'Senha alterada e persistida.' : 'Senha alterada nesta instancia (nao persistida - ambiente efemero).', true);
      showToast('✅ Senha alterada com sucesso');
    } catch (err) {
      setFeedback(passwordFeedback, err.message, false);
    }
  });

  logoutBtn.addEventListener('click', async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    showLogin();
  });

  loadConfig();
})();

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

  function renderModelsTable(models) {
    modelsBody.innerHTML = '';
    models.forEach((m) => addModelRow(m));
  }

  function addModelRow(model = { id: '', label: '', enabled: true }) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="checkbox" ${model.enabled ? 'checked' : ''} class="m-enabled" /></td>
      <td><input type="text" class="m-id" value="${model.id.replace(/"/g, '&quot;')}" placeholder="ex: z-ai/glm-5.2" /></td>
      <td><input type="text" class="m-label" value="${model.label.replace(/"/g, '&quot;')}" placeholder="Nome exibido" /></td>
      <td><button class="rm-btn" title="Remover">✕</button></td>
    `;
    tr.querySelector('.rm-btn').addEventListener('click', () => tr.remove());
    modelsBody.appendChild(tr);
  }

  function collectModels() {
    return Array.from(modelsBody.querySelectorAll('tr')).map((tr) => ({
      id: tr.querySelector('.m-id').value.trim(),
      label: tr.querySelector('.m-label').value.trim(),
      enabled: tr.querySelector('.m-enabled').checked
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
      platformBanner.innerHTML = `<div class="banner warn">Rodando na Vercel: o sistema de arquivos e efemero. Para persistencia garantida da chave de API, defina <code>OPENROUTER_API_KEY</code> em Project Settings &rarr; Environment Variables e faca redeploy. Alteracoes feitas aqui valem apenas ate o proximo cold start/deploy.</div>`;
    } else {
      platformBanner.innerHTML = `<div class="banner info">Rodando em ambiente Node persistente (ex: Hostinger). As alteracoes salvas aqui sao gravadas em <code>data/runtime-config.json</code> no servidor.</div>`;
    }

    apiKeyStatusLabel.textContent = data.apiKeyConfigured
      ? `Configurada (origem: ${data.apiKeySource === 'env' ? 'variavel de ambiente' : 'painel admin'})`
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
      loadConfig();
    } catch (err) {
      setFeedback(keyFeedback, err.message, false);
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

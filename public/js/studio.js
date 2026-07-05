(() => {
  const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'];
  const VIDEO_RESOLUTIONS = ['720p', '1080p'];
  const MAX_REFERENCE_IMAGES = 3;

  // Ideias de prompt prontas - inserem o texto no campo de prompt para o
  // usuario editar, mesmo padrao das "Tecnicas de estudo" do chat. `kind`
  // filtra em qual aba (imagem/video) a ideia aparece ('both' aparece nas duas).
  const PROMPT_LIBRARY = [
    // --- Ensaios com foto de referencia (adaptado de tutorial de ensaio fotografico) ---
    {
      id: 'restore-photo', kind: 'image', category: 'Ensaios com foto de referencia',
      label: '🖼️ Restaurar foto antiga',
      template: 'Restaure esta foto antiga anexada. Mantenha a autenticidade dos rostos e expressoes originais '
        + '(sem alterar as feicoes). Remova arranhoes, manchas e sinais de desgaste, aumente nitidez e resolucao, '
        + 'otimize a iluminacao para um visual natural, ajuste contraste e cores de forma realista (colorize se '
        + 'for preto e branco, mantendo tons de epoca), suavize a pele sem parecer artificial, e mantenha a '
        + 'composicao original.'
    },
    {
      id: 'couple-beach', kind: 'image', category: 'Ensaios com foto de referencia',
      label: '🌊 Ensaio romantico na praia',
      template: 'Use a foto anexada como referencia exata dos rostos e poses; nao altere nossas feicoes. Crie uma '
        + 'cena de nos dois em uma praia deserta ao entardecer, olhando um para o outro, iluminacao suave e '
        + 'intimista. Respeite a proporcao e a composicao da foto base.'
    },
    {
      id: 'couple-studio', kind: 'image', category: 'Ensaios com foto de referencia',
      label: '🖤 Retrato de casal em estudio',
      template: 'Use a foto anexada como referencia exata dos rostos; nao altere as feicoes. Crie um retrato '
        + 'profissional ultra-realista de estudio, casal abracado, iluminacao suave, fundo neutro, estetica '
        + 'moderna e clean, alta definicao.'
    },
    {
      id: 'couple-bw', kind: 'image', category: 'Ensaios com foto de referencia',
      label: '🤍 Retrato fine art em P&B',
      template: 'Use a foto anexada como referencia exata dos rostos; nao altere tracos faciais. Crie um retrato '
        + 'de estudio em preto e branco, estilo fine art, pose intima e serena, iluminacao suave e difusa, fundo '
        + 'escuro solido, atmosfera atemporal e emocional.'
    },
    {
      id: 'flowers-field', kind: 'image', category: 'Ensaios com foto de referencia',
      label: '🌻 Ensaio em campo de flores',
      template: 'Use a foto anexada como referencia exata dos rostos; preserve todos os tracos faciais. Crie um '
        + 'ensaio romantico em um campo vibrante de flores, iluminacao suave e neblina eterea, atmosfera alegre '
        + 'e natural, estilo cinematografico.'
    },
    {
      id: 'urban-rain', kind: 'image', category: 'Ensaios com foto de referencia',
      label: '🌃 Rua chuvosa a noite',
      template: 'Use a foto anexada como referencia exata dos rostos e poses; nao altere nenhuma feicao. Crie uma '
        + 'cena cinematografica em uma rua a noite sob chuva leve, reflexos de luzes de neon no chao molhado, '
        + 'atmosfera romantica e moderna.'
    },
    {
      id: 'dramatic-angles', kind: 'image', category: 'Ensaios com foto de referencia',
      label: '🎬 Angulos dramaticos (4 estilos)',
      template: 'Transforme a foto anexada em um conjunto de 4 estilos fotorrealistas e cinematograficos, cada '
        + 'um com um angulo de camera dinamico e diferente, mantendo a mesma pessoa/pessoas e o ambiente original '
        + 'expandido, com iluminacao cinematografica e cores de alto contraste.'
    },
    {
      id: 'animate-scene', kind: 'video', category: 'Ensaios com foto de referencia',
      label: '🎥 Animar a cena (video)',
      template: 'Anime esta cena mantendo os rostos e roupas fieis a imagem de referencia anexada, com um '
        + 'movimento de camera suave e natural e iluminacao consistente com a foto original.'
    },

    // --- Nano Banana 2: animacao e ilustracao moderna (imagens) ---
    {
      id: 'nb-pixar', kind: 'image', category: 'Animacao/ilustracao (Nano Banana)',
      label: '🎨 Animacao 3D Pixar/Disney',
      template: 'Um medico sorridente em um consultorio moderno e iluminado, segurando um tablet. Estilo de '
        + 'animacao 3D Pixar, texturas suaves, iluminacao volumetrica, cores vibrantes e acolhedoras, renderizacao '
        + 'em Unreal Engine 5, alta resolucao 8k.'
    },
    {
      id: 'nb-ghibli', kind: 'image', category: 'Animacao/ilustracao (Nano Banana)',
      label: '🎨 Studio Ghibli (anime classico)',
      template: 'Uma familia caminhando por um parque ensolarado com arvores verdes e ceu azul. Estilo Studio '
        + 'Ghibli, ilustracao 2D detalhada, pintura em aquarela digital, atmosfera pacifica e nostalgica, paleta '
        + 'de cores pastel.'
    },
    {
      id: 'nb-flat', kind: 'image', category: 'Animacao/ilustracao (Nano Banana)',
      label: '🎨 Vetor minimalista (flat design)',
      template: 'Ilustracao vetorial de um homem de negocios analisando graficos subindo em uma tela holografica. '
        + 'Estilo flat design corporativo, formas geometricas limpas, paleta de cores azul e laranja, fundo '
        + 'branco, estilo NotebookLM, sem contornos escuros.'
    },
    {
      id: 'nb-claymation', kind: 'image', category: 'Animacao/ilustracao (Nano Banana)',
      label: '🎨 Claymation (massa de modelar 3D)',
      template: 'Um corretor apertando a mao de um cliente em uma mesa de escritorio. Estilo de animacao Aardman '
        + '(claymation), texturas realistas de massa de modelar, iluminacao de estudio suave, profundidade de '
        + 'campo rasa, fotorrealista.'
    },
    {
      id: 'nb-lowpoly', kind: 'image', category: 'Animacao/ilustracao (Nano Banana)',
      label: '🎨 Low Poly 3D (geometrico)',
      template: 'Uma casa moderna protegida por um escudo brilhante. Estilo Low Poly 3D, formas angulares e '
        + 'facetadas, cores neon vibrantes sobre fundo escuro, iluminacao dramatica, renderizacao Octane, design '
        + 'contemporaneo.'
    },
    {
      id: 'nb-cyberpunk', kind: 'image', category: 'Animacao/ilustracao (Nano Banana)',
      label: '🎨 Cyberpunk/neon 3D',
      template: 'Um smartphone exibindo um aplicativo de seguros com uma interface futurista brilhante. Estilo '
        + 'Cyberpunk 3D, luzes neon roxas e ciano, reflexos em vidro molhado, hiper-detalhado, estetica tech de '
        + 'ponta.'
    },
    {
      id: 'nb-cel', kind: 'image', category: 'Animacao/ilustracao (Nano Banana)',
      label: '🎨 Cel shading (quadrinhos modernos)',
      template: 'Um cirurgiao com capa de heroi em pe com postura confiante em um corredor de hospital. Estilo '
        + 'cel shading, cores solidas com sombreamento dinamico, tracos grossos estilo historia em quadrinhos, '
        + 'iluminacao de alto contraste.'
    },
    {
      id: 'nb-watercolor', kind: 'image', category: 'Animacao/ilustracao (Nano Banana)',
      label: '🎨 Aquarela digital fluida',
      template: 'Um casal idoso sorrindo e segurando as maos com um por do sol ao fundo. Estilo pintura em '
        + 'aquarela, bordas suaves, transicoes de cores fluidas, atmosfera romantica e tranquila, tracos '
        + 'artisticos expressivos.'
    },
    {
      id: 'nb-papercraft', kind: 'image', category: 'Animacao/ilustracao (Nano Banana)',
      label: '🎨 Papercraft (arte em papel 3D)',
      template: 'Um ecossistema de negocios com predios, carros e arvores, tudo construido em papel recortado. '
        + 'Estilo papercraft 3D, texturas reais de cartolina, iluminacao direcional criando sombras duras, cores '
        + 'analogas em tons de azul, fotorrealista.'
    },
    {
      id: 'nb-sketch', kind: 'image', category: 'Animacao/ilustracao (Nano Banana)',
      label: '🎨 Sketch arquitetonico moderno',
      template: 'Um projeto de clinica medica de alto padrao. Estilo de desenho a traco arquitetonico misturado '
        + 'com renderizacao 3D parcial, linhas finas de nanquim com blocos de cor fotorrealista, limpo, '
        + 'profissional, estudio de design.'
    },

    // --- Estilos de movimento e video cinematografico (Veo) ---
    {
      id: 'vid-slowmo', kind: 'video', category: 'Cinematografico (video)',
      label: '🎬 Cinematic slow motion',
      template: 'Camera em camera lenta (slow motion) a 120fps. Um executivo assinando um contrato importante '
        + 'com uma caneta-tinteiro. Foco na ponta da caneta e no papel, profundidade de campo rasa (bokeh), '
        + 'iluminacao dramatica de escritorio, resolucao 4K.'
    },
    {
      id: 'vid-hyperlapse', kind: 'video', category: 'Cinematografico (video)',
      label: '🎬 Hyper-lapse urbano',
      template: 'Movimento hyper-lapse rapido passando pela avenida principal de uma cidade moderna ao '
        + 'entardecer. Rastros de luz dos carros, transicao do dia para a noite, cores cinematograficas quentes, '
        + 'sensacao de velocidade e progresso.'
    },
    {
      id: 'vid-macro', kind: 'video', category: 'Cinematografico (video)',
      label: '🎬 Macro cinematografico',
      template: 'Tomada macro extremamente proxima de uma gota de suor no rosto de um medico em cirurgia, '
        + 'seguida de uma expressao de alivio. Foco dinamico, textura de pele hiper-realista, iluminacao de '
        + 'centro cirurgico com tons de azul e branco.'
    },
    {
      id: 'vid-drone', kind: 'video', category: 'Cinematografico (video)',
      label: '🎬 Drone fly-through (FPV)',
      template: 'Camera de drone voando suavemente pela porta de entrada de uma clinica moderna, passando pela '
        + 'recepcao ate chegar a um consultorio de alto padrao. Movimento continuo, estabilizado, iluminacao '
        + 'natural entrando pelas janelas.'
    },
    {
      id: 'vid-loop', kind: 'video', category: 'Cinematografico (video)',
      label: '🎬 Loop de animacao 3D',
      template: 'Uma moeda dourada girando perfeitamente em loop sobre uma mesa de vidro, refletindo graficos '
        + 'financeiros subindo. Movimento suave, camera estatica, renderizacao fotorrealista, iluminacao de '
        + 'estudio comercial.'
    },
    {
      id: 'vid-typography', kind: 'video', category: 'Cinematografico (video)',
      label: '🎬 Tipografia cinetica',
      template: 'Palavras em 3D brilhantes flutuando e se encaixando perfeitamente no centro de uma tela vazia. '
        + 'Fundo abstrato em tons de grafite, camera orbitando levemente ao redor das palavras, design corporativo '
        + 'e limpo.'
    },
    {
      id: 'vid-parallax', kind: 'video', category: 'Cinematografico (video)',
      label: '🎬 Efeito parallax 2.5D',
      template: 'Uma foto de familia antiga em preto e branco que ganha vida e profundidade (efeito parallax). A '
        + 'camera faz um pan lento e zoom in no rosto da crianca, poeira suspensa no ar iluminada pela luz da '
        + 'janela, nostalgico e emocional.'
    },
    {
      id: 'vid-particles', kind: 'video', category: 'Cinematografico (video)',
      label: '🎬 Revelacao com particulas (glow)',
      template: 'Fundo escuro. Um escudo de protecao se forma a partir de milhares de particulas de luz neon '
        + 'azul que se unem rapidamente. Animacao fluida, alto contraste, estilo tecnologia de ponta, camera '
        + 'afastando levemente.'
    },
    {
      id: 'vid-tracking', kind: 'video', category: 'Cinematografico (video)',
      label: '🎬 Tracking shot (acompanhamento)',
      template: 'Camera acompanhando um corretor bem vestido caminhando com confianca por um saguao de vidro. A '
        + 'camera anda de costas na mesma velocidade do sujeito, focado no rosto dele enquanto o fundo passa '
        + 'desfocado.'
    },
    {
      id: 'vid-timelapse', kind: 'video', category: 'Cinematografico (video)',
      label: '🎬 Time-lapse de crescimento',
      template: 'Uma arvore crescendo rapidamente a partir de uma pequena semente ate virar um carvalho forte, '
        + 'com o sol nascendo e se pondo ao fundo em segundos. Representacao visual de longo prazo, cores ricas, '
        + 'movimento de nuvens rapido.'
    },

    // --- Estilos profissionais e publicitarios (imagem ou video) ---
    {
      id: 'pro-outdoor', kind: 'both', category: 'Profissional/publicitario',
      label: '📸 Outdoor corporativo (espaco negativo)',
      template: 'Fotografia de um cirurgiao com os bracos cruzados olhando para a camera com confianca. Sujeito '
        + 'posicionado a direita da tela. Fundo limpo e escuro a esquerda criando espaco negativo perfeito para '
        + 'insercao de texto publicitario. Iluminacao de estudio Rembrandt.'
    },
    {
      id: 'pro-mockup', kind: 'both', category: 'Profissional/publicitario',
      label: '📸 Mockup de aplicativo realista',
      template: 'Um smartphone de ultima geracao segurado por uma mao, exibindo a interface limpa e moderna de '
        + 'um app. Fundo desfocado de uma cafeteria elegante. Fotografia de produto, iluminacao natural suave, '
        + 'cores vivas.'
    },
    {
      id: 'pro-doubleexposure', kind: 'both', category: 'Profissional/publicitario',
      label: '📸 Double exposure (dupla exposicao)',
      template: 'A silhueta de perfil de um homem de negocios, dentro da silhueta ha uma dupla exposicao '
        + 'mostrando o horizonte de uma cidade misturado com engrenagens girando. Estilo artistico editorial, '
        + 'paleta monocromatica com detalhes em dourado.'
    },
    {
      id: 'pro-flatlay', kind: 'both', category: 'Profissional/publicitario',
      label: '📸 Flat lay de mesa de trabalho',
      template: 'Visao de cima para baixo (flat lay) de uma mesa de madeira escura com um tablet moderno, oculos '
        + 'de leitura, uma xicara de cafe fumegante e papeis organizados. Composicao geometrica perfeita, '
        + 'iluminacao de janela, ideal para fundo de site.'
    },
    {
      id: 'pro-isometric', kind: 'both', category: 'Profissional/publicitario',
      label: '📸 Cena isometrica corporativa',
      template: 'Uma visao isometrica 3D de um consultorio medico de alto padrao, sem teto, revelando a '
        + 'disposicao dos moveis, equipamentos e sala de espera. Estilo arquitetonico moderno, iluminacao '
        + 'realista, paleta de cores brancas, madeiras e verde musgo.'
    },
    {
      id: 'pro-splitscreen', kind: 'both', category: 'Profissional/publicitario',
      label: '📸 Antes e depois (split screen)',
      template: 'Tela dividida de forma criativa. Lado esquerdo: tons escuros e azulados mostrando pilhas de '
        + 'papelada caotica. Lado direito: tons quentes e ensolarados mostrando um tablet com uma interface '
        + 'limpa e organizada. Alto contraste, mensagem visual direta.'
    },
    {
      id: 'pro-neon', kind: 'both', category: 'Profissional/publicitario',
      label: '📸 Tipografia neon em parede industrial',
      template: 'A palavra "SEGURANCA" escrita em luzes neon brancas brilhantes em uma parede de tijolos '
        + 'escuros. Fotografia noturna urbana, reflexos sutis no chao molhado, atmosfera premium, profundidade '
        + 'de campo realista.'
    },
    {
      id: 'pro-chiaroscuro', kind: 'both', category: 'Profissional/publicitario',
      label: '📸 Retrato chiaroscuro (alto padrao)',
      template: 'Fotografia de meio corpo de uma executiva em traje social escuro. Iluminacao dramatica '
        + 'chiaroscuro (forte contraste entre luz e sombra), fundo totalmente preto, foco extremamente nitido '
        + 'nos olhos, transmite autoridade e seriedade.'
    },
    {
      id: 'pro-infographic', kind: 'both', category: 'Profissional/publicitario',
      label: '📸 Infografico abstrato 3D',
      template: 'Formas geometricas de vidro flutuando no espaco escuro emitindo luzes internas conectadas por '
        + 'feixes de laser. Representacao visual moderna de protecao de dados e ecossistema digital. Estilo '
        + 'tecnologia corporativa, renderizacao 8k hiper-detalhada.'
    },
    {
      id: 'pro-lifestyle', kind: 'both', category: 'Profissional/publicitario',
      label: '📸 Lifestyle premium',
      template: 'Um cliente relaxando e sorrindo na sacada de um apartamento de luxo, segurando uma taca de '
        + 'vinho, com a cidade iluminada ao fundo. Fotografia de estilo de vida comercial, cores quentes de '
        + 'golden hour, transmite sucesso e tranquilidade, imagem de altissima qualidade.'
    },

    // --- Infograficos (metodo "estilo revista" e "vista explodida") ---
    {
      id: 'info-magazine', kind: 'image', category: 'Infograficos',
      label: '📰 Infografico estilo revista',
      template: 'Crie um infografico estilo revista sobre [tema], com uma imagem central renderizada em 3D, '
        + 'titulo principal em destaque, de 4 a 6 paineis informativos ao redor explicando os elementos, '
        + 'incluindo um pequeno personagem especialista (ex: cientista) apresentando o conteudo ao lado da '
        + 'imagem principal, e uma barra de rodape com informacoes adicionais relevantes. Use uma cor de '
        + 'destaque (acento) consistente em todo o design.'
    },
    {
      id: 'info-exploded', kind: 'image', category: 'Infograficos',
      label: '🔧 Infografico de vista explodida (tecnico)',
      template: 'Crie uma infografia de vista explodida tecnica de [objeto], estilo desenho tecnico '
        + 'educacional. Mostre as pecas separadas e conectadas por linhas finas numeradas, um quadro "DADOS '
        + 'TECNICOS" a direita com especificacoes reais e verificaveis do objeto (nao invente numeros), uma '
        + 'miniatura "MONTAGEM FINAL" no canto inferior esquerdo, e uma sequencia de montagem na parte '
        + 'inferior. Fundo escuro, resolucao alta, aviso discreto de "uso educativo" no canto.'
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

  function renderPromptLibrary() {
    const relevant = PROMPT_LIBRARY.filter((p) => p.kind === activeKind || p.kind === 'both');
    const categories = [...new Set(relevant.map((p) => p.category))];
    const optionsHtml = categories.map((cat) => {
      const items = relevant.filter((p) => p.category === cat);
      return `<optgroup label="${escapeHtml(cat)}">${items.map((p) => `<option value="${p.id}">${escapeHtml(p.label)}</option>`).join('')}</optgroup>`;
    }).join('');
    promptLibrarySelect.innerHTML = `<option value="">📖 Ideias de prompt</option>${optionsHtml}`;
  }

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
      const thumb = activeKind === 'audio' ? '<span class="chip-icon">🎵</span>' : `<img src="${ref.dataUrl}" alt="" />`;
      chip.innerHTML = `${thumb}<span class="name">${escapeHtml(ref.name)}</span>`;
      const rm = document.createElement('button');
      rm.textContent = '✕';
      rm.title = 'Remover';
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
    if (activeKind === 'audio') {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (!file || !file.type.startsWith('audio/')) return;
      const dataUrl = await readFileAsDataUrl(file);
      referenceImages = [{ name: file.name, dataUrl }];
      renderAttachments();
      showBanner('ok', `Audio "${file.name}" anexado - pronto pra transcrever.`);
      return;
    }
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

  const KIND_LABELS = { image: 'imagem', video: 'video', audio: 'audio' };

  async function loadModels() {
    try {
      const res = await fetch('/api/models/media');
      const data = await res.json().catch(() => ({ models: [] }));
      mediaModels = data.models || [];
      renderModelSelect();
      if (!mediaModels.length) {
        showBanner('warn', 'Nenhum modelo de imagem/video/audio habilitado. Configure em /admin.');
      } else {
        showBanner('ok', `${mediaModels.length} modelo(s) de imagem/video/audio`);
      }
    } catch {
      showBanner('warn', 'Nao foi possivel carregar a lista de modelos.');
    }
  }

  function renderModelSelect() {
    const filtered = mediaModels.filter((m) => m.kind === activeKind);
    studioModelSelect.innerHTML = filtered.map((m) => `<option value="${m.id}">${escapeHtml(m.label)}</option>`).join('')
      || `<option value="">Nenhum modelo de ${KIND_LABELS[activeKind]} habilitado</option>`;
    renderOptions();
  }

  function renderOptions() {
    if (activeKind === 'image') {
      studioOptions.innerHTML = `
        <label class="studio-option">
          Proporcao
          <select id="aspectRatioSelect">${ASPECT_RATIOS.map((r) => `<option value="${r}">${r}</option>`).join('')}</select>
        </label>`;
    } else if (activeKind === 'video') {
      studioOptions.innerHTML = `
        <label class="studio-option">
          Proporcao
          <select id="aspectRatioSelect">${ASPECT_RATIOS.map((r) => `<option value="${r}">${r}</option>`).join('')}</select>
        </label>
        <label class="studio-option">
          Resolucao
          <select id="resolutionSelect">${VIDEO_RESOLUTIONS.map((r) => `<option value="${r}">${r}</option>`).join('')}</select>
        </label>`;
    } else {
      studioOptions.innerHTML = '';
    }
    renderPromptLibrary();
    studioOptions.appendChild(promptLibrarySelect);

    if (activeKind === 'audio') {
      fileInput.accept = 'audio/*';
      fileInput.multiple = false;
      attachBtn.title = 'Anexar audio para transcrever';
      promptInput.placeholder = 'Nomes proprios, termos tecnicos (opcional) - ajuda a transcricao a acertar...';
    } else {
      fileInput.accept = 'image/*';
      fileInput.multiple = true;
      attachBtn.title = 'Anexar foto de referencia';
      promptInput.placeholder = 'Descreva a imagem ou o vídeo que você quer gerar...';
    }
  }

  kindToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('.kind-btn');
    if (!btn) return;
    kindToggle.querySelectorAll('.kind-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    activeKind = btn.dataset.kind;
    referenceImages = [];
    renderAttachments();
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
    if (kind === 'image' && urls[0]) {
      const animateBtn = document.createElement('button');
      animateBtn.className = 'code-action-btn primary';
      animateBtn.innerHTML = '🎬 <span>Animar esta imagem</span>';
      animateBtn.addEventListener('click', () => animateImage(urls[0]));
      actions.appendChild(animateBtn);
    }
    card.appendChild(actions);
  }

  // Envia a imagem gerada como referencia de video, pra criar uma sequencia
  // imagem -> video sem precisar baixar e reanexar manualmente.
  function animateImage(url) {
    activeKind = 'video';
    kindToggle.querySelectorAll('.kind-btn').forEach((b) => b.classList.toggle('active', b.dataset.kind === 'video'));
    renderModelSelect();
    referenceImages = [{ name: 'imagem-gerada.png', dataUrl: url }];
    renderAttachments();
    promptInput.value = 'Anime esta imagem com um movimento de camera suave e natural e iluminacao consistente.';
    promptInput.focus();
    promptInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showBanner('ok', 'Imagem enviada como referencia de video - edite o prompt e gere.');
  }

  function renderErrorCard(card, message) {
    card.className = 'studio-card';
    card.innerHTML = `<div class="msg-feedback error">${escapeHtml(message)}</div>`;
  }

  async function copyToClipboard(text, btn) {
    const original = btn.innerHTML;
    try {
      await navigator.clipboard.writeText(text);
      btn.innerHTML = '✅ <span>Copiado</span>';
    } catch {
      btn.innerHTML = '⚠️ <span>Falhou</span>';
    }
    setTimeout(() => { btn.innerHTML = original; }, 1800);
  }

  function renderTranscriptCard(card, { text, modelLabel, filename }) {
    card.className = 'studio-card';
    card.innerHTML = '';

    const bubble = document.createElement('div');
    bubble.className = 'bubble-text';
    bubble.textContent = text || '(transcricao vazia)';
    card.appendChild(bubble);

    const meta = document.createElement('div');
    meta.className = 'studio-card-meta';
    meta.textContent = `${modelLabel} - ${filename}`;
    card.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'media-actions';
    const copyBtn = document.createElement('button');
    copyBtn.className = 'code-action-btn primary';
    copyBtn.innerHTML = '📋 <span>Copiar</span>';
    copyBtn.addEventListener('click', () => copyToClipboard(text, copyBtn));
    actions.appendChild(copyBtn);
    card.appendChild(actions);
  }

  // --- Generation ---------------------------------------------------------

  async function generate() {
    const modelId = studioModelSelect.value;
    if (!modelId) {
      showBanner('warn', 'Nenhum modelo habilitado para esse tipo de geracao.');
      return;
    }
    const selectedModel = mediaModels.find((m) => m.id === modelId);
    const modelLabel = selectedModel?.label || modelId;
    const kind = activeKind;
    const prompt = promptInput.value.trim();

    if (kind === 'audio') {
      const audio = referenceImages[0];
      if (!audio) {
        showBanner('warn', 'Anexe um audio pra transcrever.');
        return;
      }
      sendBtn.disabled = true;
      const card = addPendingCard('Transcrevendo audio...');
      try {
        const res = await fetch('/api/generate/audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelId, audioDataUrl: audio.dataUrl, prompt, filename: audio.name })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
        renderTranscriptCard(card, { text: data.text, modelLabel, filename: audio.name });
      } catch (err) {
        renderErrorCard(card, `Erro: ${err.message}`);
      } finally {
        sendBtn.disabled = false;
      }
      return;
    }

    if (!prompt) {
      showBanner('warn', 'Digite uma descricao para gerar.');
      return;
    }

    if (kind === 'image' && selectedModel?.provider === 'openai' && referenceImages.length) {
      showBanner('warn', 'O modelo GPT Image ainda nao usa fotos de referencia anexadas - gerando so a partir do texto.');
    }

    sendBtn.disabled = true;
    const card = addPendingCard(kind === 'video' ? 'Gerando video... isso pode levar alguns minutos.' : 'Gerando imagem...');

    try {
      if (kind === 'image') {
        const aspectRatio = document.getElementById('aspectRatioSelect')?.value;
        const useReferences = selectedModel?.provider !== 'openai';
        const res = await fetch('/api/generate/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelId, prompt, aspectRatio, referenceImages: useReferences ? referenceImages.map((r) => r.dataUrl) : [] })
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

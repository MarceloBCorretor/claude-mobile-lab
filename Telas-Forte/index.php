<?php
// --- PROTEÇÃO POR SENHA (HTTP BASIC AUTH) ---
// Senha original preservada do criativo.php
$requiredPassword = 'Cri@t!Vo';

if (!isset($_SERVER['PHP_AUTH_PW']) || $_SERVER['PHP_AUTH_PW'] !== $requiredPassword) {
    header('WWW-Authenticate: Basic realm="Pasta Protegida: Criativo"');
    header('HTTP/1.0 401 Unauthorized');
    echo '<h1>Acesso Negado</h1><p>Forneça a senha correta para acessar esta pasta.</p>';
    exit;
}

// ============================================================
// LISTAGEM VISUAL DE PASTAS - VERSÃO MELHORADA
// Melhorias:
// 1) Oculta arquivos técnicos/sensíveis como api_proxy.php
// 2) Botões grandes: Início + Voltar pasta anterior ao lado do título
// 3) Mantém busca recursiva, previews e cards
// 4) Evita exibir arquivos ocultos, .htaccess, configs e bancos
// ============================================================

$diretorioBase = __DIR__;
$termoPesquisa = isset($_GET['q']) ? trim($_GET['q']) : '';
$self = basename(__FILE__);
$folder = basename(__DIR__);

// Página inicial geral do servidor/projeto
$paginaInicial = '/listagem.php';

// Voltar apenas uma pasta acima
$paginaAnterior = '../';

// Arquivos e padrões que NÃO devem aparecer na listagem
$arquivosOcultos = [
    $self,
    'index.php',
    'index(4).php',
    'index_modelo.php',
    'atualizar_index.php',
    'index_listagem_melhorado.php',
    'Thumbs.db',
    '.DS_Store',
    '.htaccess',
    'api_proxy.php',
    'config.php',
    'conexao.php',
    'db.php',
    'database.sqlite',
];

$extensoesOcultas = [
    'sqlite', 'db', 'log', 'bak', 'ini', 'env'
];

function deveOcultar(string $nome, string $caminhoCompleto, array $arquivosOcultos, array $extensoesOcultas): bool {
    if ($nome === '' || substr($nome, 0, 1) === '.') {
        return true;
    }

    if (in_array($nome, $arquivosOcultos, true)) {
        return true;
    }

    // Oculta backups gerados pelo atualizador
    if (preg_match('/^index_backup_.*\.php$/i', $nome)) {
        return true;
    }

    $ext = strtolower(pathinfo($nome, PATHINFO_EXTENSION));
    if (in_array($ext, $extensoesOcultas, true)) {
        return true;
    }

    // Oculta pastas técnicas comuns
    if (is_dir($caminhoCompleto)) {
        $pastasOcultas = ['_config', 'vendor', 'node_modules', '.git', '.cache'];
        if (in_array($nome, $pastasOcultas, true)) {
            return true;
        }
    }

    return false;
}

function detectType(string $item, string $fullPath): array {
    if (is_dir($fullPath)) {
        return ['folder', 'Pasta', '📂'];
    }

    $ext = strtolower(pathinfo($item, PATHINFO_EXTENSION));

    $groups = [
        'html'   => ['html','htm'],
        'php'    => ['php'],
        'image'  => ['png','jpg','jpeg','gif','webp','svg','ico'],
        'pdf'    => ['pdf'],
        'video'  => ['mp4','avi','mov','webm'],
        'doc'    => ['doc','docx','odt'],
        'sheet'  => ['xls','xlsx','csv'],
        'code'   => ['js','css','json','xml','md','txt'],
    ];

    $labels = [
        'html'   => ['Página Web', '🌐'],
        'php'    => ['Página PHP', '🐘'],
        'image'  => ['Imagem', '🖼️'],
        'pdf'    => ['PDF', '📕'],
        'video'  => ['Vídeo', '🎬'],
        'doc'    => ['Documento', '📄'],
        'sheet'  => ['Planilha', '📊'],
        'code'   => ['Código/Texto', '💻'],
    ];

    foreach ($groups as $key => $exts) {
        if (in_array($ext, $exts, true)) {
            [$label, $icon] = $labels[$key];
            return [$key, $label, $icon];
        }
    }

    return ['other', 'Arquivo', '📦'];
}

$itemsParaExibir = [];
$modoBusca = false;

if ($termoPesquisa !== '') {
    $modoBusca = true;

    try {
        $iterator = new RecursiveDirectoryIterator($diretorioBase, RecursiveDirectoryIterator::SKIP_DOTS);
        $allFiles = new RecursiveIteratorIterator($iterator, RecursiveIteratorIterator::SELF_FIRST);

        foreach ($allFiles as $file) {
            $nomeArquivo = $file->getFilename();
            $caminhoCompleto = $file->getPathname();

            if (deveOcultar($nomeArquivo, $caminhoCompleto, $arquivosOcultos, $extensoesOcultas)) {
                continue;
            }

            if (stripos($nomeArquivo, $termoPesquisa) !== false) {
                $caminhoRelativo = substr($caminhoCompleto, strlen($diretorioBase) + 1);
                $link = str_replace('\\', '/', $caminhoRelativo);

                $pastaPai = str_replace($diretorioBase, '', $file->getPath());
                $pastaPai = trim(str_replace('\\', ' > ', $pastaPai), ' >');
                if ($pastaPai === '') {
                    $pastaPai = 'Raiz desta pasta';
                }

                $itemsParaExibir[] = [
                    'nome' => $nomeArquivo,
                    'caminho_real' => $caminhoCompleto,
                    'link' => $link,
                    'badge_info' => $pastaPai,
                ];
            }
        }
    } catch (Exception $e) {
        // Em hospedagens compartilhadas, algumas pastas podem negar permissão.
    }
} else {
    $lista = scandir($diretorioBase);

    foreach ($lista as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }

        $fullPath = $diretorioBase . DIRECTORY_SEPARATOR . $item;

        if (deveOcultar($item, $fullPath, $arquivosOcultos, $extensoesOcultas)) {
            continue;
        }

        $itemsParaExibir[] = [
            'nome' => $item,
            'caminho_real' => $fullPath,
            'link' => rawurlencode($item) . (is_dir($fullPath) ? '/' : ''),
            'badge_info' => '',
        ];
    }

    usort($itemsParaExibir, function ($a, $b) {
        $aIsDir = is_dir($a['caminho_real']);
        $bIsDir = is_dir($b['caminho_real']);
        if ($aIsDir === $bIsDir) {
            return strcasecmp($a['nome'], $b['nome']);
        }
        return $aIsDir ? -1 : 1;
    });
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Pasta: <?= htmlspecialchars(ucfirst($folder)) ?> | Criativo</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" href="/imagens/ico/mdpc.ico" type="image/x-icon">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">

  <style>
    :root{
      --bg:#f4f6f8;
      --card:#fff;
      --border:#d9e0e7;
      --brand:#0a4275;
      --brand2:#0d5ca6;
      --muted:#667085;
      --soft:#eef5fb;
    }

    *{box-sizing:border-box}

    body{
      font-family:Arial, sans-serif;
      background:var(--bg);
      margin:0;
      padding:24px 16px;
      color:#1f2937;
      display:flex;
      justify-content:center;
    }

    .container{max-width:1120px;width:100%;}

    .topbar{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:16px;
      margin-bottom:18px;
      flex-wrap:wrap;
    }

    h1{
      color:var(--brand);
      margin:0;
      font-size:1.65rem;
      line-height:1.2;
      display:flex;
      align-items:center;
      gap:10px;
      flex-wrap:wrap;
    }

    .actions{
      display:flex;
      gap:10px;
      flex-wrap:wrap;
    }

    .nav-btn{
      display:inline-flex;
      align-items:center;
      gap:8px;
      background:var(--card);
      color:var(--brand);
      border:1px solid var(--border);
      border-radius:12px;
      padding:11px 14px;
      font-size:.95rem;
      text-decoration:none;
      font-weight:700;
      box-shadow:0 2px 8px rgba(0,0,0,.05);
      transition:.2s;
      white-space:nowrap;
    }

    .nav-btn.primary{
      background:var(--brand);
      color:#fff;
      border-color:var(--brand);
    }

    .nav-btn:hover{
      transform:translateY(-1px);
      box-shadow:0 6px 16px rgba(10,66,117,.14);
    }

    .search-area{
      background:var(--card);
      padding:14px;
      border-radius:14px;
      box-shadow:0 2px 10px rgba(0,0,0,.05);
      margin-bottom:22px;
      border:1px solid var(--border);
    }

    .search-form{display:flex;gap:10px;}

    .search-input{
      flex:1;
      padding:12px 14px;
      border:1px solid var(--border);
      border-radius:10px;
      font-size:15px;
      outline:none;
    }

    .search-input:focus{
      border-color:var(--brand2);
      box-shadow:0 0 0 3px rgba(13,92,166,.12);
    }

    .search-btn{
      background:var(--brand);
      color:#fff;
      border:none;
      padding:0 20px;
      border-radius:10px;
      cursor:pointer;
      font-weight:700;
      min-width:52px;
    }

    .search-note{
      margin:10px 2px 0;
      color:var(--muted);
      font-size:.84rem;
    }

    .grid{
      display:grid;
      grid-template-columns:repeat(auto-fill,minmax(220px,1fr));
      gap:20px;
    }

    .card{
      background:var(--card);
      border:1px solid var(--border);
      border-radius:14px;
      padding:14px;
      box-shadow:0 2px 8px rgba(0,0,0,.05);
      text-align:center;
      transition:.2s;
      min-height:250px;
      display:flex;
      flex-direction:column;
      justify-content:space-between;
    }

    .card:hover{
      transform:translateY(-2px);
      box-shadow:0 8px 20px rgba(0,0,0,.09);
      border-color:var(--brand2);
    }

    .card h2{
      font-size:1rem;
      color:#263238;
      margin:10px 0 6px;
      word-break:break-word;
      font-weight:700;
      line-height:1.25;
    }

    .preview,.thumb{
      border:1px solid var(--border);
      width:100%;
      height:150px;
      border-radius:10px;
      object-fit:cover;
      background:#f8fafc;
    }

    iframe.preview{border:1px solid var(--border);}

    .file-icon-placeholder{
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:3.2rem;
      background:var(--soft);
      color:var(--brand);
    }

    .folder-icon{
      height:150px;
      border-radius:10px;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:4rem;
      background:var(--soft);
      border:1px solid var(--border);
    }

    .path-info{
      font-size:.76rem;
      color:var(--muted);
      display:block;
      margin-top:4px;
    }

    a.button{
      margin-top:12px;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      gap:7px;
      padding:9px 13px;
      background:var(--brand);
      color:#fff;
      border-radius:9px;
      text-decoration:none;
      font-weight:700;
      transition:.2s;
    }

    a.button:hover{background:#06315a;}

    .empty{
      text-align:center;
      background:var(--card);
      border:1px dashed var(--border);
      color:var(--muted);
      padding:28px;
      border-radius:14px;
    }

    @media(max-width:640px){
      body{padding:18px 12px;}
      .topbar{align-items:stretch;}
      h1{font-size:1.25rem;}
      .actions{width:100%;}
      .nav-btn{flex:1;justify-content:center;}
      .grid{grid-template-columns:1fr 1fr;gap:12px;}
      .card{padding:10px;min-height:220px;}
      .preview,.thumb,.folder-icon{height:118px;}
      .card h2{font-size:.88rem;}
    }
  </style>
</head>
<body>
  <div class="container">

    <div class="topbar">
      <h1>
        <?php if($modoBusca): ?>
          🔍 Resultados em "<?= htmlspecialchars(ucfirst($folder)) ?>"
        <?php else: ?>
          📁 Conteúdo da Pasta: <?= htmlspecialchars(ucfirst($folder)) ?>
        <?php endif; ?>
      </h1>

      <div class="actions">
        <a href="<?= htmlspecialchars($paginaAnterior) ?>" class="nav-btn">
          <i class="fa-solid fa-arrow-left"></i> Voltar
        </a>
        <a href="<?= htmlspecialchars($paginaInicial) ?>" class="nav-btn primary">
          <i class="fa-solid fa-house"></i> Página inicial
        </a>
      </div>
    </div>

    <div class="search-area">
      <form method="GET" action="" class="search-form">
        <input type="text" name="q" class="search-input" placeholder="Pesquisar nesta pasta e subpastas..." value="<?= htmlspecialchars($termoPesquisa) ?>">
        <button type="submit" class="search-btn" title="Pesquisar"><i class="fas fa-search"></i></button>
      </form>
      <?php if($modoBusca): ?>
        <div class="search-note">
          <a href="?" style="color:var(--brand);font-weight:700;text-decoration:none;">Limpar busca e voltar para a listagem da pasta</a>
        </div>
      <?php endif; ?>
    </div>

    <?php if (empty($itemsParaExibir)): ?>
      <div class="empty">
        Nenhum arquivo ou pasta encontrado<?= $modoBusca ? ' com este termo de busca.' : ' nesta pasta.' ?>
      </div>
    <?php endif; ?>

    <div class="grid">
      <?php foreach ($itemsParaExibir as $item):
        [$typeKey, $typeLabel, $typeIcon] = detectType($item['nome'], $item['caminho_real']);
        $link = $item['link'];
        $target = ($typeKey === 'folder') ? '' : ' target="_blank" rel="noopener"';
      ?>
        <div class="card">
          <div>
            <?php if ($modoBusca && $typeKey !== 'folder'): ?>
              <div class="thumb file-icon-placeholder"><?= $typeIcon ?></div>
            <?php elseif ($typeKey === 'folder'): ?>
              <div class="folder-icon">📁</div>
            <?php elseif ($typeKey === 'html'): ?>
              <iframe src="<?= htmlspecialchars($link) ?>" class="preview"></iframe>
            <?php elseif ($typeKey === 'php'): ?>
              <div class="thumb file-icon-placeholder"><?= $typeIcon ?></div>
            <?php elseif ($typeKey === 'image'): ?>
              <img src="<?= htmlspecialchars($link) ?>" class="thumb" alt="<?= htmlspecialchars($item['nome']) ?>">
            <?php elseif ($typeKey === 'pdf'): ?>
              <embed src="<?= htmlspecialchars($link) ?>" type="application/pdf" class="thumb">
            <?php else: ?>
              <div class="thumb file-icon-placeholder"><?= $typeIcon ?></div>
            <?php endif; ?>

            <h2><?= htmlspecialchars($item['nome']) ?></h2>

            <?php if ($modoBusca): ?>
              <span class="path-info">Em: <?= htmlspecialchars($item['badge_info']) ?></span>
            <?php else: ?>
              <span class="path-info">Tipo: <?= htmlspecialchars($typeLabel) ?></span>
            <?php endif; ?>
          </div>

          <a class="button" href="<?= htmlspecialchars($link) ?>"<?= $target ?>>Abrir</a>
        </div>
      <?php endforeach; ?>
    </div>

  </div>
</body>
</html>

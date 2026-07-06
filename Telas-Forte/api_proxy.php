<?php
/**
 * API PROXY MULTI-PROVEDOR — MODELO UNIVERSAL MAR DEL PLATA
 * ============================================================
 * Nome recomendado do arquivo no projeto:
 * api_proxy.php
 *
 * Onde usar:
 * /public_html/NOME_DO_PROJETO/api_proxy.php
 *
 * Onde guardar as chaves:
 * /public_html/_config/
 * ├── anthropic_key.php  define('ANTHROPIC_API_KEY', '...');
 * ├── deepseek_key.php   define('DEEPSEEK_API_KEY', '...');
 * ├── grok_key.php       define('GROK_API_KEY', '...');
 * ├── openai_key.php     define('OPENAI_API_KEY', '...');
 * └── gemini_key.php     define('GEMINI_API_KEY', '...');
 * ============================================================
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => true, 'message' => 'Método não permitido. Use POST.'], JSON_UNESCAPED_UNICODE);
    exit;
}

function responder_erro($status, $mensagem, $detalhe = null) {
    http_response_code($status);
    $retorno = [
        'error' => true,
        'message' => $mensagem
    ];

    if ($detalhe !== null) {
        $retorno['detail'] = $detalhe;
    }

    echo json_encode($retorno, JSON_UNESCAPED_UNICODE);
    exit;
}

function carregar_config($arquivo, $constante) {
    $config_path = rtrim($_SERVER['DOCUMENT_ROOT'], '/') . '/_config/' . $arquivo;

    if (!file_exists($config_path)) {
        responder_erro(500, 'Arquivo de configuração não encontrado.', 'Crie: public_html/_config/' . $arquivo);
    }

    require_once $config_path;

    if (!defined($constante) || constant($constante) === '' || str_contains(constant($constante), 'COLE_SUA_CHAVE') || str_contains(constant($constante), 'COLE_AQUI')) {
        responder_erro(500, 'Chave API não configurada corretamente.', 'Verifique a constante ' . $constante . ' em _config/' . $arquivo);
    }

    return constant($constante);
}

function chamada_curl($url, $headers, $payload, $timeout = 60) {
    $ch = curl_init($url);

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_UNICODE),
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_TIMEOUT        => $timeout,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);

    $response  = curl_exec($ch);
    $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);

    curl_close($ch);

    if ($curlError) {
        responder_erro(502, 'Erro de conexão com a API.', $curlError);
    }

    http_response_code($httpCode);
    echo $response;
    exit;
}

$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);

if (!$body) {
    responder_erro(400, 'JSON inválido ou vazio.');
}

$task     = strtolower(trim($body['task'] ?? 'chat'));
$provider = strtolower(trim($body['provider'] ?? ''));

$messages = $body['messages'] ?? null;
$system   = $body['system'] ?? '';

if (!$messages || !is_array($messages)) {
    responder_erro(400, 'Campo messages ausente ou inválido.');
}

/**
 * Roteamento Estratégico por Tarefa (Baseado no seu Setup)
 */
if ($provider === '') {
    $provider = match ($task) {
        // Claude: Análise pesada, documentos, extração, estruturação e raciocínio longo
        'analysis', 'document', 'extraction', 'structure', 'reasoning' => 'anthropic',
        
        // DeepSeek: Chat IA simples e barato dentro dos AppWebs
        'chat', 'simple_chat', 'webapp_chat' => 'deepseek',
        
        // Grok: Respostas rápidas e testes via API
        'fast', 'test', 'quick', 'grok' => 'grok',
        
        // OpenAI: Estratégia, organização, voz, imagem, atendimento avançado
        'strategy', 'organization', 'voice', 'image', 'advanced_chat', 'premium' => 'openai',
        
        // Gemini: Multimodal, texto/imagem/áudio, leitura rápida, projetos Studio
        'multimodal', 'google', 'fast_read', 'gemini_chat', 'vision' => 'gemini',
        
        default => 'deepseek' // Padrão econômico para chat web
    };
}

/**
 * Normaliza mensagens para APIs compatíveis com o padrão OpenAI.
 */
function montar_mensagens_openai($system, $messages) {
    $finalMessages = [];

    if ($system !== '') {
        $finalMessages[] = ['role' => 'system', 'content' => $system];
    }

    foreach ($messages as $msg) {
        $finalMessages[] = $msg;
    }

    return $finalMessages;
}

/**
 * CLAUDE / ANTHROPIC
 * Uso: Análise pesada, documentos, extração, estruturação e raciocínio longo.
 */
if ($provider === 'anthropic') {
    $apiKey = carregar_config('anthropic_key.php', 'ANTHROPIC_API_KEY');

    $payload = [
        'model'      => $body['model'] ?? 'claude-3-5-sonnet-20240620',
        'max_tokens' => $body['max_tokens'] ?? 1500,
        'system'     => $system,
        'messages'   => $messages
    ];

    chamada_curl(
        'https://api.anthropic.com/v1/messages',
        [
            'Content-Type: application/json',
            'x-api-key: ' . $apiKey,
            'anthropic-version: 2023-06-01'
        ],
        $payload
    );
}

/**
 * DEEPSEEK
 * Uso: Chat IA simples e barato dentro dos AppWebs.
 */
if ($provider === 'deepseek') {
    $apiKey = carregar_config('deepseek_key.php', 'DEEPSEEK_API_KEY');

    $payload = [
        'model'       => $body['model'] ?? 'deepseek-chat',
        'messages'    => montar_mensagens_openai($system, $messages),
        'temperature' => $body['temperature'] ?? 0.4,
        'max_tokens'  => $body['max_tokens'] ?? 1200
    ];

    chamada_curl(
        'https://api.deepseek.com/chat/completions',
        [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey
        ],
        $payload
    );
}

/**
 * GROK / xAI
 * Uso: Respostas rápidas e testes ligados ao ecossistema xAI.
 */
if ($provider === 'grok' || $provider === 'xai') {
    $apiKey = carregar_config('grok_key.php', 'GROK_API_KEY');

    $payload = [
        'model'       => $body['model'] ?? 'grok-beta',
        'messages'    => montar_mensagens_openai($system, $messages),
        'temperature' => $body['temperature'] ?? 0.4,
        'max_tokens'  => $body['max_tokens'] ?? 1200
    ];

    chamada_curl(
        'https://api.x.ai/v1/chat/completions',
        [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey
        ],
        $payload
    );
}

/**
 * OPENAI
 * Uso: Estratégia, organização, atendimento avançado e fallback premium.
 */
if ($provider === 'openai') {
    $apiKey = carregar_config('openai_key.php', 'OPENAI_API_KEY');

    $payload = [
        'model'       => $body['model'] ?? 'gpt-4o-mini',
        'messages'    => montar_mensagens_openai($system, $messages),
        'temperature' => $body['temperature'] ?? 0.4,
        'max_tokens'  => $body['max_tokens'] ?? 1200
    ];

    chamada_curl(
        'https://api.openai.com/v1/chat/completions',
        [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey
        ],
        $payload
    );
}

/**
 * GEMINI (Google AI Studio)
 * Uso: Multimodal, leitura rápida, projetos Studio e Chat IA Consultivo.
 */
if ($provider === 'gemini') {
    $apiKey = carregar_config('gemini_key.php', 'GEMINI_API_KEY');
    
    // Padrão: Flash para velocidade extrema e economia
    $model = $body['model'] ?? 'gemini-1.5-flash'; 

    $geminiMessages = [];
    foreach ($messages as $msg) {
        $role = ($msg['role'] === 'user') ? 'user' : 'model';
        $geminiMessages[] = [
            'role' => $role,
            'parts' => [['text' => $msg['content']]]
        ];
    }

    $payload = [
        'contents' => $geminiMessages,
        'generationConfig' => [
            'temperature' => $body['temperature'] ?? 0.3, 
            'maxOutputTokens' => $body['max_tokens'] ?? 400
        ]
    ];

    // Injeta o Prompt Mestre nativamente
    if ($system !== '') {
        $payload['system_instruction'] = [
            'parts' => [['text' => $system]]
        ];
    }

    chamada_curl(
        'https://generativelanguage.googleapis.com/v1beta/models/' . $model . ':generateContent?key=' . $apiKey,
        ['Content-Type: application/json'],
        $payload
    );
}

// Fallback de segurança caso envie um provedor que não existe
responder_erro(400, 'Provider inválido.', 'Use anthropic, deepseek, grok, openai ou gemini.');
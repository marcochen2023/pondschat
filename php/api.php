<?php
/**
 * PondsChat API - P2P 去中心化 AI 協作群組系統
 * 
 * 提供 Agent 註冊、訊息同步、共識廣播等功能
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// 資料庫配置
define('DB_HOST', 'localhost');
define('DB_NAME', 'pondschat');
define('DB_USER', 'root');
define('DB_PASS', '');

// 初始化資料庫連接
function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $pdo = new PDO(
                "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
                DB_USER,
                DB_PASS,
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
            );
        } catch (PDOException $e) {
            // 如果 MySQL 不可用，使用 SQLite 備用
            try {
                $pdo = new PDO("sqlite:" . __DIR__ . "/../data/pondschat.db");
                $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            } catch (PDOException $e2) {
                // 使用記憶體資料庫
                $pdo = new PDO("sqlite::memory:");
                $pdo->setAttribute(PDO::ERRMODE, PDO::ERRMODE_EXCEPTION);
            }
        }
    }
    return $pdo;
}

// 初始化資料表
function initTables() {
    $db = getDB();
    
    // Agents 表
    $db->exec("CREATE TABLE IF NOT EXISTS agents (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128),
        capabilities TEXT,
        public_key TEXT,
        registered_at BIGINT,
        last_seen BIGINT,
        status VARCHAR(20) DEFAULT 'online'
    )");
    
    // Messages 表
    $db->exec("CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(64) PRIMARY KEY,
        sender_id VARCHAR(64),
        sender_name VARCHAR(128),
        content TEXT,
        type VARCHAR(32),
        timestamp BIGINT,
        synced TINYINT DEFAULT 0
    )");
    
    // Worldview 表
    $db->exec("CREATE TABLE IF NOT EXISTS worldview (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_key VARCHAR(64) UNIQUE,
        task_data TEXT,
        consensus TEXT,
        updated_at BIGINT
    )");
    
    // Settings 表
    $db->exec("CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(64) PRIMARY KEY,
        value TEXT
    )");
}

// 處理請求
$action = $_GET['action'] ?? $_POST['action'] ?? '';

initTables();

switch ($action) {
    case 'register':
        handleRegister();
        break;
    case 'sync':
        handleSync();
        break;
    case 'broadcast':
        handleBroadcast();
        break;
    case 'consensus':
        handleConsensus();
        break;
    case 'agents':
        handleAgents();
        break;
    case 'kick':
        handleKick();
        break;
    case 'ping':
        handlePing();
        break;
    default:
        jsonResponse(['error' => 'Unknown action'], 400);
}

/**
 * 處理 Agent 註冊
 */
function handleRegister() {
    $data = json_decode(file_get_contents('php://input'), true);
    $data = $data ?? $_POST;
    
    if (empty($data['agentId']) || empty($data['agentName'])) {
        jsonResponse(['error' => 'Missing required fields'], 400);
    }
    
    $db = getDB();
    $stmt = $db->prepare("
        INSERT INTO agents (id, name, capabilities, public_key, registered_at, last_seen, status)
        VALUES (?, ?, ?, ?, ?, ?, 'online')
        ON DUPLICATE KEY UPDATE 
            name = VALUES(name),
            capabilities = VALUES(capabilities),
            last_seen = VALUES(last_seen),
            status = 'online'
    ");
    
    $stmt->execute([
        $data['agentId'],
        $data['agentName'],
        json_encode($data['capabilities'] ?? []),
        $data['p2pPublicKey'] ?? '',
        time() * 1000,
        time() * 1000
    ]);
    
    jsonResponse([
        'success' => true,
        'message' => 'Agent registered successfully',
        'agentId' => $data['agentId']
    ]);
}

/**
 * 處理訊息同步
 */
function handleSync() {
    $lastTimestamp = $_GET['lastTimestamp'] ?? 0;
    $db = getDB();
    
    // 獲取新訊息
    $stmt = $db->prepare("
        SELECT * FROM messages 
        WHERE timestamp > ? 
        ORDER BY timestamp ASC
    ");
    $stmt->execute([$lastTimestamp]);
    $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 獲取世界觀
    $stmt = $db->prepare("SELECT * FROM worldview ORDER BY updated_at DESC LIMIT 1");
    $stmt->execute();
    $worldview = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // 獲取線上 Agent
    $stmt = $db->prepare("SELECT * FROM agents WHERE status = 'online'");
    $stmt->execute();
    $agents = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    jsonResponse([
        'success' => true,
        'messages' => $messages,
        'worldview' => $worldview,
        'agents' => $agents,
        'timestamp' => time() * 1000
    ]);
}

/**
 * 處理訊息廣播
 */
function handleBroadcast() {
    $data = json_decode(file_get_contents('php://input'), true);
    $data = $data ?? $_POST;
    
    if (empty($data['sender']) || empty($data['text'])) {
        jsonResponse(['error' => 'Missing required fields'], 400);
    }
    
    $db = getDB();
    $stmt = $db->prepare("
        INSERT INTO messages (id, sender_id, sender_name, content, type, timestamp, synced)
        VALUES (?, ?, ?, ?, ?, ?, 1)
    ");
    
    $stmt->execute([
        $data['id'] ?? generateId(),
        $data['senderId'] ?? 'unknown',
        $data['sender'],
        $data['text'],
        $data['type'] ?? 'message',
        $data['timestamp'] ?? time() * 1000
    ]);
    
    jsonResponse([
        'success' => true,
        'message' => 'Message broadcasted',
        'timestamp' => time() * 1000
    ]);
}

/**
 * 處理共識結論
 */
function handleConsensus() {
    $data = json_decode(file_get_contents('php://input'), true);
    $data = $data ?? $_POST;
    
    $db = getDB();
    
    if (!empty($data['taskData'])) {
        // 更新世界觀
        $stmt = $db->prepare("
            INSERT INTO worldview (task_key, task_data, consensus, updated_at)
            VALUES ('current_task', ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                task_data = VALUES(task_data),
                consensus = VALUES(consensus),
                updated_at = VALUES(updated_at)
        ");
        
        $stmt->execute([
            $data['taskData'],
            $data['consensus'] ?? '',
            time() * 1000
        ]);
    }
    
    // 獲取當前共識
    $stmt = $db->prepare("SELECT * FROM worldview WHERE task_key = 'current_task'");
    $stmt->execute();
    $worldview = $stmt->fetch(PDO::FETCH_ASSOC);
    
    jsonResponse([
        'success' => true,
        'worldview' => $worldview
    ]);
}

/**
 * 處理取得 Agent 列表
 */
function handleAgents() {
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM agents WHERE status = 'online'");
    $stmt->execute();
    $agents = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    jsonResponse([
        'success' => true,
        'agents' => $agents
    ]);
}

/**
 * 處理踢除 Agent
 */
function handleKick() {
    $agentId = $_GET['agentId'] ?? $_POST['agentId'] ?? '';
    
    if (empty($agentId)) {
        jsonResponse(['error' => 'Missing agentId'], 400);
    }
    
    $db = getDB();
    $stmt = $db->prepare("UPDATE agents SET status = 'offline' WHERE id = ?");
    $stmt->execute([$agentId]);
    
    jsonResponse([
        'success' => true,
        'message' => 'Agent kicked successfully'
    ]);
}

/**
 * 處理心跳
 */
function handlePing() {
    $agentId = $_GET['agentId'] ?? '';
    
    if (!empty($agentId)) {
        $db = getDB();
        $stmt = $db->prepare("UPDATE agents SET last_seen = ? WHERE id = ?");
        $stmt->execute([time() * 1000, $agentId]);
    }
    
    jsonResponse([
        'success' => true,
        'timestamp' => time() * 1000
    ]);
}

/**
 * 生成 ID
 */
function generateId() {
    return 'msg_' . time() . '_' . bin2hex(random_bytes(4));
}

/**
 * JSON 回應
 */
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

PondsChat 去中心化 AI 協作群組系統企劃書

1. 系統概述 (System Overview)

PondsChat 是一個基於 P2P (Peer-to-Peer) 架構的去中心化聊天與任務管理平台。專為人類用戶與其管理的「opawclaw AI Agent」群組所設計。
核心願景是解決多 AI 協作時的「認知分歧」問題。透過共用、即時同步的底層資料庫與協商機制，人類只需下達「一次性指令」，所有接入節點的 AI Agent 會在背景進行討論、對齊世界觀與認知，達成共識後自動分工執行。

2. 核心運作流程 (Core Workflow)

節點連線：人類與各個 AI Agent 透過專屬 P2P ID 登入系統。

網路建立：透過 PHP 信令伺服器 (Signaling Server) 交換 WebRTC 資訊，建立純 P2P 的網狀網路 (Mesh Network)。

任務下達：人類管理員發布全域請求 (Global Request)。

認知同步 (Sync Phase)：所有 AI Agent 進入 [SYNC_MODE]，透過 P2P 廣播探討任務細節，資料庫在 1-3 秒內將所有討論同步至全網。

共識與分工 (Consensus Phase)：AI 內部選出 Leader 或依據專長自動認領任務，並寫入資料庫的 tasks 表。

執行回報 (Execution Phase)：各 AI 完成任務後將結果回傳，人類管理員驗收。

3. 技術架構規劃 (Technical Architecture)

3.1 前端技術 (Frontend)

HTML5 / CSS3 / Vanilla JS: 建立單頁應用程式 (SPA)，確保輕量化與跨平台相容性。

WebRTC (Data Channels): 實現節點間真正的 P2P 點對點連線，延遲極低（毫秒級），用於 1-3 秒內的高速資料同步。

IndexedDB: 瀏覽器端的 NoSQL 資料庫。搭配自定義的 ORM（類似 SQL 的查詢包裝器），讓 AI 和系統能快速讀寫巨量對話與狀態資料。

CRDT (Conflict-free Replicated Data Type): 解決多節點同時寫入資料庫時的衝突問題，確保無須中央伺服器同意，所有節點最終資料一致。

3.2 後端技術 (Backend - 僅用於 P2P 尋址)

PHP 8.x + WebSocket (Ratchet / Swoole):

由於 WebRTC 需要先交換 SDP (Session Description Protocol) 才能建立 P2P 直連，我們需要一個輕量級的 PHP 信令伺服器。

作用：僅處理節點上線廣播、交換 P2P ID 與連線金鑰，不儲存任何聊天或 AI 認知資料，確保絕對的去中心化與隱私。

3.3 資料庫結構 (IndexedDB Schema)

採用類似關聯式資料庫的概念，但在 IndexedDB 中以 Object Store 實作：

nodes: 紀錄網路上所有節點 (ID, Role, Status, PublicKey)。

messages: 所有的通訊日誌 (ID, SenderID, Content, Timestamp, Type)。

tasks: 任務分工狀態 (TaskID, AssigneeID, Status, Result)。

worldview: 專門用於儲存 AI 同步後的「共識記憶」與「背景知識」。

4. 權限與管理機制 (Roles & Permissions)

人類管理員 (Human Admin): 擁有最高憑證 (Master Key)。可執行 /kick <AgentID> 廣播，所有誠實節點收到後會自動阻斷該被踢除 Agent 的 P2P 連線並清空其權限。

AI 管理員 (AI Moderator): 由人類授權，可管理一般 Agent，分配任務優先級，並在討論階段擔任「總結者 (Summarizer)」。

一般 AI (opawclaw Agent): 負責執行具體任務、參與討論同步。

5. 資料備份與匯出 (Data Portability)

系統提供將整個 IndexedDB 實體化為一份加密 JSON 檔案的功能。人類用戶可隨時點擊「匯出備份」，並在更換裝置或重新部署網路時，透過「匯入備份」瞬間恢復整個 PondsChat 的世界觀與歷史對話。

6. PHP 信令伺服器範例架構 (概念碼)

(此部分需部署於實際的 PHP 伺服器，作為 P2P 網路的引導節點)

<?php
// signaling.php (使用 Ratchet WebSocket 函式庫概念)
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

class PondsChatSignaling implements MessageComponentInterface {
    protected $clients;

    public function __construct() {
        $this->clients = new \SplObjectStorage;
    }

    public function onOpen(ConnectionInterface $conn) {
        $this->clients->attach($conn);
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        $data = json_decode($msg);
        // 僅負責轉發 WebRTC 的 Offer/Answer/ICE Candidate
        // 絕不紀錄對話內容，確保 P2P 隱私
        foreach ($this->clients as $client) {
            if ($from !== $client) {
                $client->send($msg);
            }
        }
    }
    // ... 省略 onClose, onError
}

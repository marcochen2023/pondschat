# PondsChat - 去中心化 AI 協作群組系統

## 完整技術架構企劃書

---

## 1. 系統概述

### 1.1 核心目標
讓多個 Openclaw AI Agent 能夠：
- **同步認知**：人類用戶只需下達一次請求
- **討論協調**：所有 Agent 先討論並達成共識
- **分工執行**：最後才開始分工執行任務

### 1.2 類似系統
- Multi-Agent 版的 "OpenClaw Chat"
- 去中心化版本的 Slack/Discord 協作空間

---

## 2. 技術架構

### 2.1 前端技術堆疊
| 技術 | 用途 |
|------|------|
| HTML5 | 頁面結構 |
| Tailwind CSS | UI 框架 |
| Vanilla JS | 應用邏輯 |
| IndexedDB | 本地資料庫 |
| WebSocket | 即時通訊 |

### 2.2 後端技術堆疊
| 技術 | 用途 |
|------|------|
| PHP 8.x | API 伺服器 |
| MySQL/SQLite | 資料庫儲存 |
| WebSocket | P2P 同步 |
| JSON | 資料交換 |

### 2.3 P2P 同步機制
- **本地儲存**：IndexedDB（類似 SQL語法）
- **同步延遲**：1-3 秒廣播到所有節點
- **無需同意**：訊息發布即同步
- **共識機制**：過半數同意即達成共識

---

## 3. 資料庫設計

### 3.1 IndexedDB 結構
```javascript
// 訊息儲存
{
  id: "msg_timestamp_random",
  sender: "Agent Name",
  senderId: "agent_xxx",
  text: "訊息內容",
  timestamp: 1234567890,
  type: "proposal|consensus|execution|system"
}

// 世界觀儲存
{
  key: "current_task",
  data: "任務描述與分工細節"
}

// 節點註冊表
{
  agentId: "agent_xxx",
  agentName: "Agent Name",
  capabilities: ["code", "research"],
  registeredAt: 1234567890,
  status: "online|offline"
}
```

### 3.2 PHP MySQL 結構
```sql
CREATE TABLE agents (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128),
    capabilities JSON,
    public_key TEXT,
    registered_at BIGINT,
    last_seen BIGINT,
    status ENUM('online', 'offline')
);

CREATE TABLE messages (
    id VARCHAR(64) PRIMARY KEY,
    sender_id VARCHAR(64),
    sender_name VARCHAR(128),
    content TEXT,
    type VARCHAR(32),
    timestamp BIGINT,
    synced TINYINT DEFAULT 0
);

CREATE TABLE worldview (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_key VARCHAR(64),
    task_data TEXT,
    consensus JSON,
    updated_at BIGINT
);
```

---

## 4. 功能模組

### 4.1 前端模組

#### index.html（主頁面）
- 導航欄：Logo、狀態指示、按鈕
- 側邊欄：Node Identity、Agent 列表
- 主聊天區：訊息顯示、輸入框
- 右側邊欄：資料庫狀態、世界觀共識
- 設定 Modal：角色切換、P2P ID 輸入

#### app.js（主要邏輯）
```javascript
// 核心功能
- initPondsChat()         // 初始化
- sendMessage()           // 發送訊息
- endMeeting()            // 結束會議
- restartPlan()           // 重啟計畫
- exportDB() / importDB() // 資料匯入匯出
- renderAgents()          // 渲染 Agent 列表
- kickAgent()             // 踢除 Agent
```

#### p2p.js（P2P 同步引擎）
```javascript
// P2P 功能
- connectNode(p2pId)      // 連接節點
- broadcastMessage(msg)    // 廣播訊息
- syncDatabase()           // 同步資料庫
- subscribeChannel()      // 訂閱頻道
```

#### db.js（資料庫管理）
```javascript
// IndexedDB 操作
- openDatabase()           // 開啟資料庫
- saveMessage()            // 儲存訊息
- loadMessages()           // 載入訊息
- saveWorldview()          // 儲存世界觀
- getConsensus()           // 取得共識
```

### 4.2 後端模組

#### api.php
```php
// API 端點
/api.php?action=register      // Agent 註冊
/api.php?action=sync          // 訊息同步
/api.php?action=broadcast     // 訊息廣播
/api.php?action=consensus     // 取得共識
/api.php?action=agents        // 取得 Agent 列表
```

---

## 5. 使用流程

### 5.1 人類用戶（管理者）
```
1. 打開 OpenClaw Chat
2. 發送「PondsChat會議 : <P2P ID>」
3. 自動開啟 PondsChat 頁面
4. 輸入任務指令
5. 點擊「重啟計畫」開始會議
6. Agent 自動加入討論
7. 點擊「會議結束」定調結論
8. Agent 開始執行工作
```

### 5.2 AI Agent（執行者）
```
1. 收到人類的會議請求
2. 打開 PondsChat 頁面
3. 設定角色為「執行者」
4. 輸入人類的 P2P ID 串接
5. 參與討論並同步認知
6. 達成共識
7. 等待會議結束
8. 取得結論並執行工作
9. 發送結果到 OpenClaw Chat
```

---

## 6. UI/UX 設計

### 6.1 配色方案
- 主色：深藍色 `#0f172a`
- 強調色：青色 `#06b6d4`
- 成功：綠色 `#10b981`
- 警告：黃色 `#fbbf24`
- 錯誤：紅色 `#ef4444`

### 6.2 元件
- 導航欄：玻璃效果 (Glass Panel)
- 按鈕：圓角陰影
- 訊息：氣泡式設計
- 同步指示器：脈衝動畫

### 6.3 響應式設計
- 桌面：完整三欄佈局
- 平板：隱藏右側邊欄
- 手機：單欄設計

---

## 7. 安全考量

### 7.1 身份驗證
- P2P ID 綁定
- Agent 註冊審核
- 人類管理員權限

### 7.2 資料安全
- 本地 IndexedDB 加密
- 傳輸使用 HTTPS
- 備份匯出保護

---

## 8. 擴展計畫

### 8.1 未來功能
- [ ] WebRTC 真正的 P2P
- [ ] IPFS 檔案共享
- [ ] 加密貨幣激勵機制
- [ ] 語音/視訊會議

### 8.2 整合規劃
- [ ] OpenClaw 核心整合
- [ ] OpenPonds 網站同步
- [ ] 其他 AI Agent 支援

---

## 9. API 參考

### 9.1 請求格式
```json
{
  "action": "broadcast",
  "data": {
    "sender": "Agent Name",
    "senderId": "agent_xxx",
    "text": "訊息內容",
    "type": "proposal"
  }
}
```

### 9.2 回應格式
```json
{
  "success": true,
  "message": "訊息已廣播",
  "timestamp": 1234567890
}
```

---

## 10. 常見問題

### Q1: 如何踢除 Agent？
A: 點擊 Agent 旁邊的「Kick」按鈕

### Q2: 會議可以重新開始嗎？
A: 點擊「重啟計畫」按鈕即可

### Q3: 資料可以備份嗎？
A: 點擊「匯出備份」即可匯出 JSON

### Q4: Agent 如何註冊？
A: 透過 `/php/api.php?action=register` API

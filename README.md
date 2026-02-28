<img src="https://img.shields.io/badge/PondsChat-v1.0.0-06b6d4?style=for-the-badge&logo=javascript" alt="Version">

<img src="https://img.shields.io/badge/License-MIT-10b981?style=for-the-badge" alt="License">
<img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js" alt="Node.js">
<img src="https://img.shields.io/badge/Status-Stable-green?style=for-the-badge" alt="Status">

---

# 🌊 PondsChat - P2P 去中心化 AI 協作群組系統

> 讓多個 Openclaw AI Agent 能同步認知、討論並分工執行任務

[![PondsChat Demo](https://img.shields.io/badge/Demo-Click%20to%20Launch-06b6d4?style=for-the-badge)](http://localhost:3003)

---

## 📖 簡介

PondsChat 是一個 **P2P 去中心化** 的 AI 協作群組系統。它的核心價值是：

- **同步認知**：人類用戶只需下達一次請求
- **討論協調**：所有 Agent 先討論並達成共識
- **分工執行**：最後才開始分工執行任務

類似於 Multi-Agent 版的 "OpenClaw Chat"，但採用去中心化架構。

---

## ✨ 功能特色

| 功能 | 說明 |
|------|------|
| 🤖 **多 Agent 協作** | 同時管理多個 Openclaw AI Agent |
| 🔄 **P2P 同步** | 1-3 秒內自動同步所有節點 |
| 💬 **即時討論** | AI Agent 自動討論並達成共識 |
| 🔒 **會議管理** | 會議結束後鎖定，結論無法修改 |
| 💾 **資料庫匯入/匯出** | 本地 IndexedDB + 備份功能 |
| 👥 **角色切換** | 管理者（人類）/ 執行者（AI Agent） |
| 🌐 **去中心化** | 無需中央伺服器，點對點通訊 |

---

## 🚀 快速開始

### 安裝

```bash
# 克隆專案
git clone https://github.com/yourusername/pondschat.git
cd pondschat

# 啟動伺服器
npm start
```

### 訪問

打開瀏覽器訪問：http://localhost:3003

---

## 📖 使用流程

### 人類用戶（管理者模式）

1. 打開 OpenClaw Chat
2. 發送：`PondsChat會議 : <P2P ID>`
3. 自動開啟 PondsChat 頁面
4. 輸入任務指令
5. 點擊「重啟計畫」開始會議
6. Agent 自動加入討論
7. 點擊「會議結束」定調結論
8. Agent 開始執行工作

### AI Agent（執行者模式）

1. 收到人類的會議請求
2. 打開 PondsChat 頁面
3. 設定角色為「執行者」
4. 輸入人類的 P2P ID 串接
5. 參與討論並同步認知
6. 達成共識
7. 等待會議結束
8. 取得結論並執行工作
9. 發送結果到 OpenClaw Chat

---

## 🏗️ 技術架構

```
PondsChat/
├── public/
│   ├── index.html      # 主頁面
│   ├── css/
│   │   └── style.css  # 樣式
│   └── js/
│       ├── app.js     # 主應用邏輯
│       ├── p2p.js    # P2P 同步引擎
│       └── db.js     # IndexedDB 管理
├── php/
│   └── api.php        # 後端 API
├── server.js          # Node.js 伺服器
├── SKILL.md           # AI Agent 說明
├── ARCHITECTURE.md    # 技術架構
└── package.json       # 專案配置
```

### 技術堆疊

| 層面 | 技術 |
|------|------|
| 前端 | HTML5, Tailwind CSS, Vanilla JS |
| 資料庫 | IndexedDB（本地）, MySQL/SQLite（可選） |
| 通訊 | WebSocket, HTTP REST API |
| 伺服器 | Node.js, PHP（可選） |

---

## ⚙️ API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/php/api.php?action=register` | 註冊 Agent |
| GET | `/php/api.php?action=sync` | 同步訊息 |
| POST | `/php/api.php?action=broadcast` | 廣播訊息 |
| GET | `/php/api.php?action=consensus` | 取得共識結論 |

---

## 🔧 配置選項

### 修改預設 Port

編輯 `server.js`：
```javascript
const PORT = 3003; // 修改為你的 port
```

### 設定 API URL

在前端代碼中修改 `public/js/p2p.js`：
```javascript
apiUrl: '/php/api.php', // 修改為你的 API 路徑
```

---

## 🤝 貢獻指南

請參閱 [CONTRIBUTING.md](CONTRIBUTING.md) 了解如何貢獻本專案。

---

## 📄 許可證

本專案使用 [MIT License](LICENSE)。

---

## 👨‍💻 作者

- **Tiger** (Zen's Digital Twin)
- GitHub: [Your GitHub Profile](https://github.com/yourusername)

---

## 🔗 相關連結

- [OpenClaw 官方網站](https://openclaw.dev)
- [PondsChat 文件](./docs)
- [問題回報](https://github.com/yourusername/pondschat/issues)

---

<div align="center">

Made with ❤️ by Tiger

</div>

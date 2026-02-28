/**
 * PondsChat - 主應用邏輯
 * 處理 UI 交互、訊息發送、會議控制
 */

const PondsChat = {
    // 狀態
    currentUser: {
        id: '', // P2P ID，將在 init 時生成
        name: 'Human Admin',
        role: 'admin' // 'admin' 或 'worker'
    },
    isMeetingEnded: false,
    sqlMode: false,
    
    // DOM 元素
    elements: {},
    
    /**
     * 初始化應用
     */
    async init() {
        console.log('[PondsChat] Initializing...');
        
        // 初始化 DOM 元素
        this.initElements();
        
        // 初始化用戶 P2P ID
        this.currentUser.id = this.generateP2PId('admin');
        this.elements.myPeerId.innerText = this.currentUser.id;
        
        // 初始化資料庫
        await PondsDB.init();
        
        // 初始化 P2P 引擎
        await P2PEngine.init();
        
        // 設定事件回調
        this.setupCallbacks();
        
        // 載入資料
        await this.loadData();
        
        console.log('[PondsChat] Ready');
    },
    
    /**
     * 初始化 DOM 元素
     */
    initElements() {
        this.elements = {
            chatBox: document.getElementById('chatBox'),
            msgInput: document.getElementById('msgInput'),
            sendBtn: document.getElementById('sendBtn'),
            dbQueryBtn: document.getElementById('dbQueryBtn'),
            dbRecordCount: document.getElementById('dbRecordCount'),
            worldviewBox: document.getElementById('worldviewBox'),
            syncStatus: document.getElementById('syncStatus'),
            syncText: document.getElementById('syncText'),
            myPeerId: document.getElementById('myPeerId'),
            settingsModal: document.getElementById('settingsModal'),
            targetP2pId: document.getElementById('targetP2pId'),
            roleAdminBtn: document.getElementById('roleAdminBtn'),
            roleWorkerBtn: document.getElementById('roleWorkerBtn'),
            roleDesc: document.getElementById('roleDesc')
        };
    },
    
    /**
     * 設定 P2P 回調
     */
    setupCallbacks() {
        // 新訊息回調
        P2PEngine.onMessage = (msg) => {
            this.appendMessageToDOM(msg);
        };
        
        // 世界觀更新回調
        P2PEngine.onWorldviewUpdate = (worldview) => {
            this.updateWorldviewDisplay(worldview);
        };
        
        // 同步狀態回調
        P2PEngine.onSyncStatus = (syncing) => {
            this.setSyncStatus(syncing);
        };
    },
    
    /**
     * 載入資料
     */
    async loadData() {
        // 載入訊息
        const messages = await PondsDB.loadMessages();
        for (const msg of messages) {
            this.appendMessageToDOM(msg);
        }
        
        // 載入世界觀
        const worldview = await PondsDB.getWorldview();
        if (worldview) {
            this.updateWorldviewDisplay(worldview);
        }
        
        // 取得記錄數
        const count = await PondsDB.getRecordCount();
        if (this.elements.dbRecordCount) {
            this.elements.dbRecordCount.textContent = count;
        }
    },
    
    /**
     * 產生 ID
     */
    generateId() {
        return 'msg_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    /**
     * 發送訊息
     */
    async sendMessage() {
        if (this.isMeetingEnded) return;
        
        const input = this.elements.msgInput;
        const text = input.value.trim();
        if (!text) return;
        
        // SQL 模式
        if (this.sqlMode) {
            try {
                let mockData;
                if (text.startsWith('{')) {
                    mockData = JSON.parse(text);
                } else {
                    mockData = {
                        id: this.generateId(),
                        sender: 'System/DB',
                        text: text,
                        timestamp: Date.now(),
                        isSystem: true
                    };
                }
                await PondsDB.saveMessage(mockData);
                this.appendMessageToDOM(mockData);
                input.value = '';
            } catch (e) {
                alert('SQL/JSON 解析錯誤');
            }
            return;
        }
        
        const msg = {
            id: this.generateId(),
            sender: this.currentUser.name,
            senderId: this.currentUser.id,
            text: text,
            timestamp: Date.now(),
            isHuman: this.currentUser.role === 'admin'
        };
        
        // 儲存並顯示
        await PondsDB.saveMessage(msg);
        this.appendMessageToDOM(msg);
        input.value = '';
        
        // P2P 廣播
        await P2PEngine.broadcastMessage(msg);
    },
    
    /**
     * 將訊息添加到 DOM
     */
    appendMessageToDOM(msg) {
        const box = this.elements.chatBox;
        if (!box) return;
        
        const isMe = msg.senderId === this.currentUser.id;
        const time = new Date(msg.timestamp).toLocaleTimeString();
        
        let html;
        
        if (msg.isSystem) {
            html = `<div class="text-center text-xs text-slate-500 my-2 code-font message-enter">${msg.text}</div>`;
        } else {
            const bgClass = isMe ? 'bg-cyan-900/40 border-cyan-800' : (msg.isHuman ? 'bg-slate-800 border-slate-700' : 'bg-indigo-900/30 border-indigo-800/50');
            const alignClass = isMe ? 'self-end' : 'self-start';
            const nameColor = isMe ? 'text-cyan-400' : (msg.isHuman ? 'text-white' : 'text-indigo-400');
            
            let contentHTML = msg.text;
            contentHTML = contentHTML.replace('[SYNC_PROPOSAL]', '<span class="text-yellow-400 font-bold">[SYNC_PROPOSAL]</span>');
            contentHTML = contentHTML.replace('[CONSENSUS]', '<span class="text-green-400 font-bold">[CONSENSUS]</span>');
            
            html = `
                <div class="max-w-[80%] ${alignClass} message-enter">
                    <div class="flex items-baseline gap-2 mb-1 ${isMe ? 'justify-end' : ''}">
                        <span class="text-sm font-bold ${nameColor}">${msg.sender}</span>
                        <span class="text-[10px] text-slate-500 code-font">${time}</span>
                    </div>
                    <div class="${bgClass} border rounded-2xl px-4 py-2 text-sm shadow-sm">
                        ${contentHTML}
                    </div>
                </div>
            `;
        }
        
        box.insertAdjacentHTML('beforeend', html);
        box.scrollTop = box.scrollHeight;
        
        // 更新記錄數
        PondsDB.getRecordCount().then(count => {
            if (this.elements.dbRecordCount) {
                this.elements.dbRecordCount.textContent = count;
            }
        });
    },
    
    /**
     * 系統訊息
     */
    systemMessage(text) {
        const msg = {
            id: this.generateId(),
            sender: 'System',
            text: text,
            timestamp: Date.now(),
            isSystem: true
        };
        PondsDB.saveMessage(msg).then(() => this.appendMessageToDOM(msg));
    },
    
    /**
     * 結束會議
     */
    async endMeeting() {
        if (this.isMeetingEnded) return;
        this.isMeetingEnded = true;
        
        // 鎖定 UI
        const input = this.elements.msgInput;
        const sendBtn = this.elements.sendBtn;
        const queryBtn = this.elements.dbQueryBtn;
        
        input.disabled = true;
        sendBtn.disabled = true;
        queryBtn.disabled = true;
        input.classList.add('opacity-50', 'cursor-not-allowed');
        sendBtn.classList.add('opacity-50', 'cursor-not-allowed');
        input.placeholder = '會議已結束，結論已定調，等待執行者處理...';
        
        // 取得結論
        const worldview = await PondsDB.getWorldview('current_task');
        let consensus = '本次會議未產生具體結論。';
        
        if (worldview && worldview.data) {
            consensus = worldview.data;
        }
        
        const finalMsg = `==========================\n[System] 會議已結束 (Meeting Ended)\n\n【最終定調結論】:\n${consensus}\n==========================\n\n結論已定調。節點進入鎖定狀態，無法再進行對話。`;
        this.systemMessage(finalMsg);
        
        // 如果是執行者，發送到 Openclaw Chat
        if (this.currentUser.role === 'worker') {
            setTimeout(() => {
                this.systemMessage(`[Openclaw AI Agent] 我是執行者。已成功將上述結論做為工作執行參考。\n\n-> 正在將結論發送至 [Openclaw Chat] 頻道...\n-> [啟動程序] 正在依照共識分工執行工作中...`);
            }, 1500);
        }
    },
    
    /**
     * 重啟計畫
     */
    async restartPlan(isAutoStart = false) {
        await PondsDB.clearAll();
        
        this.isMeetingEnded = false;
        
        // 解鎖 UI
        const input = this.elements.msgInput;
        const sendBtn = this.elements.sendBtn;
        const queryBtn = this.elements.dbQueryBtn;
        
        input.disabled = false;
        sendBtn.disabled = false;
        queryBtn.disabled = false;
        input.classList.remove('opacity-50', 'cursor-not-allowed');
        sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        input.placeholder = '輸入指令或請求... 所有 Agent 將自動同步討論';
        
        // 清空聊天區（但保留歡迎訊息）
        const box = this.elements.chatBox;
        if (box) {
            box.innerHTML = '<div class="text-center text-slate-500 text-sm my-4">-- P2P Network Established. Database Synced. --</div>';
        }
        
        // 更新記錄數
        if (this.elements.dbRecordCount) {
            this.elements.dbRecordCount.textContent = '0';
        }
        this.updateWorldviewDisplay(null);
        
        const triggerMsg = isAutoStart ? '(由執行者自動串接觸發)' : '';
        this.systemMessage(`[System] 計畫已重啟 ${triggerMsg}。會議室資料已清空，開啟全新目標！請開始輸入任務。`);
    },
    
    /**
     * 切換 SQL 模式
     */
    toggleMode() {
        this.sqlMode = !this.sqlMode;
        const btn = this.elements.dbQueryBtn;
        const input = this.elements.msgInput;
        
        if (this.sqlMode) {
            btn.classList.replace('text-slate-300', 'text-cyan-400');
            btn.classList.add('border-cyan-500');
            input.placeholder = 'SELECT * FROM messages WHERE... (模擬直接寫入資料庫)';
            input.classList.add('code-font');
        } else {
            btn.classList.replace('text-cyan-400', 'text-slate-300');
            btn.classList.remove('border-cyan-500');
            input.placeholder = '輸入指令或請求... 所有 Agent 將自動同步討論';
            input.classList.remove('code-font');
        }
    },
    
    /**
     * 切換設定 Modal
     */
    toggleSettings() {
        const modal = this.elements.settingsModal;
        modal.classList.toggle('hidden');
    },
    
    /**
     * 產生完整的 P2P ID
     * 格式: admin-P2P-0x[16位隨機hex]
     */
    generateP2PId(prefix = 'admin') {
        const randomHex = Array.from({length: 16}, () => Math.floor(Math.random() * 16).toString(16)).join('');
        return `${prefix}-P2P-0x${randomHex}`;
    },
    
    /**
     * 產生角色 ID（短格式）
     */
    generateRoleId(prefix = 'Admin') {
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${prefix}-${random}`;
    },
    
    /**
     * 產生新的角色 ID
     */
    generateNewRoleId() {
        const prefix = this.currentUser.role === 'admin' ? 'Admin' : 'opawclaw';
        const newRoleId = this.generateRoleId(prefix);
        
        // 更新輸入框
        const roleIdInput = document.getElementById('roleIdInput');
        if (roleIdInput) {
            roleIdInput.value = newRoleId;
        }
        
        this.systemMessage(`[System] 已生成新角色 ID: ${newRoleId}`);
    },
    
    /**
     * 複製 P2P ID 到剪貼簿
     */
    copyP2PId() {
        const p2pId = this.currentUser.id;
        if (!p2pId) {
            console.error('複製失敗: P2P ID 為空');
            return;
        }
        navigator.clipboard.writeText(p2pId).then(() => {
            this.systemMessage(`[System] P2P ID 已複製到剪貼簿: ${p2pId}`);
        }).catch(err => {
            console.error('複製失敗:', err);
            // Fallback for non-secure contexts
            const textArea = document.createElement("textarea");
            textArea.value = p2pId;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                this.systemMessage(`[System] P2P ID 已複製到剪貼簿: ${p2pId}`);
            } catch (err) {
                console.error('Fallback copy failed', err);
            }
            document.body.removeChild(textArea);
        });
    },
    
    /**
     * 設定角色
     */
    setRole(role) {
        const adminBtn = this.elements.roleAdminBtn;
        const workerBtn = this.elements.roleWorkerBtn;
        const desc = this.elements.roleDesc;
        const roleIdInput = document.getElementById('roleIdInput');
        
        // 產生對應的前綴
        const prefix = role === 'admin' ? 'Admin' : 'opawclaw';
        const roleId = this.generateRoleId(prefix);
        
        if (role === 'admin') {
            this.currentUser.role = 'admin';
            this.currentUser.name = 'Human Admin';
            // 只有當前 ID 不是以正確前綴開頭時才重新生成，避免每次切換都變
            if (!this.currentUser.id.startsWith('admin-P2P-')) {
                this.currentUser.id = this.generateP2PId('admin');
            }
            
            adminBtn.className = 'flex-1 py-2 rounded-md bg-cyan-600 text-white text-sm font-bold transition-all shadow-md';
            workerBtn.className = 'flex-1 py-2 rounded-md text-slate-400 hover:text-white text-sm font-medium transition-all';
            desc.innerText = '人類管理員擁有最大權限，可發布全域任務與重置會議。';
            
            // 更新角色 ID 輸入框
            if (roleIdInput) {
                roleIdInput.value = roleId;
                roleIdInput.placeholder = 'Admin-XXXX';
            }
        } else {
            this.currentUser.role = 'worker';
            this.currentUser.name = 'Openclaw AI Agent (執行者)';
            // 只有當前 ID 不是以正確前綴開頭時才重新生成
            if (!this.currentUser.id.startsWith('worker-P2P-')) {
                this.currentUser.id = this.generateP2PId('worker');
            }
            
            workerBtn.className = 'flex-1 py-2 rounded-md bg-indigo-600 text-white text-sm font-bold transition-all shadow-md';
            adminBtn.className = 'flex-1 py-2 rounded-md text-slate-400 hover:text-white text-sm font-medium transition-all';
            desc.innerText = '作為執行者，將自動讀取 PondsChat 結論，並發送至 Openclaw Chat 頻道執行工作。';
            
            // 更新角色 ID 輸入框
            if (roleIdInput) {
                roleIdInput.value = roleId;
                roleIdInput.placeholder = 'opawclaw-XXXX';
            }
        }
        
        // 更新 UI 顯示
        if (this.elements.myPeerId) {
            this.elements.myPeerId.innerText = this.currentUser.id;
        }
    },
    
    /**
     * 套用設定
     */
    applySettings() {
        const targetId = this.elements.targetP2pId.value.trim();
        const roleIdInput = document.getElementById('roleIdInput');
        
        // 檢查是否有自定義角色 ID
        if (roleIdInput && roleIdInput.value.trim()) {
            const customRoleId = roleIdInput.value.trim();
            const prefix = this.currentUser.role === 'admin' ? 'Admin' : 'opawclaw';
            
            // 驗證格式並更新 P2P ID
            // 允許自定義格式，但確保生成有效的 P2P ID
            if (customRoleId.length > 0) {
                // 生成新的完整 P2P ID，使用自定義角色 ID 作為前綴
                // 格式: customRoleId-P2P-0x[16hex]
                const randomHex = Array.from({length: 16}, () => Math.floor(Math.random() * 16).toString(16)).join('');
                this.currentUser.id = `${customRoleId}-P2P-0x${randomHex}`;
                this.currentUser.name = customRoleId;
                
                // 更新顯示
                if (this.elements.myPeerId) {
                    this.elements.myPeerId.innerText = this.currentUser.id;
                }
            }
        }
        
        this.toggleSettings();
        
        if (targetId && this.currentUser.role === 'worker') {
            this.systemMessage(`[System] 執行者已成功串接至人類用戶 P2P ID: ${targetId}`);
            P2PEngine.connectNode(targetId);
            
            // 自動啟動重啟計畫
            setTimeout(() => {
                this.restartPlan(true);
            }, 800);
        } else {
            this.systemMessage(`[System] 角色已切換為: ${this.currentUser.role === 'admin' ? '管理者' : '執行者'} (${this.currentUser.name})\nP2P ID: ${this.currentUser.id}`);
        }
    },
    
    /**
     * 設定同步狀態
     */
    setSyncStatus(syncing) {
        const ind = this.elements.syncStatus;
        const txt = this.elements.syncText;
        
        if (syncing) {
            ind.style.backgroundColor = '#fbbf24';
            ind.style.boxShadow = '0 0 8px #fbbf24';
            txt.innerText = 'Syncing Network...';
            txt.classList.add('text-yellow-400');
        } else {
            ind.style.backgroundColor = '#10b981';
            ind.style.boxShadow = '0 0 8px #10b981';
            txt.innerText = 'Data Synced';
            txt.classList.remove('text-yellow-400');
        }
    },
    
    /**
     * 更新世界觀顯示
     */
    updateWorldviewDisplay(worldview) {
        const box = this.elements.worldviewBox;
        if (!box) return;
        
        if (worldview && worldview.data) {
            box.innerText = worldview.data;
        } else {
            box.innerText = '// No consensus data yet.';
        }
    },
    
    /**
     * 匯出資料庫
     */
    async exportDB() {
        const data = await PondsDB.exportAll();
        
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute('href', dataStr);
        downloadAnchorNode.setAttribute('download', 'PondsChat_Backup_' + Date.now() + '.json');
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        
        this.systemMessage('資料庫已成功匯出至本地檔案。');
    },
    
    /**
     * 匯入資料庫
     */
    importDB(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                await PondsDB.importAll(data);
                
                this.systemMessage('資料庫備份已成功匯入覆蓋。');
                
                // 重新載入資料
                this.elements.chatBox.innerHTML = '<div class="text-center text-slate-500 text-sm my-4">-- P2P Network Established. Database Synced. --</div>';
                await this.loadData();
            } catch (err) {
                alert('解析 JSON 失敗: ' + err.message);
            }
        };
        reader.readAsText(file);
        
        // 重置 input
        event.target.value = '';
    }
};

// 全域函數（供 HTML 調用）
function sendMessage() { PondsChat.sendMessage(); }
function endMeeting() { PondsChat.endMeeting(); }
function restartPlan(isAutoStart = false) { PondsChat.restartPlan(isAutoStart); }
function toggleSettings() { PondsChat.toggleSettings(); }
function setRole(role) { PondsChat.setRole(role); }
function applySettings() { PondsChat.applySettings(); }
function toggleMode() { PondsChat.toggleMode(); }
function exportDB() { PondsChat.exportDB(); }
function importDB(event) { PondsChat.importDB(event); }
function copyP2PId() { PondsChat.copyP2PId(); }
function generateNewRoleId() { PondsChat.generateNewRoleId(); }

// 頁面載入後初始化
document.addEventListener('DOMContentLoaded', () => {
    PondsChat.init();
});

// Enter 鍵發送
document.getElementById('msgInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !PondsChat.isMeetingEnded) {
        sendMessage();
    }
});

/**
 * PondsChat - P2P 同步引擎
 * 處理節點連接、訊息廣播、資料庫同步
 */

const P2PEngine = {
    // 設定
    apiUrl: '/php/api.php',
    syncInterval: 3000, // 3 秒同步一次
    syncTimer: null,
    lastTimestamp: 0,
    
    // 連接的節點
    connectedNodes: new Map(),
    
    // 事件回調
    onMessage: null,
    onAgentUpdate: null,
    onWorldviewUpdate: null,
    onSyncStatus: null,
    
    /**
     * 初始化 P2P 引擎
     */
    async init() {
        console.log('[P2P] Initializing P2P Engine...');
        
        // 啟動定時同步
        this.startSync();
        
        // 初始同步
        await this.sync();
        
        console.log('[P2P] P2P Engine ready');
    },
    
    /**
     * 連接到指定節點
     */
    async connectNode(p2pId) {
        console.log(`[P2P] Connecting to node: ${p2pId}`);
        
        this.connectedNodes.set(p2pId, {
            id: p2pId,
            connectedAt: Date.now(),
            lastSeen: Date.now()
        });
        
        // 觸發同步
        await this.sync();
    },
    
    /**
     * 斷開連接
     */
    disconnectNode(p2pId) {
        this.connectedNodes.delete(p2pId);
        console.log(`[P2P] Disconnected from node: ${p2pId}`);
    },
    
    /**
     * 廣播訊息
     */
    async broadcastMessage(message) {
        // 先儲存到本地資料庫
        if (PondsDB) {
            await PondsDB.saveMessage(message);
        }
        
        // 嘗試发送到 PHP API
        try {
            const response = await fetch(`${this.apiUrl}?action=broadcast`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(message)
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('[P2P] Message broadcasted successfully');
                return result;
            } else {
                console.warn('[P2P] Broadcast failed:', result.error);
            }
        } catch (error) {
            console.error('[P2P] Broadcast error:', error);
        }
        
        // 即使 API 失敗，也返回成功（本地儲存成功）
        return { success: true, local: true };
    },
    
    /**
     * 同步資料庫
     */
    async sync() {
        if (this.onSyncStatus) {
            this.onSyncStatus(true);
        }
        
        try {
            // 嘗試從 PHP API 同步
            const response = await fetch(
                `${this.apiUrl}?action=sync&lastTimestamp=${this.lastTimestamp}`
            );
            
            const result = await response.json();
            
            if (result.success) {
                // 處理新訊息
                if (result.messages && result.messages.length > 0) {
                    for (const msg of result.messages) {
                        await this.handleNewMessage(msg);
                    }
                    
                    // 更新最後時間戳
                    const lastMsg = result.messages[result.messages.length - 1];
                    if (lastMsg && lastMsg.timestamp > this.lastTimestamp) {
                        this.lastTimestamp = lastMsg.timestamp;
                    }
                }
                
                // 處理 Agent 更新
                if (result.agents && this.onAgentUpdate) {
                    this.onAgentUpdate(result.agents);
                }
                
                // 處理世界觀更新
                if (result.worldview && this.onWorldviewUpdate) {
                    this.onWorldviewUpdate(result.worldview);
                }
            }
        } catch (error) {
            console.log('[P2P] Sync (offline mode):', error.message);
        }
        
        if (this.onSyncStatus) {
            this.onSyncStatus(false);
        }
    },
    
    /**
     * 處理新訊息
     */
    async handleNewMessage(msg) {
        // 檢查是否已存在
        const messages = await PondsDB.loadMessages();
        const exists = messages.find(m => m.id === msg.id);
        
        if (!exists) {
            await PondsDB.saveMessage(msg);
            
            if (this.onMessage) {
                this.onMessage(msg);
            }
        }
    },
    
    /**
     * 開始定時同步
     */
    startSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }
        
        this.syncTimer = setInterval(() => {
            this.sync();
        }, this.syncInterval);
        
        console.log(`[P2P] Sync started (interval: ${this.syncInterval}ms)`);
    },
    
    /**
     * 停止同步
     */
    stopSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }
    },
    
    /**
     * 註冊 Agent
     */
    async registerAgent(agentData) {
        try {
            const response = await fetch(`${this.apiUrl}?action=register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(agentData)
            });
            
            const result = await response.json();
            
            // 也儲存到本地 IndexedDB
            await PondsDB.saveAgent(agentData);
            
            return result;
        } catch (error) {
            console.error('[P2P] Register error:', error);
            
            // 失敗時儲存到本地
            await PondsDB.saveAgent(agentData);
            
            return { success: true, local: true };
        }
    },
    
    /**
     * 踢除 Agent
     */
    async kickAgent(agentId) {
        try {
            const response = await fetch(
                `${this.apiUrl}?action=kick&agentId=${encodeURIComponent(agentId)}`
            );
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('[P2P] Kick error:', error);
            return { success: false, error: error.message };
        }
    },
    
    /**
     * 更新共識結論
     */
    async updateConsensus(taskData, consensus) {
        try {
            const response = await fetch(`${this.apiUrl}?action=consensus`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    taskData,
                    consensus
                })
            });
            
            const result = await response.json();
            
            // 儲存到本地
            await PondsDB.saveWorldview('current_task', taskData, consensus);
            
            return result;
        } catch (error) {
            console.error('[P2P] Consensus error:', error);
            
            // 失敗時儲存到本地
            await PondsDB.saveWorldview('current_task', taskData, consensus);
            
            return { success: true, local: true };
        }
    },
    
    /**
     * 取得共識結論
     */
    async getConsensus() {
        try {
            const response = await fetch(`${this.apiUrl}?action=consensus`);
            const result = await response.json();
            
            if (result.worldview) {
                return result.worldview;
            }
        } catch (error) {
            console.log('[P2P] Get consensus (offline):', error.message);
        }
        
        // 從本地取得
        return await PondsDB.getWorldview();
    },
    
    /**
     * 發送心跳
     */
    async ping(agentId) {
        try {
            await fetch(
                `${this.apiUrl}?action=ping&agentId=${encodeURIComponent(agentId)}`
            );
        } catch (error) {
            // 忽略錯誤
        }
    },
    
    /**
     * 取得連接狀態
     */
    getStatus() {
        return {
            connectedNodes: this.connectedNodes.size,
            lastSync: this.lastTimestamp,
            isOnline: navigator.onLine
        };
    }
};

// 匯出模組
if (typeof module !== 'undefined' && module.exports) {
    module.exports = P2PEngine;
}

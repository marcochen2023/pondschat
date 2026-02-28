/**
 * PondsChat - IndexedDB 管理模組
 * 提供類似 SQL 的本地資料庫操作
 */

const PondsDB = {
    db: null,
    DB_NAME: 'PondsChatDB',
    DB_VERSION: 2,
    
    // 初始化資料庫
    init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 訊息儲存
                if (!db.objectStoreNames.contains('messages')) {
                    const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
                    msgStore.createIndex('timestamp', 'timestamp', { unique: false });
                    msgStore.createIndex('senderId', 'senderId', { unique: false });
                }
                
                // 世界觀儲存
                if (!db.objectStoreNames.contains('worldview')) {
                    db.createObjectStore('worldview', { keyPath: 'key' });
                }
                
                // Agent 註冊表
                if (!db.objectStoreNames.contains('agents')) {
                    const agentStore = db.createObjectStore('agents', { keyPath: 'id' });
                    agentStore.createIndex('status', 'status', { unique: false });
                }
                
                // 設定儲存
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    },
    
    // 儲存訊息（類似 INSERT）
    saveMessage(msg) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['messages'], 'readwrite');
            const store = transaction.objectStore('messages');
            
            msg.timestamp = msg.timestamp || Date.now();
            const request = store.put(msg);
            
            request.onsuccess = () => resolve(msg);
            request.onerror = () => reject(request.error);
        });
    },
    
    // 載入訊息（類似 SELECT * FROM messages）
    loadMessages(limit = 100) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['messages'], 'readonly');
            const store = transaction.objectStore('messages');
            const index = store.index('timestamp');
            const messages = [];
            
            const request = index.openCursor(null, 'prev'); // 由新到舊
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && messages.length < limit) {
                    messages.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(messages);
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    },
    
    // 儲存世界觀
    saveWorldview(key, data, consensus = '') {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['worldview'], 'readwrite');
            const store = transaction.objectStore('worldview');
            
            const request = store.put({
                key: key,
                data: data,
                consensus: consensus,
                updatedAt: Date.now()
            });
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },
    
    // 取得世界觀
    getWorldview(key = 'current_task') {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['worldview'], 'readonly');
            const store = transaction.objectStore('worldview');
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    
    // 儲存 Agent
    saveAgent(agent) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['agents'], 'readwrite');
            const store = transaction.objectStore('agents');
            const request = store.put(agent);
            
            request.onsuccess = () => resolve(agent);
            request.onerror = () => reject(request.error);
        });
    },
    
    // 取得所有 Agent
    getAgents() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['agents'], 'readonly');
            const store = transaction.objectStore('agents');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    
    // 儲存設定
    saveSetting(key, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.put({ key, value: JSON.stringify(value) });
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },
    
    // 取得設定
    getSetting(key, defaultValue = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get(key);
            
            request.onsuccess = () => {
                if (request.result) {
                    try {
                        resolve(JSON.parse(request.result.value));
                    } catch {
                        resolve(request.result.value);
                    }
                } else {
                    resolve(defaultValue);
                }
            };
            request.onerror = () => reject(request.error);
        });
    },
    
    // 清空資料庫
    clearAll() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['messages', 'worldview'], 'readwrite');
            
            transaction.objectStore('messages').clear();
            transaction.objectStore('worldview').clear();
            
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    },
    
    // 匯出資料庫（類似 SELECT *）
    exportAll() {
        return new Promise(async (resolve, reject) => {
            const messages = await this.loadMessages(10000);
            const worldview = await this.getWorldview();
            const agents = await this.getAgents();
            
            resolve({
                messages,
                worldview,
                agents,
                exportedAt: Date.now()
            });
        });
    },
    
    // 匯入資料庫
    importAll(data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(
                ['messages', 'worldview', 'agents'], 
                'readwrite'
            );
            
            // 清空現有資料
            transaction.objectStore('messages').clear();
            transaction.objectStore('worldview').clear();
            transaction.objectStore('agents').clear();
            
            transaction.oncomplete = async () => {
                // 匯入新資料
                if (data.messages) {
                    const msgTrans = this.db.transaction(['messages'], 'readwrite');
                    const msgStore = msgTrans.objectStore('messages');
                    for (const msg of data.messages) {
                        msgStore.put(msg);
                    }
                }
                
                if (data.agents) {
                    const agentTrans = this.db.transaction(['agents'], 'readwrite');
                    const agentStore = agentTrans.objectStore('agents');
                    for (const agent of data.agents) {
                        agentStore.put(agent);
                    }
                }
                
                resolve();
            };
            
            transaction.onerror = () => reject(transaction.error);
        });
    },
    
    // 取得記錄數
    getRecordCount() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['messages'], 'readonly');
            const store = transaction.objectStore('messages');
            const request = store.count();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
};

// 匯出模組
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PondsDB;
}

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getBotSettings: () => ipcRenderer.invoke('getBotSettings'),
    toggleModule: (moduleName, enabled) => ipcRenderer.invoke('toggleModule', { moduleName, enabled }),
    getModuleData: (moduleName) => ipcRenderer.invoke('get-module-data', moduleName),
    saveModuleData: (moduleName, data) => ipcRenderer.invoke('save-module-data', { moduleName, data }),
    reinjectScripts: () => ipcRenderer.invoke('reinject-scripts'),
    saveShieldUIDs: (uids) => ipcRenderer.invoke('save-shield-uids', uids),
    getShieldUIDs: () => ipcRenderer.invoke('get-shield-uids'),
    getStorage: (key) => ipcRenderer.invoke('get-storage', key),
    setStorage: (key, value) => ipcRenderer.invoke('set-storage', { key, value }),
    startAutoLogin: (targetUid) => ipcRenderer.invoke('start-auto-login', targetUid),
    
    onLogUpdated: (callback) => ipcRenderer.on('logUpdated', (event, data) => callback(data)),
    onBotStatusChanged: (callback) => ipcRenderer.on('bot-status-changed', (event, data) => callback(data)),
    onChatCountUpdated: (callback) => ipcRenderer.on('chatCountUpdated', (event, data) => callback(data)),
    onModuleToggled: (callback) => ipcRenderer.on('module-toggled', (event, data) => callback(data)),
    onModuleDataUpdated: (callback) => ipcRenderer.on('module-data-updated', (event, data) => callback(data))
});

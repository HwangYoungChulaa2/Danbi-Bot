const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

const store = new Store();
let mainWindow;
let spoonWindow;

app.whenReady().then(() => {
    createWindow();
    createSpoonWindow();
    setupIpcHandlers();
    
    // 앱 실행 시 자동 업데이트 확인
    autoUpdater.checkForUpdatesAndNotify();
});

// 자동 업데이트 이벤트 처리
autoUpdater.on('update-available', () => {
    console.log('📢 업데이트가 발견되었습니다.');
});

autoUpdater.on('update-downloaded', (info) => {
    dialog.showMessageBox({
        type: 'info',
        title: '업데이트 완료',
        message: `새로운 버전(${info.version})이 다운로드되었습니다. 앱을 재시작하여 업데이트를 적용하시겠습니까?`,
        buttons: ['재시작', '나중에']
    }).then((result) => {
        if (result.response === 0) {
            autoUpdater.quitAndInstall();
        }
    });
});

autoUpdater.on('error', (err) => {
    console.error('❌ 업데이트 오류:', err);
});

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 500,
        height: 900,
        x: 0,
        y: 0,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });

    mainWindow.loadFile('index.html');
    // mainWindow.webContents.openDevTools(); // 개발자 도구 비활성화 확인

    mainWindow.webContents.on('did-finish-load', () => {
        console.log('✅ 메인 창 로드 완료');
    });
}

function createSpoonWindow() {
    spoonWindow = new BrowserWindow({
        width: 1200,
        height: 900,
        x: 500,
        y: 0,
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true,
            webSecurity: false,
            sandbox: false
        }
    });

    spoonWindow.loadURL('https://www.spooncast.net');
    // spoonWindow.webContents.openDevTools(); // 개발자 도구 비활성화 확인

    spoonWindow.webContents.on('did-finish-load', async () => {
        console.log('✅ 스푼라디오 페이지 로드 완료');
        setTimeout(async () => {
            await injectScripts();
        }, 3000);
    });

    spoonWindow.webContents.on('did-navigate', async (event, url) => {
        console.log('📍 페이지 이동:', url);
        if (url.includes('/live/')) {
            console.log('🎵 방송 페이지 감지 - 스크립트 재주입');
            setTimeout(async () => {
                await injectScripts();
            }, 5000);
        }
    });
}

async function injectScripts() {
    if (!spoonWindow) return;
    await injectModules();
}

async function injectModules() {
    const scripts = [
        'engine/utils.js',
        'engine/modules/shieldBot.js',
        'engine/modules/fundingBot.js',
        'engine/modules/repeatBot.js',
        'engine/modules/customCommandBot.js',
        'engine/modules/fishingBot.js',
        'engine/modules/rouletteBot.js',
        'engine/content.js'
    ];
    
    console.log('🚀 스크립트 통합 주입 시작...');
    try {
        let combinedCode = '';
        for (const scriptPath of scripts) {
            const fullPath = path.join(__dirname, scriptPath);
            if (fs.existsSync(fullPath)) {
                combinedCode += fs.readFileSync(fullPath, 'utf8') + '\n\n';
            }
        }
        
        if (combinedCode) {
            const finalCode = `(function() { 
                try { 
                    ${combinedCode} 
                    console.log('🤖 봇 엔진 및 모든 모듈 로드 완료');
                } catch(e) { 
                    console.error('❌ 봇 엔진 실행 중 오류:', e); 
                }
            })();`;
            
            await spoonWindow.webContents.executeJavaScript(finalCode);
            console.log('✅ 모든 스크립트 통합 주입 성공');
            
            setTimeout(() => {
                restoreModuleSettings();
            }, 1000);
        }
    } catch (error) {
        console.error('❌ 스크립트 주입 실패:', error);
    }
}

function restoreModuleSettings() {
    const settings = store.get('botSettings', { modules: {} });
    
    const syncModuleData = (moduleName) => {
        let key = '';
        switch(moduleName) {
            case 'shieldBot': key = 'shieldAmount'; break;
            case 'fundingBot': key = 'fundings'; break;
            case 'repeatBot': key = 'repeatMessages'; break;
            case 'customCommandBot': key = 'customCommands'; break;
            case 'fishingBot': key = 'fishingData'; break;
            case 'rouletteBot': key = 'rouletteData'; break;
        }
        
        if (key) {
            const data = store.get(key);
            if (data !== undefined) {
                let jsCode = '';
                if (moduleName === 'shieldBot') {
                    jsCode = `if(window.BotModules && window.BotModules.shieldBot) { window.BotModules.shieldBot.shieldAmount = ${data}; }`;
                    // 고유 ID(UID) 목록도 함께 동기화
                    const uids = store.get('shieldUIDs');
                    if (uids !== undefined) {
                        const uidsCode = `if(window.BotModules && window.BotModules.shieldBot) { window.BotModules.shieldBot.authorizedUIDs = ${JSON.stringify(uids)}; }`;
                        spoonWindow.webContents.executeJavaScript(uidsCode).catch(e => {});
                    }
                } else if (moduleName === 'fundingBot') {
                    jsCode = `if(window.BotModules && window.BotModules.fundingBot) { window.BotModules.fundingBot.fundings = ${JSON.stringify(data)}; }`;
                } else if (moduleName === 'repeatBot') {
                    jsCode = `if(window.BotModules && window.BotModules.repeatBot) { 
                        const d = ${JSON.stringify(data)};
                        window.BotModules.repeatBot.messages = d.messages || [];
                        window.BotModules.repeatBot.outputMode = d.outputMode || 'sequential';
                        window.BotModules.repeatBot.intervalSeconds = d.intervalSeconds || 60;
                    }`;
                } else if (moduleName === 'customCommandBot') {
                    jsCode = `if(window.BotModules && window.BotModules.customCommandBot) { window.BotModules.customCommandBot.commands = ${JSON.stringify(data)}; }`;
                } else if (moduleName === 'fishingBot') {
                    jsCode = `if(window.BotModules && window.BotModules.fishingBot) { window.BotModules.fishingBot.state = ${JSON.stringify(data)}; }`;
                } else if (moduleName === 'rouletteBot') {
                    jsCode = `if(window.BotModules && window.BotModules.rouletteBot) { window.BotModules.rouletteBot.data = ${JSON.stringify(data)}; }`;
                }
                if (jsCode) spoonWindow.webContents.executeJavaScript(jsCode).catch(e => {});
            }
        }
    };

    Object.keys(settings.modules).forEach(moduleName => {
        syncModuleData(moduleName);
        if (settings.modules[moduleName]) {
            spoonWindow.webContents.executeJavaScript(`
                if (window.BotModules && window.BotModules.${moduleName}) {
                    window.BotModules.${moduleName}.enabled = true;
                }
            `).catch(err => {});
        }
    });

    if (mainWindow) {
        mainWindow.webContents.send('bot-status-changed', { active: true });
    }
}

function setupIpcHandlers() {
    ipcMain.handle('getBotSettings', async () => {
        return store.get('botSettings', { enabled: false, modules: {} });
    });

    ipcMain.handle('setBotSetting', async (event, { key, value }) => {
        store.set(`botSettings.${key}`, value);
        return { success: true };
    });

    ipcMain.handle('toggleModule', async (event, { moduleName, enabled }) => {
        store.set(`botSettings.modules.${moduleName}`, enabled);
        if (spoonWindow) {
            spoonWindow.webContents.executeJavaScript(`
                if (window.BotModules && window.BotModules.${moduleName}) {
                    window.BotModules.${moduleName}.enabled = ${enabled};
                }
            `).catch(err => {});
        }
        if (mainWindow) {
            mainWindow.webContents.send('module-toggled', { moduleName, enabled });
        }
        return { success: true };
    });

    ipcMain.handle('get-storage', (event, key) => {
        return store.get(key);
    });

    ipcMain.handle('set-storage', (event, { key, value }) => {
        store.set(key, value);
        return { success: true };
    });

    ipcMain.on('log-event', (event, logData) => {
        if (mainWindow) {
            mainWindow.webContents.send('logUpdated', logData);
        }
    });

    ipcMain.on('chat-index-updated', (event, maxIndex) => {
        if (mainWindow) {
            mainWindow.webContents.send('chatCountUpdated', maxIndex);
        }
    });

    ipcMain.on('bot-status-update', (event, status) => {
        if (mainWindow) {
            mainWindow.webContents.send('bot-status-changed', status);
        }
    });

    ipcMain.handle('reinject-scripts', async () => {
        injectScripts();
        return { success: true };
    });



    ipcMain.handle('get-module-data', async (event, moduleName) => {
        let key = '';
        switch(moduleName) {
            case 'shieldBot': key = 'shieldAmount'; break;
            case 'fundingBot': key = 'fundings'; break;
            case 'repeatBot': key = 'repeatMessages'; break;
            case 'customCommandBot': key = 'customCommands'; break;
            case 'fishingBot': key = 'fishingData'; break;
            case 'rouletteBot': key = 'rouletteData'; break;
        }
        return key ? store.get(key) : null;
    });

    ipcMain.on('hide-spoon-window', () => {
        if (spoonWindow) {
            spoonWindow.hide();
            if (mainWindow) {
                mainWindow.webContents.send('logUpdated', { level: 'info', message: '✅ 채팅 감지 완료: 스푼 창을 숨겼습니다.' });
            }
        }
    });

    ipcMain.handle('save-shield-uids', async (event, uids) => {
        try {
            store.set('shieldUIDs', uids);
            if (spoonWindow) {
                const jsCode = `if(window.BotModules && window.BotModules.shieldBot) { window.BotModules.shieldBot.authorizedUIDs = ${JSON.stringify(uids)}; }`;
                await spoonWindow.webContents.executeJavaScript(jsCode);
            }
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('get-shield-uids', async () => {
        return store.get('shieldUIDs', []);
    });

    ipcMain.handle('save-module-data', async (event, { moduleName, data }) => {
        try {
            let key = '';
            switch(moduleName) {
                case 'shieldBot': key = 'shieldAmount'; break;
                case 'fundingBot': key = 'fundings'; break;
                case 'repeatBot': key = 'repeatMessages'; break;
                case 'customCommandBot': key = 'customCommands'; break;
                case 'fishingBot': key = 'fishingData'; break;
                case 'rouletteBot': key = 'rouletteData'; break;
            }
            
            if (key) {
                store.set(key, data);
                
                // 메인 창에 데이터 업데이트 알림 (유저 관리 목록 실시간 갱신용)
                if (mainWindow) {
                    mainWindow.webContents.send('module-data-updated', { moduleName, data });
                }

                if (spoonWindow) {
                    let jsCode = '';
                    if (moduleName === 'shieldBot') {
                        jsCode = `if(window.BotModules && window.BotModules.shieldBot) { window.BotModules.shieldBot.shieldAmount = ${data}; }`;
                    } else if (moduleName === 'fundingBot') {
                        jsCode = `if(window.BotModules && window.BotModules.fundingBot) { window.BotModules.fundingBot.fundings = ${JSON.stringify(data)}; }`;
                    } else if (moduleName === 'repeatBot') {
                        jsCode = `if(window.BotModules && window.BotModules.repeatBot) { 
                            const d = ${JSON.stringify(data)};
                            window.BotModules.repeatBot.messages = d.messages || [];
                            window.BotModules.repeatBot.outputMode = d.outputMode || 'sequential';
                            window.BotModules.repeatBot.intervalSeconds = d.intervalSeconds || 60;
                            if(window.BotModules.repeatBot.enabled) {
                                window.BotModules.repeatBot.stopRepeat();
                                window.BotModules.repeatBot.startRepeat();
                            }
                        }`;
                    } else if (moduleName === 'customCommandBot') {
                        jsCode = `if(window.BotModules && window.BotModules.customCommandBot) { window.BotModules.customCommandBot.commands = ${JSON.stringify(data)}; }`;
                    } else if (moduleName === 'fishingBot') {
                        jsCode = `if(window.BotModules && window.BotModules.fishingBot) { window.BotModules.fishingBot.state = ${JSON.stringify(data)}; }`;
                    } else if (moduleName === 'rouletteBot') {
                        jsCode = `if(window.BotModules && window.BotModules.rouletteBot) { window.BotModules.rouletteBot.data = ${JSON.stringify(data)}; }`;
                    }
                    if (jsCode) await spoonWindow.webContents.executeJavaScript(jsCode);
                }
                return { success: true };
            }
            return { success: false, error: 'Unknown module' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // 모듈 데이터 업데이트 알림 (rouletteBot.js 등에서 실시간 UI 갱신을 위해 호출)
    ipcMain.on('module-data-updated', (event, payload) => {
        if (mainWindow) {
            // 메인 설정 창으로 데이터 전달
            mainWindow.webContents.send('module-data-updated', payload);
        }
    });
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

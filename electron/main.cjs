const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { LoLMonitor } = require('./lol-monitor.cjs');

/** @type {BrowserWindow|null} */
let mainWindow = null;

/** @type {LoLMonitor|null} */
let lolMonitor = null;

/** @type {{ target: 'douyin'|'bilibili'|'both', pollInterval: number, delaySeconds: number }} */
let config = {
  target: 'douyin',
  pollInterval: 3000,
  delaySeconds: 2,
};

/**
 * 创建主窗口
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 640,
    minWidth: 400,
    minHeight: 500,
    title: 'LoL Death Switch',
    // icon: path.join(__dirname, '..', 'assets', 'icon.ico'), // 需要实际.ico文件
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#010A13',
    autoHideMenuBar: true,
    resizable: true,
  });

  // 开发模式加载Vite服务器，生产模式加载构建产物
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * 根据配置获取跳转URL列表
 * @returns {string[]}
 */
function getTargetUrls() {
  const urls = [];
  if (config.target === 'douyin' || config.target === 'both') {
    urls.push('https://www.douyin.com');
  }
  if (config.target === 'bilibili' || config.target === 'both') {
    urls.push('https://www.bilibili.com');
  }
  return urls;
}

/**
 * 初始化IPC通信
 */
function setupIPC() {
  // 启动监控
  ipcMain.handle('start-monitor', () => {
    if (lolMonitor) {
      lolMonitor.stop();
    }
    lolMonitor = new LoLMonitor(config.pollInterval);
    lolMonitor.start();

    // 监听状态更新事件
    lolMonitor.on('status-update', (status) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('status-update', status);
      }
    });

    // 监听阵亡事件
    lolMonitor.on('death-event', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('death-event', {
          timestamp: Date.now(),
          deathCount: lolMonitor.getDeathCount(),
        });
      }

      // 延迟跳转浏览器
      const urls = getTargetUrls();
      if (urls.length > 0) {
        setTimeout(() => {
          urls.forEach((url) => {
            shell.openExternal(url);
          });
        }, config.delaySeconds * 1000);
      }
    });

    return { success: true };
  });

  // 停止监控
  ipcMain.handle('stop-monitor', () => {
    if (lolMonitor) {
      lolMonitor.stop();
      lolMonitor = null;
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('status-update', {
        state: 'idle',
        message: '监控已停止',
      });
    }
    return { success: true };
  });

  // 获取配置
  ipcMain.handle('get-config', () => {
    return config;
  });

  // 设置配置
  ipcMain.handle('set-config', (event, newConfig) => {
    config = {
      ...config,
      ...newConfig,
    };

    // 如果监控正在运行，更新轮询间隔
    if (lolMonitor) {
      lolMonitor.setPollInterval(config.pollInterval);
    }

    return config;
  });

  // 获取当前阵亡计数
  ipcMain.handle('get-death-count', () => {
    if (lolMonitor) {
      return lolMonitor.getDeathCount();
    }
    return 0;
  });
}

// Electron应用生命周期
app.whenReady().then(() => {
  setupIPC();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // 停止监控
    if (lolMonitor) {
      lolMonitor.stop();
      lolMonitor = null;
    }
    app.quit();
  }
});

app.on('before-quit', () => {
  if (lolMonitor) {
    lolMonitor.stop();
    lolMonitor = null;
  }
});

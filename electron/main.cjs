const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec, execSync } = require('child_process');
const { LoLMonitor } = require('./lol-monitor.cjs');

/** @type {BrowserWindow|null} */
let mainWindow = null;

/** @type {LoLMonitor|null} */
let lolMonitor = null;

/** @type {{ target: 'douyin'|'bilibili'|'both', pollInterval: number, delaySeconds: number }} */
let config = {
  target: 'douyin',
  pollInterval: 1000,   // 内部轮询间隔，UI不再暴露
  delaySeconds: 0,
};

// ========== 持久化统计 ==========

/** @type {{ totalDeaths: number, totalAfkMs: number }} */
let stats = { totalDeaths: 0, totalAfkMs: 0 };

/** @type {number|null} 本次阵亡的AFK起始时间戳 */
let afkStartTime = null;

/** @type {string|null} 阵亡时记录的前台窗口句柄（十进制字符串），复活时用于切回 */
let savedGameHwnd = null;

/**
 * 获取统计文件路径（%APPDATA%/lol-death-switch/stats.json）
 */
function getStatsPath() {
  return path.join(app.getPath('userData'), 'stats.json');
}

function loadStats() {
  try {
    const raw = fs.readFileSync(getStatsPath(), 'utf-8');
    const parsed = JSON.parse(raw);
    stats.totalDeaths = parsed.totalDeaths || 0;
    stats.totalAfkMs = parsed.totalAfkMs || 0;
  } catch {
    // 文件不存在或格式损坏，使用默认值
  }
}

function saveStats() {
  try {
    const dir = path.dirname(getStatsPath());
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(getStatsPath(), JSON.stringify(stats, null, 2));
  } catch (err) {
    console.error('Failed to save stats:', err.message);
  }
}

/** 推送统计更新到渲染进程 */
function sendStatsUpdate() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('stats-update', { ...stats });
  }
}

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

// ========== 前台窗口保存/复原（阵亡→自动切出 → 复活→自动切回） ==========

/**
 * C# 辅助类：LoL窗口诊断 + 精确定位对局客户端 + 窗口复原
 *
 * 核心逻辑：
 * - LoL 有两个窗口："LeagueClient.exe"(大厅) 和 "League of Legends.exe"(对局)
 * - 阵亡时不能简单抓前台窗口（死亡回放可能属于大厅进程），
 *   必须通过进程名 "League of Legends" 精确定位对局窗口
 * - Diag() 输出当前前台窗口的诊断信息，用于排查问题
 * - FindGame() 枚举进程找到对局窗口句柄
 */
const LOL_SAVE_RESTORE_PS = `
Add-Type -TypeDefinition @'
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
public class LolRecover {
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] static extern void SwitchToThisWindow(IntPtr hWnd, bool fAltTab);
  [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

  const int SW_SHOW = 5;
  const int SW_RESTORE = 9;

  // 诊断：返回指定窗口的标题+进程名。格式 "TITLE|PROCNAME"（无管道符即空标题）
  public static string Diag(long hwnd) {
    if (hwnd == 0) return "hwnd=0";
    var h = new IntPtr(hwnd);
    var sb = new StringBuilder(256);
    GetWindowText(h, sb, 256);
    string title = sb.ToString();
    uint pid;
    GetWindowThreadProcessId(h, out pid);
    string proc = "";
    try { proc = Process.GetProcessById((int)pid).ProcessName; } catch { proc = "?"; }
    return "hwnd=" + hwnd + " title=\\"" + title + "\\" proc=" + proc;
  }

  // 诊断当前前台窗口
  public static string DiagFg() { return Diag(GetForegroundWindow().ToInt64()); }

  // 获取当前前台窗口句柄（兜底用）
  public static long SaveFg() { return GetForegroundWindow().ToInt64(); }

  // 精确查找对局客户端窗口：按进程名 "League of Legends" 搜索
  // 排除大厅进程 LeagueClient / LeagueClientUx / RiotClientServices
  public static long FindGame() {
    try {
      var procs = Process.GetProcessesByName("League of Legends");
      foreach (var p in procs) {
        try {
          var h = p.MainWindowHandle;
          if (h == IntPtr.Zero) continue;
          var sb = new StringBuilder(256);
          GetWindowText(h, sb, 256);
          if (sb.Length > 0) return h.ToInt64();
        } catch {}
      }
    } catch {}
    return 0;
  }

  // 用保存的句柄切回。先 ShowWindow 再 SwitchToThisWindow。
  public static void Restore(long hwnd) {
    if (hwnd == 0) return;
    var h = new IntPtr(hwnd);
    ShowWindow(h, SW_RESTORE);
    ShowWindow(h, SW_SHOW);
    SetForegroundWindow(h);
    SwitchToThisWindow(h, false);
  }
}
'@
`.replace(/\n/g, ' ').replace(/\s\s+/g, ' ').trim();

/**
 * 执行 PowerShell 脚本并返回 stdout
 */
function runPS(script, timeout = 5000) {
  const cmd = `powershell -NoProfile -EncodedCommand ${Buffer.from(script, 'utf16le').toString('base64')}`;
  return execSync(cmd, { encoding: 'utf-8', timeout }).trim();
}

function runPSAsync(script, callback) {
  const cmd = `powershell -NoProfile -EncodedCommand ${Buffer.from(script, 'utf16le').toString('base64')}`;
  exec(cmd, (err, stdout, stderr) => {
    if (callback) callback(err, stdout ? stdout.trim() : '', stderr ? stderr.trim() : '');
  });
}

/**
 * 阵亡时：保存对局客户端窗口句柄
 *
 * 策略（按优先级）：
 * 1. 通过进程名 "League of Legends" 查找对局窗口（最可靠）
 * 2. 回退到当前前台窗口（如果游戏恰好在前台）
 * 3. 都失败则清空句柄，复活时走最小化兜底
 *
 * 每步都有日志输出，便于定位问题。
 */
function saveGameWindow() {
  try {
    // ★ 诊断日志：当前前台窗口是什么？
    const diag = runPS(LOL_SAVE_RESTORE_PS + ' [LolRecover]::DiagFg()');
    console.log('[saveGameWindow] 当前前台窗口:', diag);

    // ★ 主策略：按进程名查找对局客户端
    const gameHwnd = runPS(LOL_SAVE_RESTORE_PS + ' [LolRecover]::FindGame()');
    if (gameHwnd && gameHwnd !== '0') {
      savedGameHwnd = gameHwnd;
      const gameDiag = runPS(LOL_SAVE_RESTORE_PS + ` [LolRecover]::Diag(${gameHwnd})`);
      console.log('[saveGameWindow] ✓ 通过进程名找到对局窗口:', gameDiag);
      return;
    }

    // ★ 回退：前台窗口
    const fgHwnd = runPS(LOL_SAVE_RESTORE_PS + ' [LolRecover]::SaveFg()');
    if (fgHwnd && fgHwnd !== '0') {
      savedGameHwnd = fgHwnd;
      console.log('[saveGameWindow] ⚠ 未找到对局进程，回退到前台窗口: hwnd=' + fgHwnd);
      return;
    }

    console.log('[saveGameWindow] ✗ 无法获取任何窗口句柄');
    savedGameHwnd = null;
  } catch (err) {
    console.error('[saveGameWindow] 异常:', err.message);
    savedGameHwnd = null;
  }
}

/**
 * 复活时：用保存的句柄切回游戏窗口。
 * 兜底：如果句柄丢失则最小化 Electron 窗口，让游戏自然回到前台。
 */
function restoreGameWindow() {
  if (!savedGameHwnd) {
    console.log('[restoreGameWindow] 无保存句柄，最小化本窗口');
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isMinimized()) {
      mainWindow.minimize();
    }
    return;
  }

  const hwnd = savedGameHwnd;
  console.log('[restoreGameWindow] 即将切回窗口:', hwnd);

  runPSAsync(LOL_SAVE_RESTORE_PS + ` [LolRecover]::Restore(${hwnd})`, (err) => {
    if (err) {
      console.error('[restoreGameWindow] 切回失败:', err.message);
      // 兜底：最小化本窗口
      if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isMinimized()) {
        mainWindow.minimize();
      }
    } else {
      console.log('[restoreGameWindow] ✓ 已切回窗口:', hwnd);
    }
  });

  // 清掉句柄，下次阵亡重新获取
  savedGameHwnd = null;
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
      // ★ 先保存对局窗口句柄（必须在浏览器抢焦点之前）
      saveGameWindow();

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('death-event', {
          timestamp: Date.now(),
          deathCount: lolMonitor.getDeathCount(),
        });
      }

      // 更新持久化统计：累计阵亡 +1，记录AFK起始时间
      stats.totalDeaths += 1;
      afkStartTime = Date.now();
      saveStats();
      sendStatsUpdate();

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

    // 监听复活事件 — 自动切回LoL窗口 + 统计摸鱼时间
    lolMonitor.on('revive-event', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('revive-event', {
          timestamp: Date.now(),
        });
      }

      // 计算本次AFK时长并累加
      if (afkStartTime) {
        const afkDuration = Date.now() - afkStartTime;
        stats.totalAfkMs += afkDuration;
        afkStartTime = null;
        saveStats();
        sendStatsUpdate();
      }

      // ★ 用阵亡时保存的句柄切回游戏窗口
      restoreGameWindow();
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

  // 获取持久化统计
  ipcMain.handle('get-stats', () => {
    return { ...stats };
  });

  // 重置持久化统计
  ipcMain.handle('reset-stats', () => {
    stats = { totalDeaths: 0, totalAfkMs: 0 };
    afkStartTime = null;
    saveStats();
    sendStatsUpdate();
    return { ...stats };
  });
}

// Electron应用生命周期
app.whenReady().then(() => {
  loadStats();
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
  // 如果退出时玩家还在阵亡中，将未完成的AFK时间计入统计
  if (afkStartTime) {
    const afkDuration = Date.now() - afkStartTime;
    stats.totalAfkMs += afkDuration;
    afkStartTime = null;
    saveStats();
  }
  if (lolMonitor) {
    lolMonitor.stop();
    lolMonitor = null;
  }
});

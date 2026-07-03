const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec, execSync } = require('child_process');
const { LoLMonitor } = require('./lol-monitor.cjs');

/** @type {BrowserWindow|null} */
let mainWindow = null;

/** @type {LoLMonitor|null} */
let lolMonitor = null;

/** @type {Tray|null} */
let tray = null;

/** 是否正在退出（用于区分"彻底关闭"和"隐藏到托盘"） */
let isQuitting = false;

/** @type {{ target: string, pollInterval: number, delaySeconds: number }} */
let config = {
  target: 'https://www.douyin.com/?recommend=1',
  pollInterval: 1000,   // 内部轮询间隔，UI不再暴露
  delaySeconds: 0,
};

// ========== 本地日志文件 ==========

/** @type {string|null} 当前会话的日志文件路径 */
let logFilePath = null;

/**
 * 初始化日志文件
 * 路径: %APPDATA%/lol-death-switch/logs/YYYY-MM-DD_HH-MM-SS.log
 */
function initLogger() {
  const logDir = path.join(app.getPath('userData'), 'logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

  const now = new Date();
  const ts = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}-${String(now.getSeconds()).padStart(2,'0')}`;
  logFilePath = path.join(logDir, `${ts}.log`);

  fs.writeFileSync(logFilePath, `=== LoL Death Switch 日志开始 === ${now.toISOString()}\n`);
  console.log('[Logger] 日志文件:', logFilePath);
}

/**
 * 写日志（同时输出到控制台和文件）
 * @param {string} level - DEBUG / INFO / WARN / ERROR
 * @param {string} message
 */
function log(level, message) {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level}] ${message}`;

  // 控制台输出
  switch (level) {
    case 'ERROR': console.error(line); break;
    case 'WARN':  console.warn(line);  break;
    default:      console.log(line);
  }

  // 文件输出
  if (logFilePath) {
    try { fs.appendFileSync(logFilePath, line + '\n'); } catch {}
  }
}

// ========== 持久化统计 ==========

/** @type {{ totalDeaths: number, totalAfkMs: number }} */
let stats = { totalDeaths: 0, totalAfkMs: 0 };

/** @type {number|null} 本次阵亡的AFK起始时间戳 */
let afkStartTime = null;

/** @type {string|null} 阵亡时记录的前台窗口句柄（十进制字符串），复活时用于切回 */
let savedGameHwnd = null;

/** 内嵌视频窗口（Electron BrowserWindow，天然支持 executeJavaScript 控制视频） */
let videoWindow = null;

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

// ========== 自定义URL持久化 ==========

/** @type {{label: string, url: string}[]} 用户自定义的跳转目标列表 */
let customUrls = [];

/**
 * 获取自定义URL存储路径
 */
function getCustomUrlsPath() {
  return path.join(app.getPath('userData'), 'custom-urls.json');
}

function loadCustomUrls() {
  try {
    const raw = fs.readFileSync(getCustomUrlsPath(), 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // 兼容旧格式 string[] → 自动转换为 {label, url}[]
      customUrls = parsed.map((item) => {
        if (typeof item === 'string') return { label: item, url: item };
        if (item && typeof item.url === 'string') {
          return { label: item.label || item.url, url: item.url };
        }
        return null;
      }).filter(Boolean);
      // 保存迁移后的新格式
      if (parsed.length > 0 && typeof parsed[0] === 'string') {
        saveCustomUrls();
      }
    } else {
      customUrls = [];
    }
  } catch {
    customUrls = [];
  }
}

function saveCustomUrls() {
  try {
    const dir = path.dirname(getCustomUrlsPath());
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(getCustomUrlsPath(), JSON.stringify(customUrls, null, 2));
  } catch (err) {
    log('ERROR', '[saveCustomUrls] 保存失败: ' + err.message);
  }
}

/** 推送统计更新到渲染进程 */
function sendStatsUpdate() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('stats-update', { ...stats });
  }
}

// ========== 内嵌视频窗口（Electron BrowserWindow） ==========

/**
 * 创建内嵌视频窗口
 * 使用 Electron 自带 Chromium，webContents.executeJavaScript() = 天然 CDP
 * @param {string} url
 */
function createVideoWindow(url) {
  if (videoWindow && !videoWindow.isDestroyed()) {
    videoWindow.loadURL(url);
    return;
  }
  videoWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    title: '摸鱼中...',
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    show: false, // 先隐藏，等 ready-to-show 再显示，避免白屏闪烁
  });
  // 伪装成常规 Chrome 浏览器，避免抖音弹出"获取应用"
  videoWindow.webContents.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  );
  videoWindow.loadURL(url);

  // 阻止自定义协议跳转（bitbrowser:// / snssdk:// 等）→ Windows 弹"无可用应用"对话框
  videoWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('devtools://')) {
      event.preventDefault();
      log('INFO', '[videoWin] 阻止协议跳转: ' + url);
    }
  });
  videoWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // 页面加载完成后清除覆盖层（防止延迟弹窗）
  videoWindow.webContents.on('did-finish-load', () => {
    dismissOverlays();
  });
  videoWindow.once('ready-to-show', () => {
    videoWindow.maximize();
    showVideoWindow();
  });
  videoWindow.on('closed', () => { videoWindow = null; });
  log('INFO', '[videoWin] 创建视频窗口: ' + url);
}

/** 暂停视频窗口中所有视频（幂等） */
async function pauseVideo() {
  if (!videoWindow || videoWindow.isDestroyed()) return;
  try {
    await videoWindow.webContents.executeJavaScript(
      'document.querySelectorAll("video").forEach(function(v){if(!v.paused)v.pause()})'
    );
  } catch {}
}

/** 解除视频播放器覆盖层（XG-START、"点击播放"等） */
async function dismissOverlays() {
  if (!videoWindow || videoWindow.isDestroyed()) return;
  try {
    await videoWindow.webContents.executeJavaScript(
      '(function(){' +
      // 西瓜播放器: 点击 "播放" 覆盖层
      'var xgStart=document.querySelector("xg-start");if(xgStart)xgStart.click();' +
      // 通用: 点击视频容器区域解除用户手势限制
      'var v=document.querySelector("video");if(v)v.click();' +
      // 抖音: 关闭可能的"获取应用"弹窗
      'var modals=document.querySelectorAll("[class*=\\"guide\\"],[class*=\\"Guide\\"],[class*=\\"open-app\\"],[class*=\\"get-app\\"],[class*=\\"download-app\\"]");' +
      'modals.forEach(function(m){if(m.querySelector&&m.querySelector("[class*=\\"close\\"]"))m.querySelector("[class*=\\"close\\"]").click();});' +
      '})()'
    );
  } catch {}
}

/** 恢复播放视频窗口中所有视频（幂等，先解除覆盖层） */
async function playVideo() {
  if (!videoWindow || videoWindow.isDestroyed()) return;
  try {
    // 先解除覆盖层（XG-START 等），再播放
    await dismissOverlays();
    await new Promise(r => setTimeout(r, 300)); // 等覆盖层消失
    await videoWindow.webContents.executeJavaScript(
      'document.querySelectorAll("video").forEach(function(v){if(v.paused)v.play()})'
    );
  } catch {}
}

/** 查询视频窗口是否有视频正在播放 */
async function isVideoPlaying() {
  if (!videoWindow || videoWindow.isDestroyed()) return false;
  try {
    return await videoWindow.webContents.executeJavaScript(
      'Array.from(document.querySelectorAll("video")).some(function(v){return !v.paused && !v.ended})'
    );
  } catch {
    return false;
  }
}

/** 显示/聚焦视频窗口（Electron 原生 API，无 PowerShell 开销） */
function showVideoWindow() {
  if (!videoWindow || videoWindow.isDestroyed()) return;
  if (videoWindow.isMinimized()) videoWindow.restore();
  // 短暂置顶突破全屏游戏遮挡，300ms 后复原
  videoWindow.setAlwaysOnTop(true, 'screen-saver');
  videoWindow.show();
  videoWindow.focus();
  setTimeout(() => {
    if (videoWindow && !videoWindow.isDestroyed()) {
      videoWindow.setAlwaysOnTop(false);
    }
  }, 300);
}

/** 隐藏视频窗口 */
function hideVideoWindow() {
  if (!videoWindow || videoWindow.isDestroyed()) return;
  videoWindow.minimize();
}

// ========== LoL 监控 ==========

/**
 * 启动 LoL 监控（提取为可复用函数）
 * 供 IPC "start-monitor" 和"挂在后台"两种路径调用
 */
function startMonitoring() {
  if (lolMonitor) {
    lolMonitor.stop();
  }
  // 重置视频窗口（每次启动监控视为新的游戏会话）
  if (videoWindow && !videoWindow.isDestroyed()) {
    videoWindow.close();
    videoWindow = null;
  }
  lolMonitor = new LoLMonitor(config.pollInterval, log);
  lolMonitor.start();

  // 监听状态更新事件
  lolMonitor.on('status-update', (status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('status-update', status);
    }
  });

  // 监听阵亡事件
  lolMonitor.on('death-event', () => {
    // ★ 先保存对局窗口句柄（必须在视频窗口抢焦点之前）
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

    // 视频窗口：Electron BrowserWindow 内嵌，无外部浏览器依赖
    const urls = getTargetUrls();
    if (urls.length > 0) {
      const targetUrl = urls[0];
      setTimeout(async () => {
        // 窗口已存在 → 先切窗口，再恢复播放（杜绝声音比画面先到）
        if (videoWindow && !videoWindow.isDestroyed()) {
          showVideoWindow();
          const playing = await isVideoPlaying();
          if (!playing) {
            log('INFO', '[videoWin] 暂停中 → 恢复播放');
            await playVideo();
          } else {
            log('INFO', '[videoWin] 已在播放，仅显示');
          }
          return;
        }

        // 首次创建视频窗口
        createVideoWindow(targetUrl);
        // 等待页面加载 → 播放（带重试）
        setTimeout(async () => {
          let playing = await isVideoPlaying();
          if (!playing) {
            log('INFO', '[videoWin] 首次播放尝试');
            await playVideo();
            await new Promise(r => setTimeout(r, 4000));
            playing = await isVideoPlaying();
          }
          if (!playing) {
            log('WARN', '[videoWin] 首次播放未生效，5s 后重试');
            await new Promise(r => setTimeout(r, 5000));
            await playVideo();
          }
        }, 5000);
      }, config.delaySeconds * 1000);
    }
  });

  // 监听复活事件 — 暂停视频 + 切回 LoL
  lolMonitor.on('revive-event', async () => {
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

    // ★ 暂停视频窗口中正在播放的视频
    if (videoWindow && !videoWindow.isDestroyed()) {
      const playing = await isVideoPlaying();
      if (playing) {
        log('INFO', '[videoWin] 播放中 → 暂停');
        await pauseVideo();
      } else {
        log('INFO', '[videoWin] 已暂停或无法确定，跳过');
      }
      hideVideoWindow();
    }

    // ★ 用阵亡时保存的句柄切回游戏窗口
    restoreGameWindow();
  });
}

/**
 * 停止 LoL 监控
 */
function stopMonitoring() {
  if (lolMonitor) {
    lolMonitor.stop();
    lolMonitor = null;
  }
  if (videoWindow && !videoWindow.isDestroyed()) {
    videoWindow.close();
    videoWindow = null;
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('status-update', {
      state: 'idle',
      message: '监控已停止',
    });
  }
}

/**
 * 获取托盘图标（从 PNG 加载并缩放到 16×16）
 */
function createTrayIcon() {
  const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
  return nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
}

/**
 * 创建系统托盘
 */
function createTray() {
  if (tray) return;

  tray = new Tray(createTrayIcon());
  tray.setToolTip('死了就摸鱼吧');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isDestroyed()) {
            createWindow();
          } else {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        stopMonitoring();
        if (tray) {
          tray.destroy();
          tray = null;
        }
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // 双击托盘图标 → 显示窗口
  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isDestroyed()) {
        createWindow();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

/**
 * 创建主窗口
 */
function createWindow() {
  // 设计宽高比 480:640 = 3:4，锁死防止布局变形
  const DESIGN_RATIO = 480 / 640; // 0.75

  mainWindow = new BrowserWindow({
    width: 480,
    height: 640,
    minWidth: 360,
    minHeight: 480,
    maxWidth: 660,
    maxHeight: 880,
    title: '死了就摸鱼吧',
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#010A13',
    autoHideMenuBar: true,
    resizable: true,
  });

  // 锁定宽高比 — 无论怎么拖拽，始终保持 3:4 比例
  mainWindow.setAspectRatio(DESIGN_RATIO);

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

  // 截获关闭按钮 → 通知渲染进程弹出自定义对话框
  mainWindow.on('close', (event) => {
    if (isQuitting) return; // 真正退出时不拦截

    event.preventDefault();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('request-close-choice');
    }
  });
}

/**
 * 根据配置获取跳转URL列表
 * @returns {string[]}
 */
function getTargetUrls() {
  return config.target ? [config.target] : [];
}

// ========== 前台窗口保存/复原（阵亡→自动切出 → 复活→自动切回） ==========

/**
 * C# 辅助类文件内容
 * 写入临时 .cs 文件，通过 Add-Type -Path 加载，避免 here-string 压缩编码问题
 */
const LOL_CS_CODE = `
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

public class LolRecover
{
    [DllImport("user32.dll")]
    static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")]
    static extern bool IsIconic(IntPtr hWnd);
    [DllImport("user32.dll")]
    static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")]
    static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll")]
    static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    const int SW_SHOW = 5;
    const int SW_RESTORE = 9;
    const byte VK_MENU = 0x12;
    const uint KEYEVENTF_KEYUP = 0x0002;

    public static string Diag(long hwnd)
    {
        if (hwnd == 0) return "hwnd=0";
        var h = new IntPtr(hwnd);
        var sb = new StringBuilder(256);
        GetWindowText(h, sb, 256);
        string title = sb.ToString();
        uint pid;
        GetWindowThreadProcessId(h, out pid);
        string proc = "";
        try { proc = Process.GetProcessById((int)pid).ProcessName; } catch { proc = "?"; }
        return "hwnd=" + hwnd + " title=\\\"" + title + "\\\" proc=" + proc + " minimized=" + IsIconic(h);
    }

    public static string DiagFg()
    {
        return Diag(GetForegroundWindow().ToInt64());
    }

    public static long SaveFg()
    {
        return GetForegroundWindow().ToInt64();
    }

    public static long FindGame()
    {
        try
        {
            var procs = Process.GetProcessesByName("League of Legends");
            foreach (var p in procs)
            {
                try
                {
                    var h = p.MainWindowHandle;
                    if (h == IntPtr.Zero) continue;
                    var sb = new StringBuilder(256);
                    GetWindowText(h, sb, 256);
                    if (sb.Length > 0) return h.ToInt64();
                }
                catch { }
            }
        }
        catch { }
        return 0;
    }

    public static void Restore(long hwnd)
    {
        if (hwnd == 0) return;
        var h = new IntPtr(hwnd);

        if (IsIconic(h))
        {
            ShowWindow(h, SW_RESTORE);
        }
        ShowWindow(h, SW_SHOW);
        BringWindowToTop(h);

        keybd_event(VK_MENU, 0, 0, UIntPtr.Zero);
        SetForegroundWindow(h);
        keybd_event(VK_MENU, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
    }

}
`.trim();

/** C# 文件路径（临时目录） */
let lolCsPath = null;

/**
 * 初始化 C# 辅助类：写 .cs 文件 → Add-Type 编译加载
 * 仅在应用启动时执行一次
 */
function initLolRecover() {
  lolCsPath = path.join(app.getPath('userData'), 'LolRecover.cs');
  fs.writeFileSync(lolCsPath, LOL_CS_CODE, 'utf-8');

  try {
    const psScript = `Add-Type -Path '${lolCsPath}'`;
    const cmd = `powershell -NoProfile -EncodedCommand ${Buffer.from(psScript, 'utf16le').toString('base64')}`;
    execSync(cmd, { encoding: 'utf-8', timeout: 10000 });
    log('INFO', '[initLolRecover] C# 类编译成功');
  } catch (err) {
    log('ERROR', '[initLolRecover] C# 编译失败: ' + err.message);
  }
}

/**
 * 执行 PowerShell 方法调用并返回 stdout
 * 每次调用都是独立 PowerShell 进程，所以必须先 Add-Type 加载 C# 类
 */
function callLolRecover(methodCall, timeout = 5000) {
  const psScript = `Add-Type -Path '${lolCsPath}'; [LolRecover]::${methodCall}`;
  const cmd = `powershell -NoProfile -EncodedCommand ${Buffer.from(psScript, 'utf16le').toString('base64')}`;
  return execSync(cmd, { encoding: 'utf-8', timeout }).trim();
}

function callLolRecoverAsync(methodCall, callback) {
  const psScript = `Add-Type -Path '${lolCsPath}'; [LolRecover]::${methodCall}`;
  const cmd = `powershell -NoProfile -EncodedCommand ${Buffer.from(psScript, 'utf16le').toString('base64')}`;
  exec(cmd, (err, stdout) => {
    if (callback) callback(err, stdout ? stdout.trim() : '');
  });
}

/**
 * 阵亡时：保存对局客户端窗口句柄
 *
 * 策略（按优先级）：
 * 1. 通过进程名 "League of Legends" 查找对局窗口（最可靠）
 * 2. 回退到当前前台窗口（如果游戏恰好在前台）
 * 3. 都失败则清空句柄，复活时走最小化兜底
 */
function saveGameWindow() {
  try {
    const diag = callLolRecover('DiagFg()');
    log('INFO', '[saveGameWindow] 当前前台窗口: ' + diag);

    const gameHwnd = callLolRecover('FindGame()');
    if (gameHwnd && gameHwnd !== '0') {
      savedGameHwnd = gameHwnd;
      const gameDiag = callLolRecover(`Diag(${gameHwnd})`);
      log('INFO', '[saveGameWindow] 通过进程名找到对局窗口: ' + gameDiag);
      return;
    }

    const fgHwnd = callLolRecover('SaveFg()');
    if (fgHwnd && fgHwnd !== '0') {
      savedGameHwnd = fgHwnd;
      log('WARN', '[saveGameWindow] 未找到对局进程，回退到前台窗口: hwnd=' + fgHwnd);
      return;
    }

    log('WARN', '[saveGameWindow] 无法获取任何窗口句柄');
    savedGameHwnd = null;
  } catch (err) {
    log('ERROR', '[saveGameWindow] 异常: ' + err.message);
    savedGameHwnd = null;
  }
}

/**
 * 复活时：用保存的句柄切回游戏窗口。
 * 兜底：如果句柄丢失则最小化 Electron 窗口，让游戏自然回到前台。
 */
function restoreGameWindow() {
  if (!savedGameHwnd) {
    log('INFO', '[restoreGameWindow] 无保存句柄，最小化本窗口');
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isMinimized()) {
      mainWindow.minimize();
    }
    return;
  }

  const hwnd = savedGameHwnd;
  log('INFO', '[restoreGameWindow] 即将切回窗口: ' + hwnd);

  callLolRecoverAsync(`Restore(${hwnd})`, (err) => {
    if (err) {
      log('ERROR', '[restoreGameWindow] 切回失败: ' + err.message);
      if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isMinimized()) {
        mainWindow.minimize();
      }
    } else {
      log('INFO', '[restoreGameWindow] 已切回窗口: ' + hwnd);
    }
  });

  savedGameHwnd = null;
}

/**
 * 初始化IPC通信
 */
function setupIPC() {
  // 启动监控
  ipcMain.handle('start-monitor', () => {
    startMonitoring();
    return { success: true };
  });

  // 停止监控
  ipcMain.handle('stop-monitor', () => {
    stopMonitoring();
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

  // 获取自定义URL列表
  ipcMain.handle('get-custom-urls', () => {
    return [...customUrls];
  });

  // 添加自定义URL
  ipcMain.handle('add-custom-url', (event, item) => {
    const label = (item?.label || '').trim();
    const url = (item?.url || '').trim();
    if (!label || !url) return [...customUrls];
    if (!/^https?:\/\/.+/.test(url)) return [...customUrls];
    // 按url去重
    if (!customUrls.some((c) => c.url === url)) {
      customUrls.push({ label, url });
      saveCustomUrls();
    }
    return [...customUrls];
  });

  // 删除自定义URL (按url匹配)
  ipcMain.handle('delete-custom-url', (event, url) => {
    customUrls = customUrls.filter((c) => c.url !== url);
    saveCustomUrls();
    return [...customUrls];
  });

  // 设置当前跳转目标URL
  ipcMain.handle('set-target-url', (event, url) => {
    config.target = url;
    return config.target;
  });

  // 关闭对话框选择回传（渲染进程自定义对话框）
  ipcMain.handle('resolve-close-choice', (event, choice) => {
    if (choice === 'quit') {
      isQuitting = true;
      stopMonitoring();
      if (tray) {
        tray.destroy();
        tray = null;
      }
      app.quit();
    } else if (choice === 'tray') {
      if (!lolMonitor) {
        startMonitoring();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('status-update', {
            state: 'searching',
            message: '正在寻找游戏客户端...',
            isDead: false,
            deathCount: 0,
          });
        }
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.hide();
      }
    }
    // 'cancel' → 什么都不做
    return { success: true };
  });
}

// Electron应用生命周期
app.whenReady().then(() => {
  initLogger();
  initLolRecover();
  loadStats();
  loadCustomUrls();
  setupIPC();
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Windows 上不退出，因为还有托盘图标
  if (process.platform !== 'darwin') {
    // 不调用 app.quit()，保持托盘运行
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  // 如果退出时玩家还在阵亡中，将未完成的AFK时间计入统计
  if (afkStartTime) {
    const afkDuration = Date.now() - afkStartTime;
    stats.totalAfkMs += afkDuration;
    afkStartTime = null;
    saveStats();
  }
  stopMonitoring();
  if (tray) {
    tray.destroy();
    tray = null;
  }
});

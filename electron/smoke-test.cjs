/**
 * 视频窗口 Smoke Test
 *
 * 不依赖 LOL 游戏 —— 直接模拟"阵亡→复活"视频控制循环。
 *
 * 用法:
 *   npx electron electron/smoke-test.cjs [URL]
 *
 * 默认 URL: https://www.douyin.com/?recommend=1
 */
const { app, BrowserWindow } = require('electron');
const path = require('path');

const TARGET_URL = process.argv[2] || 'https://www.douyin.com/?recommend=1';

/** @type {BrowserWindow|null} */
let videoWindow = null;

let testLog = [];
function log(msg) {
  const ts = new Date().toISOString().split('T')[1].slice(0, 12);
  const line = `[${ts}] ${msg}`;
  console.log(line);
  testLog.push(line);
}

// ========== 复刻 main.cjs 的核心逻辑 ==========

function createVideoWindow(url) {
  return new Promise((resolve) => {
    videoWindow = new BrowserWindow({
      width: 1100,
      height: 700,
      title: 'Smoke Test',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: path.join(__dirname, 'preload.cjs'),
      },
      show: false,
    });
    videoWindow.webContents.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    );
    videoWindow.loadURL(url);
    videoWindow.once('ready-to-show', () => {
      if (videoWindow.isMinimized()) videoWindow.restore();
      videoWindow.show();
      resolve();
    });
    videoWindow.on('closed', () => { videoWindow = null; });
  });
}

async function pauseVideo() {
  if (!videoWindow || videoWindow.isDestroyed()) return;
  await videoWindow.webContents.executeJavaScript(
    'document.querySelectorAll("video").forEach(function(v){if(!v.paused)v.pause()})'
  );
}

async function dismissOverlays() {
  if (!videoWindow || videoWindow.isDestroyed()) return;
  try {
    await videoWindow.webContents.executeJavaScript(
      '(function(){' +
      'var xgStart=document.querySelector("xg-start");if(xgStart)xgStart.click();' +
      'var v=document.querySelector("video");if(v)v.click();' +
      'var modals=document.querySelectorAll("[class*=\\"guide\\"],[class*=\\"Guide\\"],[class*=\\"open-app\\"],[class*=\\"get-app\\"],[class*=\\"download-app\\"]");' +
      'modals.forEach(function(m){if(m.querySelector&&m.querySelector("[class*=\\"close\\"]"))m.querySelector("[class*=\\"close\\"]").click();});' +
      '})()'
    );
  } catch {}
}

async function playVideo() {
  if (!videoWindow || videoWindow.isDestroyed()) return;
  try {
    await dismissOverlays();
    await new Promise(r => setTimeout(r, 300));
    await videoWindow.webContents.executeJavaScript(
      'document.querySelectorAll("video").forEach(function(v){if(v.paused)v.play()})'
    );
  } catch {}
}

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

async function getVideoCount() {
  if (!videoWindow || videoWindow.isDestroyed()) return 0;
  try {
    return await videoWindow.webContents.executeJavaScript(
      'document.querySelectorAll("video").length'
    );
  } catch {
    return 0;
  }
}

async function hasAppPrompts() {
  // 检测常见的"获取应用"/"打开App"弹窗元素
  if (!videoWindow || videoWindow.isDestroyed()) return [];
  try {
    return await videoWindow.webContents.executeJavaScript(`
      (function() {
        var found = [];
        var selectors = [
          '[class*="guide"]', '[class*="Guide"]',
          '[class*="modal"]', '[class*="Modal"]',
          '[class*="dialog"]', '[class*="Dialog"]',
          '[class*="popup"]', '[class*="Popup"]',
          '[class*="app-download"]', '[class*="open-app"]',
          '[class*="get-app"]', '[class*="install-app"]',
        ];
        selectors.forEach(function(sel) {
          var el = document.querySelector(sel);
          if (el && el.offsetParent !== null) {
            found.push({selector: sel, text: (el.textContent||'').slice(0,60)});
          }
        });
        return found;
      })()
    `);
  } catch {
    return [];
  }
}

// ========== 测试用例 ==========

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function test(name, fn) {
  log(`━━━ TEST: ${name} ━━━`);
  try {
    await fn();
    log(`  ✅ PASS`);
    return true;
  } catch (err) {
    log(`  ❌ FAIL: ${err.message}`);
    return false;
  }
}

// ========== 主流程 ==========

app.whenReady().then(async () => {
  let passed = 0;
  let failed = 0;

  // Test 1: 创建窗口 + 加载抖音
  const t1 = await test('创建窗口并加载页面', async () => {
    await createVideoWindow(TARGET_URL);
    await sleep(5000); // 等页面完全加载（视频可能需要时间）
    log('  等待 5s 页面加载...');
  });
  if (t1) passed++; else failed++;

  // 诊断: 页面到底加载了什么
  const pageDiag = await (async () => {
    try {
      return await videoWindow.webContents.executeJavaScript(`
        (function() {
          return {
            title: document.title,
            bodyLen: (document.body?.textContent || '').length,
            bodyExcerpt: (document.body?.textContent || '').slice(0, 200),
            scripts: document.querySelectorAll('script').length,
            iframes: document.querySelectorAll('iframe').length,
            videos: document.querySelectorAll('video').length,
            allTagCounts: (function() {
              var c = {}; document.querySelectorAll('*').forEach(function(el) {
                c[el.tagName] = (c[el.tagName]||0)+1;
              }); return c;
            })()
          };
        })()
      `);
    } catch { return null; }
  })();
  log(`  Page title: "${pageDiag?.title}"`);
  log(`  Body text (first 200): "${pageDiag?.bodyExcerpt}"`);
  log(`  Scripts: ${pageDiag?.scripts}, Iframes: ${pageDiag?.iframes}, Videos: ${pageDiag?.videos}`);
  log(`  Tags: ${JSON.stringify(pageDiag?.allTagCounts)}`);

  // Test 2: 检测视频元素
  await test('检测 <video> 元素', async () => {
    const count = await getVideoCount();
    log(`  <video> 数量: ${count}`);
    if (count === 0) throw new Error('页面无视频元素（可能是反爬/未登录/页面未加载完整内容）');
  });
  const videoCount = await getVideoCount();
  if (videoCount > 0) passed++; else failed++;

  // Test 3: 检测 ByteDance 弹窗
  await test('检测"获取应用"弹窗', async () => {
    const prompts = await hasAppPrompts();
    if (prompts.length > 0) {
      log(`  发现 ${prompts.length} 个弹窗元素:`);
      prompts.forEach(p => log(`    - ${p.selector}: "${p.text}"`));
      throw new Error(`存在 ${prompts.length} 个弹窗`);
    }
    log('  未发现弹窗');
  });
  const prompts = await hasAppPrompts();
  if (prompts.length === 0) passed++; else failed++;

  // Test 4: 模拟阵亡 → 播放视频
  await test('模拟阵亡: playVideo()', async () => {
    await playVideo();
    await sleep(3000); // 等视频开始播放
    const playing = await isVideoPlaying();
    log(`  播放状态: ${playing}`);
    if (!playing) throw new Error('视频未开始播放（可能需手动点击或页面限制自动播放）');
  });
  const afterPlay = await isVideoPlaying();
  if (afterPlay) passed++; else failed++;

  // Test 5: 模拟复活 → 暂停视频
  await test('模拟复活: pauseVideo()', async () => {
    await pauseVideo();
    await sleep(500);
    const playing = await isVideoPlaying();
    log(`  播放状态: ${playing}`);
    if (playing) throw new Error('暂停后仍在播放');
  });
  const afterPause = await isVideoPlaying();
  if (!afterPause) passed++; else failed++;

  // Test 6: 再次阵亡 → 恢复播放
  await test('再次阵亡: playVideo() 幂等', async () => {
    await playVideo();
    await sleep(3000);
    const playing = await isVideoPlaying();
    log(`  播放状态: ${playing}`);
    if (!playing) throw new Error('恢复播放失败');
  });
  const afterResume = await isVideoPlaying();
  if (afterResume) passed++; else failed++;

  // Test 7: 已暂停时 pauseVideo() 不报错
  await test('幂等: paused 时 pauseVideo()', async () => {
    await pauseVideo();
    await sleep(500);
    await pauseVideo(); // 二次暂停
    const playing = await isVideoPlaying();
    log(`  播放状态: ${playing}`);
    if (playing) throw new Error('二次暂停失败');
  });
  const idempotentPause = await isVideoPlaying();
  if (!idempotentPause) passed++; else failed++;

  // ======== 结果汇总 ========
  log('');
  log('========================================');
  log(`  测试完成: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  log('========================================');

  if (videoWindow && !videoWindow.isDestroyed()) {
    videoWindow.close();
  }

  // 打印测试摘要
  console.log('\n--- 测试摘要 ---');
  testLog.forEach(l => console.log(l));

  app.exit(failed > 0 ? 1 : 0);
});

const http = require('http');

/**
 * Chrome DevTools Protocol 客户端
 *
 * 通过 WebSocket 连接浏览器页面，执行 JavaScript 实现：
 * - 查询视频状态（paused / playing）
 * - 幂等暂停：已暂停时调用 pause() 无副作用
 * - 幂等播放：已播放时调用 play() 无副作用
 *
 * 仅支持 Chromium 系浏览器（Chrome / Edge / Brave），
 * 需要浏览器以 --remote-debugging-port=PORT 启动。
 */
class CdpClient {
  /**
   * @param {Function} logger - (level, message) => void
   */
  constructor(logger) {
    this._log = logger || (() => {});
    this._ws = null;
    this._msgId = 0;
    this._pending = new Map();
    this._debugPort = 0;
    this._connected = false;
  }

  /**
   * 获取页面的 WebSocket 调试 URL
   * @param {number} port
   * @returns {Promise<string|null>}
   */
  async _getPageWsUrl(port) {
    return new Promise((resolve) => {
      const req = http.get(`http://127.0.0.1:${port}/json`, (res) => {
        let body = '';
        res.on('data', (c) => { body += c; });
        res.on('end', () => {
          try {
            const pages = JSON.parse(body);
            // 找第一个普通网页（排除 chrome:// 和空 URL）
            const page = pages.find(
              (p) => p.url && p.url.startsWith('http') && p.type === 'page'
            );
            resolve(page ? page.webSocketDebuggerUrl : null);
          } catch {
            resolve(null);
          }
        });
      });
      req.on('error', () => resolve(null));
      req.setTimeout(3000, () => {
        req.destroy();
        resolve(null);
      });
    });
  }

  /**
   * 连接到指定端口的调试页面
   * @param {number} port - 调试端口
   * @returns {Promise<boolean>}
   */
  async connect(port) {
    this._debugPort = port;
    const wsUrl = await this._getPageWsUrl(port);
    if (!wsUrl) {
      this._log('WARN', '[CDP] 未找到调试页面 (port=' + port + ')');
      return false;
    }

    return new Promise((resolve) => {
      try {
        // 动态 require ws — 只在 Chromium 路径使用
        const WebSocket = require('ws');
        this._ws = new WebSocket(wsUrl);

        const timeout = setTimeout(() => {
          if (!this._connected) {
            this._log('WARN', '[CDP] 连接超时');
            resolve(false);
          }
        }, 5000);

        this._ws.on('open', () => {
          clearTimeout(timeout);
          this._connected = true;
          this._log('INFO', '[CDP] 已连接: ' + wsUrl);
          resolve(true);
        });

        this._ws.on('message', (data) => {
          try {
            const msg = JSON.parse(data.toString());
            if (msg.id && this._pending.has(msg.id)) {
              const pending = this._pending.get(msg.id);
              this._pending.delete(msg.id);
              if (msg.error) {
                pending.reject(new Error(msg.error.message || 'CDP error'));
              } else {
                pending.resolve(msg.result);
              }
            }
          } catch { /* 忽略解析失败 */ }
        });

        this._ws.on('close', () => {
          this._connected = false;
          this._ws = null;
          // 清理所有等待中的回调
          for (const [id, pending] of this._pending) {
            pending.reject(new Error('CDP disconnected'));
          }
          this._pending.clear();
          this._log('INFO', '[CDP] 连接断开');
        });

        this._ws.on('error', (err) => {
          clearTimeout(timeout);
          this._connected = false;
          this._log('WARN', '[CDP] WebSocket 错误: ' + err.message);
          resolve(false);
        });
      } catch (err) {
        this._log('ERROR', '[CDP] 创建 WebSocket 失败: ' + err.message);
        resolve(false);
      }
    });
  }

  /**
   * 发送 CDP 命令
   * @param {string} method
   * @param {Object} params
   * @returns {Promise<Object|null>}
   */
  async _send(method, params = {}) {
    if (!this._ws || !this._connected) return null;
    const id = ++this._msgId;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this._pending.has(id)) {
          this._pending.delete(id);
          reject(new Error('CDP 超时: ' + method));
        }
      }, 3000);

      this._pending.set(id, { resolve, reject });
      try {
        this._ws.send(JSON.stringify({ id, method, params }));
      } catch (err) {
        clearTimeout(timeout);
        this._pending.delete(id);
        reject(err);
      }
    });
  }

  /**
   * 在页面上下文中执行 JavaScript 表达式
   * @param {string} expression
   * @returns {Promise<*>} 返回值
   */
  async evaluate(expression) {
    try {
      const result = await this._send('Runtime.evaluate', {
        expression,
        returnByValue: true,
      });
      if (result && result.result) {
        return result.result.value;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 查询页面是否有视频正在播放
   * @returns {Promise<boolean|null>} null = 无法确定
   */
  async isVideoPlaying() {
    try {
      const result = await this.evaluate(
        'Array.from(document.querySelectorAll("video")).some(function(v){return !v.paused && !v.ended})'
      );
      return result === true;
    } catch {
      return null;
    }
  }

  /**
   * 暂停所有视频（幂等：已暂停的调用无副作用）
   * @returns {Promise<void>}
   */
  async pauseVideo() {
    await this.evaluate(
      'document.querySelectorAll("video").forEach(function(v){if(!v.paused){v.pause()}})'
    );
  }

  /**
   * 播放所有视频（幂等：已播放的调用无副作用）
   * @returns {Promise<void>}
   */
  async playVideo() {
    await this.evaluate(
      'document.querySelectorAll("video").forEach(function(v){if(v.paused){v.play()}})'
    );
  }

  /**
   * CDP 是否已连接
   * @returns {boolean}
   */
  get isConnected() {
    return this._connected && this._ws !== null;
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this._ws) {
      try { this._ws.close(); } catch {}
      this._ws = null;
    }
    this._connected = false;
    this._pending.clear();
  }
}

/**
 * 判断浏览器路径是否属于 Chromium 系（支持 CDP）
 * @param {string} browserPath
 * @returns {boolean}
 */
function isChromium(browserPath) {
  const lower = browserPath.toLowerCase();
  return lower.includes('chrome') || lower.includes('msedge') || lower.includes('brave');
}

module.exports = { CdpClient, isChromium };

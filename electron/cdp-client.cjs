const http = require('http');

/**
 * Chrome DevTools Protocol 客户端（轻量版）
 *
 * 通过 WebSocket 连接浏览器，执行 JavaScript 查询/控制视频状态。
 * 仅当浏览器以 --remote-debugging-port=PORT 启动时可用。
 */
class CdpClient {
  constructor(logger) {
    this._log = logger || (() => {});
    this._ws = null;
    this._msgId = 0;
    this._pending = new Map();
    this._connected = false;
  }

  /** 获取页面 WebSocket 调试 URL */
  async _getPageWsUrl(port) {
    return new Promise((resolve) => {
      const req = http.get(`http://127.0.0.1:${port}/json`, (res) => {
        let body = '';
        res.on('data', (c) => { body += c; });
        res.on('end', () => {
          try {
            const pages = JSON.parse(body);
            const page = pages.find(
              (p) => p.url && p.url.startsWith('http') && p.type === 'page'
            );
            resolve(page ? page.webSocketDebuggerUrl : null);
          } catch { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
      req.setTimeout(3000, () => { req.destroy(); resolve(null); });
    });
  }

  /** 连接 CDP */
  async connect(port) {
    const wsUrl = await this._getPageWsUrl(port);
    if (!wsUrl) return false;

    return new Promise((resolve) => {
      try {
        const WebSocket = require('ws');
        this._ws = new WebSocket(wsUrl);

        const timeout = setTimeout(() => {
          if (!this._connected) { this._log('WARN', '[CDP] 连接超时'); resolve(false); }
        }, 5000);

        this._ws.on('open', () => {
          clearTimeout(timeout);
          this._connected = true;
          this._log('INFO', '[CDP] 已连接');
          resolve(true);
        });

        this._ws.on('message', (data) => {
          try {
            const msg = JSON.parse(data.toString());
            if (msg.id && this._pending.has(msg.id)) {
              const p = this._pending.get(msg.id);
              this._pending.delete(msg.id);
              if (msg.error) p.reject(new Error(msg.error.message));
              else p.resolve(msg.result);
            }
          } catch {}
        });

        this._ws.on('close', () => {
          this._connected = false; this._ws = null;
          for (const [, p] of this._pending) p.reject(new Error('disconnected'));
          this._pending.clear();
        });

        this._ws.on('error', (err) => {
          clearTimeout(timeout);
          this._connected = false;
          this._log('WARN', '[CDP] WebSocket 错误: ' + err.message);
          resolve(false);
        });
      } catch (err) {
        this._log('ERROR', '[CDP] 创建失败: ' + err.message);
        resolve(false);
      }
    });
  }

  async _send(method, params = {}) {
    if (!this._ws || !this._connected) return null;
    const id = ++this._msgId;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this._pending.has(id)) { this._pending.delete(id); reject(new Error('timeout')); }
      }, 3000);
      this._pending.set(id, { resolve, reject });
      try { this._ws.send(JSON.stringify({ id, method, params })); }
      catch (err) { clearTimeout(timeout); this._pending.delete(id); reject(err); }
    });
  }

  async evaluate(expression) {
    try {
      const r = await this._send('Runtime.evaluate', { expression, returnByValue: true });
      return r?.result?.value;
    } catch { return null; }
  }

  /** 查询页面是否有视频正在播放 */
  async isVideoPlaying() {
    return (await this.evaluate(
      'Array.from(document.querySelectorAll("video")).some(function(v){return !v.paused && !v.ended})'
    )) === true;
  }

  /** 暂停所有视频（幂等） */
  async pauseVideo() {
    await this.evaluate(
      'document.querySelectorAll("video").forEach(function(v){if(!v.paused){v.pause()}})'
    );
  }

  /** 播放所有视频（幂等） */
  async playVideo() {
    await this.evaluate(
      'document.querySelectorAll("video").forEach(function(v){if(v.paused){v.play()}})'
    );
  }

  get isConnected() { return this._connected && this._ws !== null; }

  disconnect() {
    if (this._ws) { try { this._ws.close(); } catch {}; this._ws = null; }
    this._connected = false;
    this._pending.clear();
  }
}

module.exports = { CdpClient };

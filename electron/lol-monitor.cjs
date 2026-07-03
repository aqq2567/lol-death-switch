const https = require('https');
const EventEmitter = require('events');

/**
 * LoL游戏客户端API监控模块
 *
 * 通过轮询LoL本地HTTPS API检测玩家阵亡状态，
 * 触发阵亡事件并管理防抖逻辑。
 */
class LoLMonitor extends EventEmitter {
  /**
   * LoL游戏客户端API地址
   * @type {string}
   */
  static API_URL = 'https://127.0.0.1:2999/liveclientdata/allgamedata';

  /**
   * @param {number} pollInterval - 轮询间隔（毫秒），默认3000
   * @param {Function} [logger] - 可选日志函数 (level, message) => void
   */
  constructor(pollInterval = 3000, logger = null) {
    super();
    this.pollInterval = pollInterval;
    this.timer = null;
    this.isRunning = false;

    // 阵亡状态追踪
    this.wasDead = false;
    this.deathCount = 0;

    // 玩家信息缓存
    this.activePlayerName = null;

    // 连续失败计数（用于判断游戏是否在运行）
    this.failureCount = 0;
    this.maxFailures = 3;

    // 日志函数（有则用，无则用 console）
    this._log = logger || ((level, msg) => {
      switch (level) {
        case 'ERROR': console.error(`[${new Date().toISOString()}] [ERROR] ${msg}`); break;
        default: console.log(`[${new Date().toISOString()}] [INFO] ${msg}`);
      }
    });
  }

  /**
   * 启动监控
   */
  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.wasDead = false;
    this.deathCount = 0;
    this.activePlayerName = null;
    this.failureCount = 0;

    this.emit('status-update', {
      state: 'searching',
      message: '正在寻找游戏客户端...',
    });

    // 立即执行一次轮询，然后按间隔持续轮询
    this._poll();
    this.timer = setInterval(() => this._poll(), this.pollInterval);
  }

  /**
   * 停止监控
   */
  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * 动态更新轮询间隔
   * @param {number} newInterval - 新的轮询间隔（毫秒）
   */
  setPollInterval(newInterval) {
    this.pollInterval = newInterval;
    if (this.isRunning && this.timer) {
      clearInterval(this.timer);
      this.timer = setInterval(() => this._poll(), this.pollInterval);
    }
  }

  /**
   * 获取当前阵亡计数
   * @returns {number}
   */
  getDeathCount() {
    return this.deathCount;
  }

  /**
   * 执行一次API轮询
   * @private
   */
  async _poll() {
    try {
      const data = await this._fetchGameData();
      this.failureCount = 0;

      // 提取当前活跃玩家名称
      if (data && data.activePlayer && data.activePlayer.summonerName) {
        if (this.activePlayerName !== data.activePlayer.summonerName) {
          this._log('INFO', '[LoLMonitor] 玩家: ' + data.activePlayer.summonerName);
          this.activePlayerName = data.activePlayer.summonerName;
        }
      }

      // 检测玩家阵亡状态
      const isDead = this._checkDeathStatus(data);

      if (isDead && !this.wasDead) {
        // 新阵亡事件触发
        this.wasDead = true;
        this.deathCount += 1;
        this._log('INFO', `[LoLMonitor] 💀 阵亡检测 #${this.deathCount} | health=${this._getHealth(data)} isDead=${isDead}`);

        this.emit('status-update', {
          state: 'dead',
          message: `已阵亡！第 ${this.deathCount} 次阵亡`,
          deathCount: this.deathCount,
          isDead: true,
        });

        this.emit('death-event');
      } else if (isDead && this.wasDead) {
        // 仍然阵亡，但不重复触发
        this.emit('status-update', {
          state: 'dead',
          message: `阵亡中...第 ${this.deathCount} 次阵亡`,
          deathCount: this.deathCount,
          isDead: true,
        });
      } else if (!isDead && this.wasDead) {
        // 复活！重置阵亡状态，触发切回事件
        this.wasDead = false;
        this._log('INFO', `[LoLMonitor] ✨ 复活检测 | health=${this._getHealth(data)}`);

        this.emit('status-update', {
          state: 'alive',
          message: `已复活！继续战斗`,
          deathCount: this.deathCount,
          isDead: false,
        });

        // 通知主进程切换回LoL窗口
        this.emit('revive-event');
      } else {
        // 正常存活状态
        this.emit('status-update', {
          state: 'alive',
          message: `游戏中 - 存活`,
          deathCount: this.deathCount,
          isDead: false,
        });
      }
    } catch (error) {
      // 超过阈值后静默轮询，不刷日志，等待游戏恢复
      if (this.failureCount < this.maxFailures) {
        this.failureCount += 1;
        this._log('WARN', `[LoLMonitor] API轮询失败 (${this.failureCount}/${this.maxFailures}): ${error.message}`);
      }

      if (this.failureCount >= this.maxFailures) {
        this.emit('status-update', {
          state: 'no-game',
          message: '未检测到游戏客户端',
        });
      } else {
        this.emit('status-update', {
          state: 'searching',
          message: '正在尝试连接游戏客户端...',
        });
      }
    }
  }

  /**
   * 获取当前血量（用于日志）
   * @param {Object} data
   * @returns {string}
   * @private
   */
  _getHealth(data) {
    try {
      if (data && data.activePlayer && data.activePlayer.championStats) {
        return data.activePlayer.championStats.currentHealth || '?';
      }
    } catch {}
    return '?';
  }

  /**
   * 检测玩家是否阵亡
   * @param {Object} data - API返回的游戏数据
   * @returns {boolean}
   * @private
   */
  _checkDeathStatus(data) {
    if (!data) return false;

    // 方法1：通过activePlayer的health判断（health为0表示阵亡）
    if (data.activePlayer && data.activePlayer.championStats) {
      const health = parseFloat(data.activePlayer.championStats.currentHealth || '0');
      if (health <= 0) return true;
    }

    // 方法2：通过allPlayers列表中的isDead字段判断
    if (data.allPlayers && this.activePlayerName) {
      const currentPlayer = data.allPlayers.find(
        (player) => player.summonerName === this.activePlayerName
      );
      if (currentPlayer && currentPlayer.isDead !== undefined) {
        return Boolean(currentPlayer.isDead);
      }
    }

    // 方法3：如果没有玩家名，尝试通过activePlayer的summonerName在allPlayers中查找
    if (data.allPlayers && data.activePlayer) {
      const currentPlayer = data.allPlayers.find(
        (player) => player.summonerName === data.activePlayer.summonerName
      );
      if (currentPlayer) {
        // 优先用isDead字段
        if (currentPlayer.isDead !== undefined) {
          return Boolean(currentPlayer.isDead);
        }
        // fallback到health
        if (currentPlayer.championStats) {
          const health = parseFloat(currentPlayer.championStats.currentHealth || '0');
          if (health <= 0) return true;
        }
      }
    }

    return false;
  }

  /**
   * 从LoL本地API获取游戏数据
   * @returns {Promise<Object|null>}
   * @private
   */
  _fetchGameData() {
    return new Promise((resolve, reject) => {
      const options = {
        rejectUnauthorized: false, // 忽略自签名证书验证
        timeout: 5000, // 5秒超时
      };

      const req = https.get(LoLMonitor.API_URL, options, (res) => {
        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            resolve(data);
          } catch (parseError) {
            reject(new Error(`JSON解析失败: ${parseError.message}`));
          }
        });
      });

      req.on('error', (err) => {
        reject(new Error(`API请求失败: ${err.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('API请求超时'));
      });
    });
  }
}

module.exports = { LoLMonitor };

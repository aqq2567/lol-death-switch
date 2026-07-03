const { contextBridge, ipcRenderer } = require('electron');

/**
 * preload脚本：通过contextBridge安全地暴露IPC方法给渲染进程
 */
contextBridge.exposeInMainWorld('lolAPI', {
  /**
   * 启动LoL监控
   * @returns {Promise<{success: boolean}>}
   */
  startMonitor: () => ipcRenderer.invoke('start-monitor'),

  /**
   * 停止LoL监控
   * @returns {Promise<{success: boolean}>}
   */
  stopMonitor: () => ipcRenderer.invoke('stop-monitor'),

  /**
   * 获取当前配置
   * @returns {Promise<{target: string, pollInterval: number, delaySeconds: number}>}
   */
  getConfig: () => ipcRenderer.invoke('get-config'),

  /**
   * 设置配置
   * @param {Object} newConfig - 新配置项
   * @returns {Promise<{target: string, pollInterval: number, delaySeconds: number}>}
   */
  setConfig: (newConfig) => ipcRenderer.invoke('set-config', newConfig),

  /**
   * 获取阵亡计数
   * @returns {Promise<number>}
   */
  getDeathCount: () => ipcRenderer.invoke('get-death-count'),

  /**
   * 获取持久化统计（累计阵亡 + 累计摸鱼时间）
   * @returns {Promise<{totalDeaths: number, totalAfkMs: number}>}
   */
  getStats: () => ipcRenderer.invoke('get-stats'),

  /**
   * 重置持久化统计
   * @returns {Promise<{totalDeaths: number, totalAfkMs: number}>}
   */
  resetStats: () => ipcRenderer.invoke('reset-stats'),

  /**
   * 监听状态更新事件
   * @param {Function} callback - 回调函数，接收status对象
   * @returns {Function} 清理函数，移除监听器
   */
  onStatusUpdate: (callback) => {
    const handler = (event, status) => callback(status);
    ipcRenderer.on('status-update', handler);
    return () => ipcRenderer.removeListener('status-update', handler);
  },

  /**
   * 监听阵亡事件
   * @param {Function} callback - 回调函数，接收deathEvent对象
   * @returns {Function} 清理函数，移除监听器
   */
  onDeathEvent: (callback) => {
    const handler = (event, deathEvent) => callback(deathEvent);
    ipcRenderer.on('death-event', handler);
    return () => ipcRenderer.removeListener('death-event', handler);
  },

  /**
   * 监听持久化统计更新
   * @param {Function} callback - 回调函数，接收 {totalDeaths, totalAfkMs}
   * @returns {Function} 清理函数，移除监听器
   */
  onStatsUpdate: (callback) => {
    const handler = (event, stats) => callback(stats);
    ipcRenderer.on('stats-update', handler);
    return () => ipcRenderer.removeListener('stats-update', handler);
  },

  /**
   * 获取用户自定义URL列表
   * @returns {Promise<{label: string, url: string}[]>}
   */
  getCustomUrls: () => ipcRenderer.invoke('get-custom-urls'),

  /**
   * 添加自定义URL
   * @param {{label: string, url: string}} item
   * @returns {Promise<{label: string, url: string}[]>}
   */
  addCustomUrl: (item) => ipcRenderer.invoke('add-custom-url', item),

  /**
   * 删除自定义URL
   * @param {string} url
   * @returns {Promise<string[]>}
   */
  deleteCustomUrl: (url) => ipcRenderer.invoke('delete-custom-url', url),

  /**
   * 设置当前跳转目标URL
   * @param {string} url
   * @returns {Promise<string>}
   */
  setTargetUrl: (url) => ipcRenderer.invoke('set-target-url', url),

  /**
   * 监听关闭请求（用户点击窗口 ✕ 时触发）
   * @param {Function} callback
   * @returns {Function} 清理函数
   */
  onCloseRequest: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('request-close-choice', handler);
    return () => ipcRenderer.removeListener('request-close-choice', handler);
  },

  /**
   * 回传关闭对话框选择
   * @param {'quit'|'tray'|'cancel'} choice
   * @returns {Promise<{success: boolean}>}
   */
  resolveCloseChoice: (choice) => ipcRenderer.invoke('resolve-close-choice', choice),
});

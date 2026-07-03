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
});

import React, { useState, useEffect, useCallback } from 'react';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import voidRiftTheme from './theme';
import StatusPanel from './components/StatusPanel';
import ConfigPanel from './components/ConfigPanel';
import StatsPanel from './components/StatsPanel';

/**
 * 今天摸鱼了吗 — LoL阵亡监控
 *
 * 布局:
 *   顶部 → 品牌 + 横向状态指示
 *   中部 → 双卡片：累计阵亡 | 替你摸鱼的时间
 *   底部 → 启停按钮 + 配置入口
 */
function App() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  const [status, setStatus] = useState({
    state: 'idle',
    message: '点击启动开始监控',
    isDead: false,
    deathCount: 0,
  });

  const [config, setConfig] = useState({
    target: 'douyin',
    delaySeconds: 0,
  });

  // 持久化统计：累计阵亡 + 累计摸鱼时间
  const [stats, setStats] = useState({ totalDeaths: 0, totalAfkMs: 0 });

  const handleStart = useCallback(async () => {
    try {
      await window.lolAPI.startMonitor();
      setIsMonitoring(true);
      setStatus({
        state: 'searching',
        message: '正在寻找游戏客户端...',
        isDead: false,
        deathCount: 0,
      });
    } catch (err) {
      console.error('启动监控失败:', err);
    }
  }, []);

  const handleStop = useCallback(async () => {
    try {
      await window.lolAPI.stopMonitor();
      setIsMonitoring(false);
      setStatus({
        state: 'idle',
        message: '监控已停止',
        isDead: false,
        deathCount: 0,
      });
    } catch (err) {
      console.error('停止监控失败:', err);
    }
  }, []);

  const handleConfigChange = useCallback(async (newConfig) => {
    try {
      const updatedConfig = await window.lolAPI.setConfig(newConfig);
      setConfig(updatedConfig);
    } catch (err) {
      console.error('更新配置失败:', err);
    }
  }, []);

  // 监听状态更新
  useEffect(() => {
    if (!window.lolAPI) return;
    const cleanupStatus = window.lolAPI.onStatusUpdate((newStatus) => {
      setStatus((prev) => ({ ...prev, ...newStatus }));
    });
    return cleanupStatus;
  }, []);

  // 加载持久化统计
  useEffect(() => {
    if (!window.lolAPI) return;
    window.lolAPI.getStats()
      .then(setStats)
      .catch((err) => console.error('加载统计失败:', err));
  }, []);

  // 监听统计更新（主进程主动推送）
  useEffect(() => {
    if (!window.lolAPI) return;
    const cleanupStats = window.lolAPI.onStatsUpdate((newStats) => {
      setStats(newStats);
    });
    return cleanupStats;
  }, []);

  // 初始加载配置
  useEffect(() => {
    if (!window.lolAPI) return;
    window.lolAPI.getConfig()
      .then(setConfig)
      .catch((err) => console.error('获取初始配置失败:', err));
  }, []);

  return (
    <ThemeProvider theme={voidRiftTheme}>
      <CssBaseline />

      {/* 全屏容器 */}
      <Box
        className="void-bg"
        sx={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          userSelect: 'none',
        }}
      >
        {/* ---- 顶部栏：品牌 + 横向状态 ---- */}
        <Box
          sx={{
            flexShrink: 0,
            px: 3,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
          }}
        >
          {/* 品牌 */}
          <Box
            sx={{
              fontSize: '0.85rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: '#C89B3C',
            }}
          >
            今天摸鱼了吗
          </Box>

          {/* 分隔 */}
          <Box sx={{ width: 1, height: 16, bgcolor: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

          {/* 横向状态指示 */}
          <StatusPanel
            status={status}
            isMonitoring={isMonitoring}
          />
        </Box>

        {/* ---- 中部主区域：双卡片铺满 ---- */}
        <StatsPanel
          totalDeaths={stats.totalDeaths}
          totalAfkMs={stats.totalAfkMs}
          isDead={status.isDead}
        />

        {/* ---- 底部操作栏 ---- */}
        <Box
          sx={{
            flexShrink: 0,
            px: 3,
            pb: 2,
            pt: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            borderTop: '1px solid rgba(255, 255, 255, 0.04)',
          }}
        >
          {/* 启动/停止按钮 */}
          <Box
            component="button"
            onClick={isMonitoring ? handleStop : handleStart}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1.5,
              px: 4,
              py: 1.4,
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: 600,
              letterSpacing: '0.02em',
              transition: 'all 250ms cubic-bezier(0.16, 1, 0.3, 1)',
              ...(isMonitoring
                ? {
                    bgcolor: 'rgba(232, 64, 87, 0.12)',
                    color: '#E84057',
                    border: '1px solid rgba(232, 64, 87, 0.25)',
                    '&:hover': {
                      bgcolor: 'rgba(232, 64, 87, 0.2)',
                      border: '1px solid rgba(232, 64, 87, 0.45)',
                    },
                  }
                : {
                    bgcolor: '#C89B3C',
                    color: '#08080C',
                    boxShadow: '0 0 0 1px rgba(200, 155, 60, 0.3), 0 2px 8px rgba(200, 155, 60, 0.15)',
                    '&:hover': {
                      bgcolor: '#D4A84B',
                      boxShadow: '0 0 0 1px rgba(200, 155, 60, 0.5), 0 4px 16px rgba(200, 155, 60, 0.25)',
                    },
                  }),
              '&:active': {
                transform: 'scale(0.97)',
              },
            }}
          >
            {/* 状态点 */}
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: isMonitoring ? '#E84057' : '#08080C',
                transition: 'background-color 300ms ease',
              }}
            />
            {isMonitoring ? '停止监控' : '启动监控'}
          </Box>

          {/* 配置按钮 */}
          <Box
            component="button"
            onClick={() => setConfigOpen(!configOpen)}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              bgcolor: 'rgba(255, 255, 255, 0.03)',
              color: '#989691',
              cursor: 'pointer',
              fontSize: '1.2rem',
              transition: 'all 200ms ease',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.06)',
                color: '#E8E6E3',
                borderColor: 'rgba(255, 255, 255, 0.15)',
              },
            }}
            title="配置设置"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </Box>
        </Box>

        {/* ---- 配置面板: 底部滑出覆盖层 ---- */}
        {configOpen && (
          <>
            {/* 背景遮罩 */}
            <Box
              onClick={() => setConfigOpen(false)}
              sx={{
                position: 'fixed',
                inset: 0,
                bgcolor: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(4px)',
                zIndex: 100,
              }}
            />
            {/* 面板 */}
            <Box
              className="slide-up-enter"
              sx={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 101,
                bgcolor: '#111118',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                boxShadow: '0 -4px 32px rgba(0, 0, 0, 0.5)',
                maxHeight: '70vh',
                overflow: 'auto',
                p: 3,
              }}
            >
              <ConfigPanel
                config={config}
                onConfigChange={handleConfigChange}
                isMonitoring={isMonitoring}
                onClose={() => setConfigOpen(false)}
              />
            </Box>
          </>
        )}
      </Box>
    </ThemeProvider>
  );
}

export default App;

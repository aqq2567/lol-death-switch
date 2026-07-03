import React, { useState, useEffect, useCallback } from 'react';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { voidRiftTheme, cloudDancerTheme } from './theme';
import StatusPanel from './components/StatusPanel';
import ConfigPanel from './components/ConfigPanel';
import StatsPanel from './components/StatsPanel';
import UrlManager from './components/UrlManager';
import CloseDialog from './components/CloseDialog';

/**
 * 今天摸鱼了吗 — LoL阵亡监控
 *
 * 布局:
 *   顶部 → "今天摸鱼了吗" 大字横排 + 状态指示
 *   中部 → 双卡片纵向铺满：累计阵亡 | 替你摸鱼的时间
 *   底部 → 启停按钮 + 配置入口
 */
function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [urlManagerOpen, setUrlManagerOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [customUrls, setCustomUrls] = useState([]);

  const theme = darkMode ? voidRiftTheme : cloudDancerTheme;
  const isDark = darkMode;

  const [status, setStatus] = useState({
    state: 'idle',
    message: '点击启动开始监控',
    isDead: false,
    deathCount: 0,
  });

  const [config, setConfig] = useState({
    target: 'https://www.douyin.com/?recommend=1',
    delaySeconds: 0,
  });

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

  useEffect(() => {
    if (!window.lolAPI) return;
    const cleanupStatus = window.lolAPI.onStatusUpdate((newStatus) => {
      setStatus((prev) => ({ ...prev, ...newStatus }));
      // 主进程可能在后台启动监控（托盘挂起路径），同步 isMonitoring
      if (newStatus.state && newStatus.state !== 'idle') {
        setIsMonitoring(true);
      }
    });
    return cleanupStatus;
  }, []);

  useEffect(() => {
    if (!window.lolAPI) return;
    window.lolAPI.getStats()
      .then(setStats)
      .catch((err) => console.error('加载统计失败:', err));
  }, []);

  // 加载自定义URL列表
  const refreshCustomUrls = useCallback(() => {
    if (!window.lolAPI) return;
    window.lolAPI.getCustomUrls()
      .then(setCustomUrls)
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshCustomUrls();
  }, [refreshCustomUrls]);

  useEffect(() => {
    if (!window.lolAPI) return;
    const cleanupStats = window.lolAPI.onStatsUpdate((newStats) => {
      setStats(newStats);
    });
    return cleanupStats;
  }, []);

  // 监听主进程关闭请求（用户点击窗口 ✕）→ 弹出自定义对话框
  useEffect(() => {
    if (!window.lolAPI) return;
    const cleanup = window.lolAPI.onCloseRequest(() => {
      setCloseDialogOpen(true);
    });
    return cleanup;
  }, []);

  const handleCloseChoice = useCallback((choice) => {
    setCloseDialogOpen(false);
    if (window.lolAPI) {
      window.lolAPI.resolveCloseChoice(choice).catch((err) => {
        console.error('[CloseDialog] 回传选择失败:', err);
      });
    }
  }, []);

  useEffect(() => {
    if (!window.lolAPI) return;
    window.lolAPI.getConfig()
      .then(setConfig)
      .catch((err) => console.error('获取初始配置失败:', err));
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <Box
        className={isDark ? 'void-bg' : ''}
        sx={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          userSelect: 'none',
          bgcolor: isDark ? undefined : '#F7F4F0',
        }}
      >
        {/* ======== 顶部：主题切换 + 标题 + 状态指示 ======== */}
        <Box
          sx={{
            flexShrink: 0,
            px: 3,
            py: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            borderBottom: isDark
              ? '1px solid rgba(255, 255, 255, 0.05)'
              : '1px solid rgba(0, 0, 0, 0.06)',
            position: 'relative',
          }}
        >
          {/* 主题切换按钮 */}
          <Box
            component="button"
            onClick={() => setDarkMode(!darkMode)}
            sx={{
              position: 'absolute',
              left: 16,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              border: isDark
                ? '1px solid rgba(255,255,255,0.08)'
                : '1px solid rgba(0,0,0,0.08)',
              borderRadius: '8px',
              bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
              color: isDark ? '#989691' : '#7A7672',
              cursor: 'pointer',
              fontSize: '1rem',
              transition: 'all 200ms ease',
              '&:hover': {
                bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                color: isDark ? '#E8E6E3' : '#2D2A26',
              },
            }}
            title={isDark ? '切换浅色' : '切换深色'}
          >
            {isDark ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </Box>

          {/* 标题 — 大字横排 */}
          <Box
            component="h1"
            className={isDark ? 'title-shimmer' : 'title-shimmer-light'}
            sx={{
              margin: 0,
              fontSize: '1.6rem',
              fontWeight: 800,
              letterSpacing: '0.06em',
              lineHeight: 1.2,
            }}
          >
            今天摸鱼了吗
          </Box>

          {/* 状态指示 — 紧贴标题右侧 */}
          <StatusPanel
            status={status}
            isMonitoring={isMonitoring}
            isDark={isDark}
          />
        </Box>

        {/* ======== 中部：双卡片主区域 ======== */}
        <StatsPanel
          totalDeaths={stats.totalDeaths}
          totalAfkMs={stats.totalAfkMs}
          isDead={status.isDead}
          isDark={isDark}
        />

        {/* ======== 底部：操作栏 ======== */}
        <Box
          sx={{
            flexShrink: 0,
            px: 3,
            pb: 2.5,
            pt: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            borderTop: isDark
              ? '1px solid rgba(255, 255, 255, 0.05)'
              : '1px solid rgba(0, 0, 0, 0.06)',
          }}
        >
          {/* 启动 / 停止 */}
          <Box
            component="button"
            onClick={isMonitoring ? handleStop : handleStart}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1.5,
              px: 5,
              py: 1.5,
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 700,
              letterSpacing: '0.03em',
              transition: 'all 250ms cubic-bezier(0.16, 1, 0.3, 1)',
              ...(isMonitoring
                ? {
                    bgcolor: 'rgba(232, 64, 87, 0.1)',
                    color: '#E84057',
                    border: '1px solid rgba(232, 64, 87, 0.25)',
                    '&:hover': {
                      bgcolor: 'rgba(232, 64, 87, 0.18)',
                      border: '1px solid rgba(232, 64, 87, 0.45)',
                    },
                  }
                : {
                    bgcolor: '#C89B3C',
                    color: '#0A0A0F',
                    boxShadow: '0 0 0 1px rgba(200, 155, 60, 0.35), 0 2px 12px rgba(200, 155, 60, 0.2)',
                    '&:hover': {
                      bgcolor: '#D4A84B',
                      boxShadow: '0 0 0 1px rgba(200, 155, 60, 0.55), 0 4px 20px rgba(200, 155, 60, 0.3)',
                    },
                  }),
              '&:active': {
                transform: 'scale(0.97)',
              },
            }}
          >
            {/* 状态圆点 */}
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                width: 9,
                height: 9,
                borderRadius: '50%',
                bgcolor: isMonitoring ? '#E84057' : '#0A0A0F',
                transition: 'background-color 300ms ease',
              }}
            />
            {isMonitoring ? '停止摸鱼' : '开始摸鱼'}
          </Box>

          {/* 配置按钮 */}
          <Box
            component="button"
            onClick={() => setConfigOpen(!configOpen)}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 46,
              height: 46,
              border: isDark
                ? '1px solid rgba(255, 255, 255, 0.08)'
                : '1px solid rgba(0, 0, 0, 0.08)',
              borderRadius: '10px',
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)',
              color: isDark ? '#989691' : '#7A7672',
              cursor: 'pointer',
              fontSize: '1.2rem',
              transition: 'all 200ms ease',
              '&:hover': {
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
                color: isDark ? '#E8E6E3' : '#2D2A26',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)',
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

        {/* ======== 配置面板: 底部滑出 ======== */}
        {configOpen && (
          <>
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
            <Box
              className="slide-up-enter"
              sx={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 101,
                bgcolor: isDark ? '#111118' : '#FFFFFF',
                borderTop: isDark
                  ? '1px solid rgba(255, 255, 255, 0.06)'
                  : '1px solid rgba(0, 0, 0, 0.06)',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                boxShadow: isDark
                  ? '0 -4px 32px rgba(0, 0, 0, 0.5)'
                  : '0 -4px 32px rgba(0, 0, 0, 0.1)',
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
                customUrls={customUrls}
                onManageUrls={() => {
                  setConfigOpen(false);
                  setUrlManagerOpen(true);
                }}
                isDark={isDark}
              />
            </Box>
          </>
        )}

        {/* ======== 跳转管理: 独立覆盖层 ======== */}
        {urlManagerOpen && (
          <UrlManager
            target={config.target}
            onTargetChange={(url) => {
              setConfig((prev) => ({ ...prev, target: url }));
              if (window.lolAPI) {
                window.lolAPI.setTargetUrl(url).catch(() => {});
              }
            }}
            onClose={() => {
              setUrlManagerOpen(false);
              refreshCustomUrls();
            }}
            isDark={isDark}
          />
        )}

        {/* ======== 关闭确认对话框 ======== */}
        <CloseDialog
          open={closeDialogOpen}
          isDark={isDark}
          onChoice={handleCloseChoice}
        />
      </Box>
    </ThemeProvider>
  );
}

export default App;

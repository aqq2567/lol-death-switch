import React, { useState, useEffect } from 'react';
import { Box, Typography, Slider, IconButton } from '@mui/material';

/**
 * 配置面板 — 底部滑出式
 *
 * 跳转目标、轮询间隔、阵亡延迟。
 * onClose 由父组件控制面板关闭。
 */
function ConfigPanel({ config, onConfigChange, isMonitoring, onClose }) {
  const [target, setTarget] = useState(config.target);
  const [pollIntervalSec, setPollIntervalSec] = useState(config.pollInterval / 1000);
  const [delaySeconds, setDelaySeconds] = useState(config.delaySeconds);

  useEffect(() => {
    setTarget(config.target);
    setPollIntervalSec(config.pollInterval / 1000);
    setDelaySeconds(config.delaySeconds);
  }, [config]);

  const handleTargetChange = (newTarget) => {
    setTarget(newTarget);
    onConfigChange({ target: newTarget });
  };

  const handlePollIntervalChange = (value) => {
    setPollIntervalSec(value);
    onConfigChange({ pollInterval: value * 1000 });
  };

  const handleDelayChange = (value) => {
    setDelaySeconds(value);
    onConfigChange({ delaySeconds: value });
  };

  // 平台选项定义
  const platforms = [
    {
      id: 'douyin',
      name: '抖音',
      color: '#FE2C55',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="6" width="20" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 10v4M12 10v4M16 10v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="10" cy="10" r="1.5" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'bilibili',
      name: 'B站',
      color: '#00A1D6',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M7 10l4 3-4 3V10zM14 10v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      id: 'both',
      name: '两者',
      color: '#C89B3C',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="5" width="9" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
          <rect x="13" y="5" width="9" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      ),
    },
  ];

  return (
    <Box>
      {/* 标题栏 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
        }}
      >
        <Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: '#E8E6E3',
              letterSpacing: '-0.01em',
              mb: 0.2,
            }}
          >
            配置设置
          </Typography>
          <Typography variant="caption" sx={{ color: '#5B5855' }}>
            {isMonitoring ? '监控运行中 · 实时生效' : '下次启动时生效'}
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: '#989691',
            '&:hover': { color: '#E8E6E3' },
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </IconButton>
      </Box>

      {/* ---- 跳转目标 ---- */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="caption"
          sx={{
            color: '#989691',
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            mb: 1.5,
            display: 'block',
          }}
        >
          跳转目标
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {platforms.map((p) => {
            const isActive = target === p.id;
            return (
              <Box
                key={p.id}
                component="button"
                onClick={() => handleTargetChange(p.id)}
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1,
                  py: 1.8,
                  border: '1px solid',
                  borderRadius: 2,
                  cursor: 'pointer',
                  bgcolor: isActive ? `${p.color}15` : 'transparent',
                  borderColor: isActive ? p.color : 'rgba(255,255,255,0.06)',
                  color: isActive ? p.color : '#989691',
                  transition: 'all 200ms ease',
                  '&:hover': {
                    borderColor: isActive ? p.color : 'rgba(255,255,255,0.15)',
                    color: isActive ? p.color : '#E8E6E3',
                  },
                }}
              >
                {p.icon}
                <Box
                  component="span"
                  sx={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                  }}
                >
                  {p.name}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* ---- 轮询间隔 ---- */}
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            mb: 1,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: '#989691',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            轮询间隔
          </Typography>
          <Typography
            sx={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#C89B3C',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {pollIntervalSec}s
          </Typography>
        </Box>
        <Slider
          value={pollIntervalSec}
          onChange={(_, v) => handlePollIntervalChange(v)}
          min={1}
          max={10}
          step={0.5}
          valueLabelDisplay="auto"
          valueLabelFormat={(v) => `${v}s`}
        />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            mt: 0.5,
          }}
        >
          <Typography variant="caption" sx={{ color: '#5B5855' }}>1s</Typography>
          <Typography variant="caption" sx={{ color: '#5B5855' }}>10s</Typography>
        </Box>
      </Box>

      {/* ---- 阵亡延迟 ---- */}
      <Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            mb: 1,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: '#989691',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            阵亡延迟跳转
          </Typography>
          <Typography
            sx={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#9FBEAD',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {delaySeconds === 0 ? '立即' : `${delaySeconds}s`}
          </Typography>
        </Box>
        <Slider
          value={delaySeconds}
          onChange={(_, v) => handleDelayChange(v)}
          min={0}
          max={15}
          step={1}
          valueLabelDisplay="auto"
          valueLabelFormat={(v) => (v === 0 ? '立即' : `${v}s`)}
          sx={{
            '& .MuiSlider-track': { bgcolor: '#9FBEAD' },
            '& .MuiSlider-thumb': {
              bgcolor: '#9FBEAD',
              boxShadow: '0 0 0 4px rgba(159, 190, 173, 0.2)',
              '&:hover': {
                boxShadow: '0 0 0 8px rgba(159, 190, 173, 0.15)',
              },
            },
          }}
        />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            mt: 0.5,
          }}
        >
          <Typography variant="caption" sx={{ color: '#5B5855' }}>立即</Typography>
          <Typography variant="caption" sx={{ color: '#5B5855' }}>15s</Typography>
        </Box>
        <Typography variant="caption" sx={{ color: '#5B5855', mt: 1, display: 'block' }}>
          阵亡后等待指定时间再跳转，给你一点反应缓冲
        </Typography>
      </Box>
    </Box>
  );
}

export default ConfigPanel;

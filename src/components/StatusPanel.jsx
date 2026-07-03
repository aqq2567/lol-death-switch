import React from 'react';
import { Box } from '@mui/material';

/**
 * 状态指示器 — 精简内联组件
 *
 * 顶部状态栏中的连接状态指示。
 * compact 模式：仅显示状态点 + 状态文字，无按钮。
 */
function StatusPanel({ status, isMonitoring }) {
  /**
   * 状态配置映射
   */
  const getStateConfig = () => {
    switch (status.state) {
      case 'idle':
        return {
          label: '待机',
          dotColor: '#5B5855',
          dotGlow: 'none',
        };
      case 'searching':
        return {
          label: '搜索中',
          dotColor: '#C89B3C',
          dotGlow: '0 0 6px rgba(200, 155, 60, 0.5)',
        };
      case 'no-game':
        return {
          label: '无游戏',
          dotColor: '#AABEE0',
          dotGlow: 'none',
        };
      case 'alive':
        return {
          label: '存活',
          dotColor: '#9FBEAD',
          dotGlow: '0 0 6px rgba(159, 190, 173, 0.5)',
        };
      case 'dead':
        return {
          label: '阵亡',
          dotColor: '#E84057',
          dotGlow: '0 0 8px rgba(232, 64, 87, 0.6)',
        };
      default:
        return {
          label: '未知',
          dotColor: '#5B5855',
          dotGlow: 'none',
        };
    }
  };

  const stateConfig = getStateConfig();

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 0.5,
        borderRadius: 6,
        bgcolor: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        transition: 'border-color 300ms ease',
        ...(status.state === 'dead' && {
          borderColor: 'rgba(232, 64, 87, 0.3)',
          bgcolor: 'rgba(232, 64, 87, 0.06)',
        }),
      }}
    >
      {/* 状态点 */}
      <Box
        sx={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          bgcolor: stateConfig.dotColor,
          boxShadow: stateConfig.dotGlow,
          transition: 'background-color 400ms ease, box-shadow 400ms ease',
          ...(status.state === 'dead' && {
            animation: 'death-pulse 1.2s ease-in-out infinite',
          }),
          ...(status.state === 'alive' && isMonitoring && {
            animation: 'status-breathing 2s ease-in-out infinite',
          }),
        }}
      />

      {/* 状态文字 */}
      <Box
        component="span"
        sx={{
          fontSize: '0.72rem',
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: status.state === 'dead' ? '#E84057' : '#989691',
          transition: 'color 400ms ease',
        }}
      >
        {stateConfig.label}
      </Box>
    </Box>
  );
}

export default StatusPanel;

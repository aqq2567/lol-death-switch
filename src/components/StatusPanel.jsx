import React from 'react';
import { Box } from '@mui/material';

function StatusPanel({ status, isMonitoring, isDark }) {
  const getStateConfig = () => {
    switch (status.state) {
      case 'idle':
        return { label: '待机', dotColor: isDark ? '#5B5855' : '#B5B1AB', dotGlow: 'none' };
      case 'searching':
        return { label: '搜索中', dotColor: '#C89B3C', dotGlow: '0 0 6px rgba(200, 155, 60, 0.5)' };
      case 'no-game':
        return { label: '无游戏', dotColor: isDark ? '#AABEE0' : '#6E8AB0', dotGlow: 'none' };
      case 'alive':
        return { label: '存活', dotColor: '#9FBEAD', dotGlow: '0 0 6px rgba(159, 190, 173, 0.5)' };
      case 'dead':
        return { label: '阵亡', dotColor: '#E84057', dotGlow: '0 0 8px rgba(232, 64, 87, 0.6)' };
      default:
        return { label: '未知', dotColor: isDark ? '#5B5855' : '#B5B1AB', dotGlow: 'none' };
    }
  };

  const cfg = getStateConfig();

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.8,
        px: 1.2,
        py: 0.4,
        borderRadius: 4,
        bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)',
        border: isDark
          ? '1px solid rgba(255, 255, 255, 0.06)'
          : '1px solid rgba(0, 0, 0, 0.06)',
        transition: 'border-color 300ms ease, background-color 300ms ease',
        flexShrink: 0,
        ...(status.state === 'dead' && {
          borderColor: 'rgba(232, 64, 87, 0.35)',
          bgcolor: 'rgba(232, 64, 87, 0.08)',
        }),
      }}
    >
      <Box
        sx={{
          width: 7, height: 7, borderRadius: '50%',
          bgcolor: cfg.dotColor,
          boxShadow: cfg.dotGlow,
          transition: 'background-color 400ms ease, box-shadow 400ms ease',
          ...(status.state === 'dead' && { animation: 'death-pulse 1.2s ease-in-out infinite' }),
          ...(status.state === 'alive' && isMonitoring && { animation: 'status-breathing 2s ease-in-out infinite' }),
          flexShrink: 0,
        }}
      />
      <Box
        component="span"
        sx={{
          fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.04em',
          textTransform: 'uppercase', whiteSpace: 'nowrap',
          color: status.state === 'dead' ? '#E84057' : isDark ? '#989691' : '#7A7672',
          transition: 'color 400ms ease',
        }}
      >
        {cfg.label}
      </Box>
    </Box>
  );
}

export default StatusPanel;

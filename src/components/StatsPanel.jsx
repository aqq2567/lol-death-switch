import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * 格式化毫秒时长 → "Xh Ymin Zs"
 * @param {number} ms
 * @returns {string}
 */
function formatAfkTime(ms) {
  if (!ms || ms <= 0) return '0s';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}min`);
  parts.push(`${seconds}s`);
  return parts.join(' ');
}

/**
 * 持久化统计面板 — 应用主视觉区域
 *
 * 一左一右两张大卡片铺满中部：
 *   左侧 → 累计阵亡
 *   右侧 → 替你摸鱼的时间
 *
 * @param {{ totalDeaths: number, totalAfkMs: number, isDead: boolean }} props
 */
function StatsPanel({ totalDeaths, totalAfkMs, isDead }) {
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        gap: 2,
        px: 3,
        py: 3,
        minHeight: 0,
      }}
    >
      {/* ====== 累计阵亡 ====== */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '14px',
          bgcolor: 'rgba(255, 255, 255, 0.025)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'border-color 350ms ease, background-color 350ms ease',
          ...(isDead && {
            borderColor: 'rgba(232, 64, 87, 0.25)',
            bgcolor: 'rgba(232, 64, 87, 0.04)',
          }),
        }}
      >
        {/* 阵亡时的红色光晕 */}
        {isDead && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(232, 64, 87, 0.06) 0%, transparent 70%)',
              animation: 'death-pulse 1.2s ease-in-out infinite',
              pointerEvents: 'none',
            }}
          />
        )}

        <Typography
          variant="caption"
          sx={{
            color: '#5B5855',
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            mb: 2,
            position: 'relative',
            zIndex: 1,
          }}
        >
          累计阵亡
        </Typography>

        <Box
          sx={{
            fontSize: 'clamp(3rem, 10vw, 5.5rem)',
            fontWeight: 800,
            color: isDead ? '#E84057' : '#C89B3C',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
            letterSpacing: '-0.03em',
            position: 'relative',
            zIndex: 1,
            transition: 'color 500ms ease',
            textShadow: isDead
              ? '0 0 40px rgba(232, 64, 87, 0.35)'
              : '0 0 20px rgba(200, 155, 60, 0.15)',
          }}
        >
          {totalDeaths}
        </Box>

        <Typography
          variant="caption"
          sx={{
            color: '#5B5855',
            fontSize: '0.65rem',
            mt: 2,
            position: 'relative',
            zIndex: 1,
          }}
        >
          总死亡次数
        </Typography>
      </Box>

      {/* ====== 替你摸鱼的时间 ====== */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '14px',
          bgcolor: 'rgba(255, 255, 255, 0.025)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          transition: 'border-color 350ms ease, background-color 350ms ease',
          ...(isDead && {
            borderColor: 'rgba(159, 190, 173, 0.25)',
            bgcolor: 'rgba(159, 190, 173, 0.03)',
          }),
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: '#5B5855',
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            mb: 2,
          }}
        >
          替你摸鱼的时间
        </Typography>

        <Box
          sx={{
            fontSize: 'clamp(1.4rem, 4vw, 2.4rem)',
            fontWeight: 700,
            color: isDead ? '#9FBEAD' : '#9FBEAD',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
            textAlign: 'center',
            px: 1,
            transition: 'opacity 400ms ease',
            opacity: isDead ? 0.7 : 1,
          }}
        >
          {formatAfkTime(totalAfkMs)}
        </Box>

        <Typography
          variant="caption"
          sx={{
            color: '#5B5855',
            fontSize: '0.65rem',
            mt: 2,
          }}
        >
          阵亡切换总时长
        </Typography>
      </Box>
    </Box>
  );
}

export default StatsPanel;

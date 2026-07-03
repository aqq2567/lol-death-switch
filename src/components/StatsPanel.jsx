import React from 'react';
import { Box, Typography } from '@mui/material';

function formatAfkTime(ms) {
  if (!ms || ms <= 0) return '0s';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = [];
  if (h > 0) p.push(`${h}h`);
  if (m > 0) p.push(`${m}min`);
  p.push(`${sec}s`);
  return p.join(' ');
}

function StatsPanel({ totalDeaths, totalAfkMs, isDead, isDark }) {
  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, px: 3, py: 2, minHeight: 0 }}>
      {/* ====== 累计阵亡 ====== */}
      <Box
        className={isDead ? 'death-glow' : ''}
        sx={{
          flex: 1, minHeight: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          borderRadius: '16px', position: 'relative', overflow: 'hidden',
          transition: 'all 400ms cubic-bezier(0.16, 1, 0.3, 1)',
          ...(isDead
            ? {
                bgcolor: 'rgba(232, 64, 87, 0.08)',
                border: '1px solid rgba(232, 64, 87, 0.3)',
                boxShadow: 'inset 0 0 80px rgba(232, 64, 87, 0.04)',
              }
            : {
                bgcolor: isDark ? 'rgba(200, 155, 60, 0.04)' : 'rgba(184, 135, 74, 0.06)',
                border: isDark ? '1px solid rgba(200, 155, 60, 0.15)' : '1px solid rgba(184, 135, 74, 0.15)',
                boxShadow: isDark ? 'inset 0 0 60px rgba(200, 155, 60, 0.02)' : 'none',
              }),
        }}
      >
        {isDead && (
          <Box
            sx={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)', width: '70%', height: '70%',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(232, 64, 87, 0.12) 0%, transparent 70%)',
              animation: 'death-pulse 1.2s ease-in-out infinite', pointerEvents: 'none',
            }}
          />
        )}
        <Typography
          sx={{
            fontSize: '1.15rem', fontWeight: 800, letterSpacing: '0.12em',
            textTransform: 'uppercase', mb: 2, position: 'relative', zIndex: 1,
            transition: 'color 400ms ease',
            color: isDead ? 'rgba(232, 64, 87, 0.85)' : isDark ? 'rgba(200, 155, 60, 0.7)' : 'rgba(184, 135, 74, 0.7)',
          }}
        >
          累计阵亡
        </Typography>
        <Box
          sx={{
            fontSize: 'clamp(5rem, 16vw, 9rem)', fontWeight: 900,
            color: isDead ? '#E84057' : isDark ? '#C89B3C' : '#B8874A',
            fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: '-0.04em',
            position: 'relative', zIndex: 1, transition: 'color 500ms ease, text-shadow 500ms ease',
            textShadow: isDead
              ? '0 0 60px rgba(232, 64, 87, 0.5), 0 0 120px rgba(232, 64, 87, 0.2)'
              : isDark ? '0 0 40px rgba(200, 155, 60, 0.25)' : 'none',
            ...(isDead && { animation: 'death-pulse 1.2s ease-in-out infinite' }),
          }}
        >
          {totalDeaths}
        </Box>
        <Typography
          sx={{
            fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.06em',
            mt: 2, position: 'relative', zIndex: 1, transition: 'color 400ms ease',
            color: isDead ? 'rgba(232, 64, 87, 0.45)' : isDark ? 'rgba(200, 155, 60, 0.35)' : 'rgba(184, 135, 74, 0.4)',
          }}
        >
          总死亡次数
        </Typography>
      </Box>

      {/* ====== 替你摸鱼的时间 ====== */}
      <Box
        sx={{
          flex: 1, minHeight: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          borderRadius: '16px', position: 'relative', overflow: 'hidden',
          transition: 'all 400ms cubic-bezier(0.16, 1, 0.3, 1)',
          ...(isDead
            ? {
                bgcolor: 'rgba(159, 190, 173, 0.04)',
                border: '1px solid rgba(159, 190, 173, 0.25)',
                boxShadow: 'inset 0 0 80px rgba(159, 190, 173, 0.03)',
              }
            : {
                bgcolor: isDark ? 'rgba(159, 190, 173, 0.03)' : 'rgba(123, 160, 138, 0.05)',
                border: isDark ? '1px solid rgba(159, 190, 173, 0.1)' : '1px solid rgba(123, 160, 138, 0.12)',
                boxShadow: isDark ? 'inset 0 0 40px rgba(159, 190, 173, 0.015)' : 'none',
              }),
        }}
      >
        {isDead && (
          <Box
            sx={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)', width: '60%', height: '60%',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(159, 190, 173, 0.08) 0%, transparent 70%)',
              animation: 'status-breathing 2s ease-in-out infinite', pointerEvents: 'none',
            }}
          />
        )}
        <Typography
          sx={{
            fontSize: '1.15rem', fontWeight: 800, letterSpacing: '0.12em',
            textTransform: 'uppercase', mb: 2, position: 'relative', zIndex: 1,
            color: isDark ? 'rgba(159, 190, 173, 0.65)' : 'rgba(123, 160, 138, 0.65)',
          }}
        >
          替你摸鱼的时间
        </Typography>
        <Box
          sx={{
            fontSize: 'clamp(2.2rem, 6vw, 4rem)', fontWeight: 800,
            color: isDark ? '#9FBEAD' : '#7BA08A',
            fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, letterSpacing: '-0.02em',
            textAlign: 'center', px: 2, position: 'relative', zIndex: 1,
            textShadow: isDark ? '0 0 30px rgba(159, 190, 173, 0.2)' : 'none',
            transition: 'opacity 400ms ease', opacity: isDead ? 0.6 : 1,
          }}
        >
          {formatAfkTime(totalAfkMs)}
        </Box>
        <Typography
          sx={{
            fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.06em',
            mt: 2, position: 'relative', zIndex: 1,
            color: isDark ? 'rgba(159, 190, 173, 0.35)' : 'rgba(123, 160, 138, 0.4)',
          }}
        >
          阵亡切换总时长
        </Typography>
      </Box>
    </Box>
  );
}

export default StatsPanel;

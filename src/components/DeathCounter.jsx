import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';

/**
 * 阵亡计数器 — 虚空裂隙视觉焦点
 *
 * 占据屏幕中央，大字体显示阵亡数字。
 * 存活 = 暗金安静、呼吸光圈
 * 阵亡 = 红色脉冲、光晕放大、数字闪烁
 * 无游戏 = 等待提示
 */
function DeathCounter({ deathCount, isDead, statusState, message }) {
  const prevCount = useRef(deathCount);
  const [bump, setBump] = useState(false);

  // 阵亡计数增加时触发弹跳动画
  useEffect(() => {
    if (deathCount > prevCount.current) {
      setBump(true);
      const timer = setTimeout(() => setBump(false), 400);
      prevCount.current = deathCount;
      return () => clearTimeout(timer);
    }
    prevCount.current = deathCount;
  }, [deathCount]);

  // 无游戏 / 空闲态
  if (statusState === 'idle' || statusState === 'no-game') {
    return (
      <Box sx={{ textAlign: 'center', opacity: 0.5 }}>
        <Box
          sx={{
            fontSize: '6rem',
            fontWeight: 200,
            color: '#5B5855',
            lineHeight: 1,
            mb: 2,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          —
        </Box>
        <Typography
          variant="body2"
          sx={{ color: '#5B5855', fontSize: '0.9rem', letterSpacing: '0.04em' }}
        >
          {statusState === 'no-game' ? '未检测到游戏' : '等待启动'}
        </Typography>
      </Box>
    );
  }

  // 存活 / 阵亡态
  const digitColor = isDead ? '#E84057' : '#C89B3C';
  const glowColor = isDead
    ? 'rgba(232, 64, 87, 0.08)'
    : 'rgba(200, 155, 60, 0.04)';

  return (
    <Box sx={{ textAlign: 'center', position: 'relative' }}>
      {/* 背景光晕 */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: isDead ? 320 : 240,
          height: isDead ? 320 : 240,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          transition: 'all 600ms cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: 'none',
        }}
      />

      {/* 标签 */}
      <Box
        sx={{
          fontSize: '0.7rem',
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: isDead ? '#E84057' : '#5B5855',
          mb: 1.5,
          transition: 'color 400ms ease',
        }}
      >
        {isDead ? 'YOU HAVE BEEN SLAIN' : 'DEATH COUNTER'}
      </Box>

      {/* 大数字 */}
      <Box
        key={deathCount}
        className={bump ? 'count-bump' : ''}
        sx={{
          fontSize: 'clamp(5rem, 18vw, 10rem)',
          fontWeight: 800,
          lineHeight: 1,
          color: digitColor,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.03em',
          transition: 'color 500ms ease',
          textShadow: isDead
            ? '0 0 60px rgba(232, 64, 87, 0.4), 0 0 120px rgba(232, 64, 87, 0.15)'
            : '0 0 30px rgba(200, 155, 60, 0.2), 0 0 60px rgba(200, 155, 60, 0.08)',
          ...(isDead && { animation: 'death-pulse 1.2s ease-in-out infinite' }),
          // 如果用户开启了 reduced-motion
          '@media (prefers-reduced-motion: reduce)': {
            animation: 'none',
            textShadow: 'none',
          },
        }}
      >
        {deathCount}
      </Box>

      {/* 状态副文本 */}
      <Box
        sx={{
          mt: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
        }}
      >
        {/* 状态指示点 */}
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: isDead ? '#E84057' : '#9FBEAD',
            boxShadow: isDead
              ? '0 0 8px rgba(232, 64, 87, 0.6)'
              : '0 0 8px rgba(159, 190, 173, 0.6)',
            transition: 'all 400ms ease',
            ...(!isDead && { animation: 'status-breathing 2s ease-in-out infinite' }),
          }}
        />
        <Typography
          variant="body2"
          sx={{
            color: isDead ? '#E84057' : '#9FBEAD',
            fontSize: '0.9rem',
            fontWeight: 500,
            letterSpacing: '0.03em',
            transition: 'color 400ms ease',
          }}
        >
          {isDead ? 'DEAD' : 'ALIVE'}
        </Typography>
      </Box>

      {/* 提示信息 */}
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          mt: 0.5,
          color: isDead ? 'rgba(232, 64, 87, 0.6)' : '#5B5855',
          fontSize: '0.75rem',
          transition: 'color 400ms ease',
        }}
      >
        {message}
      </Typography>
    </Box>
  );
}

export default DeathCounter;

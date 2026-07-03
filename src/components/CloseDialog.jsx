import React, { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';

/**
 * 关闭确认对话框 — 自定义风格覆盖层
 *
 * 用户点击窗口 ✕ 时弹出，三选一：
 *   "彻底关闭" — 退出程序
 *   "挂在后台" — 最小化到系统托盘 + 自动启动监控
 *   "取消"     — 什么都不做
 */
function CloseDialog({ open, isDark = true, onChoice }) {
  const cancelRef = useRef(null);

  // 打开时自动聚焦取消按钮
  useEffect(() => {
    if (open && cancelRef.current) {
      cancelRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  const c = (dark, light) => isDark ? dark : light;

  return (
    <>
      {/* 遮罩层 */}
      <Box
        onClick={() => onChoice('cancel')}
        sx={{
          position: 'fixed',
          inset: 0,
          bgcolor: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(6px)',
          zIndex: 200,
        }}
      />

      {/* 对话框卡片 — 居中 */}
      <Box
        sx={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 201,
          width: 'calc(100vw - 64px)',
          maxWidth: 360,
          bgcolor: isDark ? '#16161E' : '#FFFFFF',
          border: isDark
            ? '1px solid rgba(255, 255, 255, 0.08)'
            : '1px solid rgba(0, 0, 0, 0.08)',
          borderRadius: 3,
          boxShadow: isDark
            ? '0 16px 64px rgba(0, 0, 0, 0.6)'
            : '0 16px 64px rgba(0, 0, 0, 0.12)',
          p: 3.5,
          pointerEvents: 'auto',
          animation: 'dialog-enter 250ms cubic-bezier(0.16, 1, 0.3, 1)',
          '@keyframes dialog-enter': {
            from: { opacity: 0, transform: 'translate(-50%, -48%) scale(0.96)' },
            to: { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
          },
        }}
      >
        {/* 标题 */}
        <Typography
          sx={{
            fontSize: '1.15rem',
            fontWeight: 700,
            color: c('#E8E6E3', '#2D2A26'),
            letterSpacing: '-0.01em',
            mb: 1,
            textAlign: 'center',
          }}
        >
          要彻底关闭吗？
        </Typography>

        {/* 说明 */}
        <Typography
          sx={{
            fontSize: '0.85rem',
            color: c('#989691', '#7A7672'),
            lineHeight: 1.6,
            mb: 3,
            textAlign: 'center',
          }}
        >
          选择"挂在后台"会将程序最小化到系统托盘，并自动开启监控。
        </Typography>

        {/* 三按钮 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
          {/* 挂在后台 — 主操作 */}
          <Box
            component="button"
            onClick={() => onChoice('tray')}
            sx={{
              width: '100%',
              py: 1.4,
              border: 'none',
              borderRadius: 2,
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: 700,
              letterSpacing: '0.03em',
              bgcolor: '#C89B3C',
              color: '#0A0A0F',
              transition: 'all 200ms ease',
              '&:hover': {
                bgcolor: '#D4A84B',
                boxShadow: '0 4px 20px rgba(200, 155, 60, 0.25)',
              },
              '&:active': { transform: 'scale(0.98)' },
            }}
          >
            挂在后台
          </Box>

          {/* 彻底关闭 — 危险操作 */}
          <Box
            component="button"
            onClick={() => onChoice('quit')}
            sx={{
              width: '100%',
              py: 1.2,
              border: '1px solid rgba(232, 64, 87, 0.25)',
              borderRadius: 2,
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 600,
              letterSpacing: '0.02em',
              bgcolor: 'transparent',
              color: '#E84057',
              transition: 'all 200ms ease',
              '&:hover': {
                bgcolor: 'rgba(232, 64, 87, 0.08)',
                borderColor: 'rgba(232, 64, 87, 0.45)',
              },
              '&:active': { transform: 'scale(0.98)' },
            }}
          >
            彻底关闭
          </Box>

          {/* 取消 */}
          <Box
            ref={cancelRef}
            component="button"
            onClick={() => onChoice('cancel')}
            sx={{
              width: '100%',
              py: 1.2,
              border: isDark
                ? '1px solid rgba(255, 255, 255, 0.06)'
                : '1px solid rgba(0, 0, 0, 0.06)',
              borderRadius: 2,
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 500,
              bgcolor: 'transparent',
              color: c('#989691', '#7A7672'),
              transition: 'all 200ms ease',
              '&:hover': {
                bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                color: c('#E8E6E3', '#2D2A26'),
              },
              '&:active': { transform: 'scale(0.98)' },
            }}
          >
            取消
          </Box>
        </Box>
      </Box>
    </>
  );
}

export default CloseDialog;

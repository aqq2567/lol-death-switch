import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, IconButton, TextField } from '@mui/material';

/**
 * 跳转目标管理页 — 底部滑出覆盖层
 *
 * 自定义URL的增删都在这里完成。
 * 主配置面板只通过"管理跳转"按钮进入此页面。
 *
 * @param {{ target: string, onTargetChange: (url: string) => void, onClose: () => void }} props
 */
function UrlManager({ target, onTargetChange, onClose, isDark = true }) {
  const [customUrls, setCustomUrls] = useState([]);
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const c = (dark, light) => isDark ? dark : light;
  const [adding, setAdding] = useState(false);
  const labelRef = useRef(null);

  // 加载已保存的自定义列表
  useEffect(() => {
    if (window.lolAPI) {
      window.lolAPI.getCustomUrls().then(setCustomUrls).catch((e) => {
        console.error('[UrlManager] 加载自定义URL失败:', e);
      });
    }
  }, []);

  // 自动聚焦备注输入框
  useEffect(() => {
    labelRef.current?.focus();
  }, []);

  const handleAdd = async () => {
    const trimmedLabel = label.trim();
    const trimmedUrl = url.trim();
    if (!trimmedLabel || !trimmedUrl) return;
    if (!/^https?:\/\/.+/.test(trimmedUrl)) {
      console.warn('[UrlManager] URL格式无效:', trimmedUrl);
      return;
    }

    setAdding(true);
    try {
      const updated = await window.lolAPI.addCustomUrl({
        label: trimmedLabel,
        url: trimmedUrl,
      });
      setCustomUrls(updated);
      setLabel('');
      setUrl('');
      labelRef.current?.focus();
    } catch (e) {
      console.error('[UrlManager] 添加失败:', e);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (item) => {
    try {
      const updated = await window.lolAPI.deleteCustomUrl(item.url);
      setCustomUrls(updated);
      if (target === item.url) {
        onTargetChange('https://www.douyin.com/?recommend=1');
      }
    } catch (e) {
      console.error('[UrlManager] 删除失败:', e);
    }
  };

  const canAdd = label.trim().length > 0 && url.trim().length > 0 && !adding;

  return (
    <>
      {/* 背景遮罩 */}
      <Box
        onClick={onClose}
        sx={{
          position: 'fixed',
          inset: 0,
          bgcolor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 102,
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
          zIndex: 103,
          bgcolor: c('#111118', '#FFFFFF'),
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          boxShadow: '0 -4px 32px rgba(0, 0, 0, 0.5)',
          maxHeight: '75vh',
          overflow: 'auto',
          p: 3,
          pointerEvents: 'auto',
        }}
      >
        {/* 标题栏 */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 3,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: c('#E8E6E3', '#2D2A26'),
              letterSpacing: '-0.01em',
            }}
          >
            管理跳转目标
          </Typography>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ color: c('#989691', '#7A7672'), '&:hover': { color: c('#E8E6E3', '#2D2A26') } }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </IconButton>
        </Box>

        {/* ---- 新增表单 ---- */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
            <TextField
              inputRef={labelRef}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="备注名称"
              size="small"
              sx={{
                flex: '0 0 120px',
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255,255,255,0.03)',
                  borderRadius: 2,
                  fontSize: '0.85rem',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
                  '&.Mui-focused fieldset': { borderColor: '#C89B3C' },
                  '& input': {
                    color: c('#E8E6E3', '#2D2A26'),
                    '&::placeholder': { color: c('#5B5855', '#B5B1AB'), opacity: 1 },
                  },
                },
              }}
            />
            <TextField
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="跳转网址 (https://...)"
              size="small"
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255,255,255,0.03)',
                  borderRadius: 2,
                  fontSize: '0.85rem',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
                  '&.Mui-focused fieldset': { borderColor: '#C89B3C' },
                  '& input': {
                    color: c('#E8E6E3', '#2D2A26'),
                    '&::placeholder': { color: c('#5B5855', '#B5B1AB'), opacity: 1 },
                  },
                },
              }}
            />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Box
              component="button"
              onClick={handleAdd}
              disabled={!canAdd}
              sx={{
                minWidth: 72,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                py: 1,
                px: 2.5,
                border: 'none',
                borderRadius: '8px',
                cursor: canAdd ? 'pointer' : 'not-allowed',
                fontSize: '0.85rem',
                fontWeight: 600,
                letterSpacing: '0.02em',
                transition: 'all 200ms ease',
                ...(canAdd
                  ? {
                      bgcolor: 'rgba(200,155,60,0.12)',
                      color: c('#C89B3C', '#B8874A'),
                      border: '1px solid rgba(200,155,60,0.2)',
                      '&:hover': {
                        bgcolor: 'rgba(200,155,60,0.2)',
                        borderColor: 'rgba(200,155,60,0.35)',
                      },
                    }
                  : {
                      bgcolor: 'rgba(255,255,255,0.03)',
                      color: c('#5B5855', '#B5B1AB'),
                      border: '1px solid rgba(255,255,255,0.06)',
                    }),
                '&:active': {
                  transform: 'scale(0.97)',
                },
              }}
            >
              添加
            </Box>
          </Box>
        </Box>

        {/* ---- 已保存列表 ---- */}
        {customUrls.length > 0 && (
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: c('#5B5855', '#B5B1AB'),
                fontWeight: 600,
                letterSpacing: '0.04em',
                display: 'block',
                mb: 1,
              }}
            >
              已保存的跳转目标
            </Typography>

            {customUrls.map((item) => (
              <Box
                key={item.url}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  py: 1.2,
                  px: 1.5,
                  borderRadius: 2,
                  bgcolor: 'rgba(170,190,224,0.04)',
                  border: '1px solid rgba(170,190,224,0.08)',
                  mb: 0.8,
                  transition: 'background-color 200ms ease',
                  '&:hover': {
                    bgcolor: 'rgba(170,190,224,0.07)',
                  },
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: '#AABEE0',
                      lineHeight: 1.3,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.label}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.72rem',
                      color: c('#5B5855', '#B5B1AB'),
                      lineHeight: 1.3,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      mt: 0.2,
                    }}
                  >
                    {item.url}
                  </Typography>
                </Box>

                <IconButton
                  onClick={() => handleDelete(item)}
                  size="small"
                  sx={{
                    width: 26,
                    height: 26,
                    color: c('#5B5855', '#B5B1AB'),
                    flexShrink: 0,
                    '&:hover': {
                      color: '#E84057',
                      bgcolor: 'rgba(232,64,87,0.1)',
                    },
                    transition: 'all 150ms ease',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </IconButton>
              </Box>
            ))}
          </Box>
        )}

        {/* 空状态 */}
        {customUrls.length === 0 && (
          <Typography
            sx={{
              textAlign: 'center',
              color: c('#5B5855', '#B5B1AB'),
              fontSize: '0.85rem',
              py: 4,
            }}
          >
            暂无自定义跳转目标，在上方添加
          </Typography>
        )}
      </Box>
    </>
  );
}

export default UrlManager;

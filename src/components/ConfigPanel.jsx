import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Slider,
  IconButton,
  Select,
  MenuItem,
  Button,
} from '@mui/material';

/** 预设跳转目标 */
const PRESETS = [
  { label: '抖音', value: 'https://www.douyin.com/?recommend=1' },
  { label: 'B站', value: 'https://www.bilibili.com' },
];

/**
 * 配置面板 — 底部滑出式
 *
 * 跳转目标（下拉 + 管理按钮）、阵亡延迟。
 * 自定义URL的增删通过 onManageUrls → UrlManager 完成。
 */
function ConfigPanel({ config, onConfigChange, isMonitoring, onClose, customUrls, onManageUrls, isDark = true }) {
  const [target, setTarget] = useState(config.target);
  const [delaySeconds, setDelaySeconds] = useState(config.delaySeconds);

  // 同步外部 config 变更
  useEffect(() => {
    setTarget(config.target);
    setDelaySeconds(config.delaySeconds);
  }, [config]);

  const c = (dark, light) => isDark ? dark : light;

  // ---- 跳转目标 ----
  const handleTargetChange = (url) => {
    setTarget(url);
    onConfigChange({ target: url });
    if (window.lolAPI) {
      window.lolAPI.setTargetUrl(url).catch(() => {});
    }
  };

  // ---- 延迟 ----
  const handleDelayChange = (value) => {
    setDelaySeconds(value);
    onConfigChange({ delaySeconds: value });
  };

  // 找出当前选中项对应的显示名称
  const selectedPreset = PRESETS.find((p) => p.value === target);
  const selectedCustom = (customUrls || []).find((c) => c.url === target);
  const selectedLabel = selectedPreset?.label || selectedCustom?.label || target;

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
              color: c('#E8E6E3', '#2D2A26'),
              letterSpacing: '-0.01em',
              mb: 0.2,
            }}
          >
            配置设置
          </Typography>
          <Typography variant="caption" sx={{ color: c('#5B5855', '#B5B1AB') }}>
            {isMonitoring ? '监控运行中 · 实时生效' : '下次启动时生效'}
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: c('#989691', '#7A7672'),
            '&:hover': { color: c('#E8E6E3', '#2D2A26') },
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
            color: c('#989691', '#7A7672'),
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            mb: 1.5,
            display: 'block',
          }}
        >
          跳转目标
        </Typography>

        {/* 下拉选择 */}
        <Select
          value={target}
          onChange={(e) => handleTargetChange(e.target.value)}
          renderValue={() => selectedLabel}
          fullWidth
          size="small"
          MenuProps={{
            PaperProps: {
              sx: {
                bgcolor: c('#16161E', '#FFFFFF'),
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                mt: 0.5,
              },
            },
          }}
          sx={{
            bgcolor: c('rgba(255,255,255,0.03)', 'rgba(0,0,0,0.03)'),
            borderRadius: 2,
            fontSize: '0.9rem',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: c('rgba(255,255,255,0.08)', 'rgba(0,0,0,0.08)'),
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255,255,255,0.15)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#C89B3C',
            },
            '& .MuiSelect-select': {
              py: 1.2,
            },
            '& .MuiSelect-icon': {
              color: c('#989691', '#7A7672'),
            },
          }}
        >
          {/* 预设选项 */}
          {PRESETS.map((p) => (
            <MenuItem
              key={p.value}
              value={p.value}
              sx={{
                fontSize: '0.9rem',
                color: c('#E8E6E3', '#2D2A26'),
                '&:hover': { bgcolor: 'rgba(200,155,60,0.08)' },
                '&.Mui-selected': {
                  bgcolor: 'rgba(200,155,60,0.12)',
                  '&:hover': { bgcolor: 'rgba(200,155,60,0.16)' },
                },
              }}
            >
              {p.label}
            </MenuItem>
          ))}

          {/* 自定义选项（显示备注名称） */}
          {customUrls.length > 0 && (
            <Box
              component="li"
              sx={{
                px: 2,
                py: 0.8,
                fontSize: '0.7rem',
                color: c('#5B5855', '#B5B1AB'),
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                pointerEvents: 'none',
              }}
            >
              自定义
            </Box>
          )}
          {customUrls.map((item) => (
            <MenuItem
              key={item.url}
              value={item.url}
              sx={{
                fontSize: '0.85rem',
                color: c('#AABEE0', '#6E8AB0'),
                '&:hover': { bgcolor: 'rgba(170,190,224,0.08)' },
                '&.Mui-selected': {
                  bgcolor: 'rgba(170,190,224,0.12)',
                  '&:hover': { bgcolor: 'rgba(170,190,224,0.16)' },
                },
                maxWidth: 320,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.label}
            </MenuItem>
          ))}
        </Select>

        {/* 管理按钮 */}
        <Box sx={{ mt: 1.5 }}>
          <Button
            onClick={onManageUrls}
            variant="outlined"
            fullWidth
            sx={{
              borderColor: c('rgba(255,255,255,0.08)', 'rgba(0,0,0,0.08)'),
              color: c('#989691', '#7A7672'),
              fontWeight: 500,
              fontSize: '0.85rem',
              borderRadius: 2,
              textTransform: 'none',
              py: 1,
              '&:hover': {
                borderColor: 'rgba(200,155,60,0.35)',
                color: '#C89B3C',
                bgcolor: 'rgba(200,155,60,0.04)',
              },
            }}
          >
            管理跳转
          </Button>
        </Box>
      </Box>

      {/* ---- 阵亡延迟跳转 ---- */}
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
              color: c('#989691', '#7A7672'),
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
            {delaySeconds === 0 ? '立即' : `${delaySeconds.toFixed(1)}s`}
          </Typography>
        </Box>
        <Slider
          value={delaySeconds}
          onChange={(_, v) => handleDelayChange(v)}
          min={0}
          max={1}
          step={0.2}
          valueLabelDisplay="auto"
          valueLabelFormat={(v) => (v === 0 ? '立即' : `${v.toFixed(1)}s`)}
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
          <Typography variant="caption" sx={{ color: c('#5B5855', '#B5B1AB') }}>立即</Typography>
          <Typography variant="caption" sx={{ color: c('#5B5855', '#B5B1AB') }}>1s</Typography>
        </Box>
        <Typography variant="caption" sx={{ color: c('#5B5855', '#B5B1AB'), mt: 1, display: 'block' }}>
          阵亡后等待指定时间再跳转，给你一点反应缓冲
        </Typography>
      </Box>
    </Box>
  );
}

export default ConfigPanel;

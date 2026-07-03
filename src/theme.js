import { createTheme } from '@mui/material/styles';

// ============================================================
// 共享组件覆写（dark / light 共用结构，颜色分别注入）
// ============================================================

const sharedComponents = (palette) => ({
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        backgroundColor: palette.background.default,
        scrollbarWidth: 'thin',
        scrollbarColor: `${palette.text.disabled} ${palette.background.paper}`,
      },
    },
  },

  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
        backgroundColor: palette.background.paper,
        border: `1px solid ${palette.divider}`,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.03)',
        transition: 'border-color 300ms ease, box-shadow 300ms ease',
      },
    },
  },

  MuiButton: {
    styleOverrides: {
      root: {
        fontWeight: 600,
        textTransform: 'none',
        letterSpacing: '0.01em',
        borderRadius: 6,
        padding: '10px 24px',
        fontSize: '0.95rem',
        transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        '&:active': { transform: 'scale(0.97)' },
      },
      containedPrimary: {
        backgroundColor: palette.primary.main,
        color: palette.primary.contrastText,
        boxShadow: `0 0 0 1px ${palette.primary.main}4D, 0 2px 8px ${palette.primary.main}26`,
        '&:hover': {
          backgroundColor: palette.primary.light,
          boxShadow: `0 0 0 1px ${palette.primary.main}80, 0 4px 16px ${palette.primary.main}40`,
        },
      },
    },
  },

  MuiSelect: {
    styleOverrides: {
      root: { color: palette.text.primary },
      icon: { color: palette.text.secondary },
    },
  },

  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-notchedOutline': { borderColor: palette.divider },
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: palette.text.disabled },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: palette.primary.main },
      },
    },
  },

  MuiInputLabel: {
    styleOverrides: {
      root: {
        color: palette.text.secondary,
        '&.Mui-focused': { color: palette.primary.main },
      },
    },
  },

  MuiSlider: {
    styleOverrides: {
      root: { height: 4 },
      thumb: {
        width: 18, height: 18,
        boxShadow: `0 0 0 4px ${palette.primary.main}33`,
        '&:hover': { boxShadow: `0 0 0 8px ${palette.primary.main}26` },
      },
      track: { border: 'none' },
      rail: { backgroundColor: palette.divider },
    },
  },

  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        backgroundColor: palette.background.paper,
        border: `1px solid ${palette.divider}`,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
        borderRadius: 6,
        fontSize: '0.8rem',
        padding: '8px 12px',
      },
    },
  },

  MuiChip: {
    styleOverrides: {
      root: {
        fontWeight: 600,
        fontSize: '0.75rem',
        letterSpacing: '0.02em',
        borderRadius: 6,
        height: 28,
      },
    },
  },
});

// ============================================================
// Void Rift — 深色主题
// ============================================================

const voidRiftTheme = createTheme({
  palette: {
    mode: 'dark',
    primary:    { main: '#C89B3C', light: '#D4A84B', dark: '#A07828', contrastText: '#08080C' },
    secondary:  { main: '#9FBEAD', light: '#B8D4C2', dark: '#7FA08A', contrastText: '#08080C' },
    background: { default: '#08080C', paper: '#111118' },
    text:       { primary: '#E8E6E3', secondary: '#989691', disabled: '#5B5855' },
    error:      { main: '#E84057', light: '#FF6B7F', dark: '#C4283D' },
    success:    { main: '#9FBEAD', light: '#B8D4C2', dark: '#7FA08A' },
    warning:    { main: '#C89B3C', light: '#D4A84B' },
    info:       { main: '#AABEE0', light: '#C2D0EC', dark: '#8A9EC0' },
    divider:    'rgba(200, 155, 60, 0.12)',
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
    h1: { fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.01em' },
    h4: { fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.01em' },
    h5: { fontSize: '1.1rem', fontWeight: 500 },
    h6: { fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' },
    body1: { lineHeight: 1.6 },
    body2: { lineHeight: 1.5 },
    caption: { letterSpacing: '0.02em' },
  },
  shape: { borderRadius: 8 },
  spacing: 4,
  components: sharedComponents({
    primary:    { main: '#C89B3C', light: '#D4A84B', contrastText: '#08080C' },
    background: { default: '#08080C', paper: '#111118' },
    text:       { primary: '#E8E6E3', secondary: '#989691', disabled: '#5B5855' },
    divider:    'rgba(255, 255, 255, 0.08)',
  }),
});

// ============================================================
// Cloud Dancer — 云舞白 浅色主题
// ============================================================

const cloudDancerTheme = createTheme({
  palette: {
    mode: 'light',
    primary:    { main: '#B8874A', light: '#C89B5C', dark: '#9A6E35', contrastText: '#FFFFFF' },
    secondary:  { main: '#7BA08A', light: '#9BBEAA', dark: '#5E8470', contrastText: '#FFFFFF' },
    background: { default: '#F7F4F0', paper: '#FFFFFF' },
    text:       { primary: '#2D2A26', secondary: '#7A7672', disabled: '#B5B1AB' },
    error:      { main: '#D4454E', light: '#E8686F', dark: '#B8353D' },
    success:    { main: '#7BA08A', light: '#9BBEAA', dark: '#5E8470' },
    warning:    { main: '#B8874A', light: '#C89B5C' },
    info:       { main: '#8EA4C8', light: '#A8BCDA', dark: '#6E8AB0' },
    divider:    'rgba(0, 0, 0, 0.08)',
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
    h1: { fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.01em' },
    h4: { fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.01em' },
    h5: { fontSize: '1.1rem', fontWeight: 500 },
    h6: { fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' },
    body1: { lineHeight: 1.6 },
    body2: { lineHeight: 1.5 },
    caption: { letterSpacing: '0.02em' },
  },
  shape: { borderRadius: 8 },
  spacing: 4,
  components: sharedComponents({
    primary:    { main: '#B8874A', light: '#C89B5C', contrastText: '#FFFFFF' },
    background: { default: '#F7F4F0', paper: '#FFFFFF' },
    text:       { primary: '#2D2A26', secondary: '#7A7672', disabled: '#B5B1AB' },
    divider:    'rgba(0, 0, 0, 0.08)',
  }),
});

export { voidRiftTheme, cloudDancerTheme };

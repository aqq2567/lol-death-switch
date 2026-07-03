import { createTheme } from '@mui/material/styles';

/**
 * Void Rift — LoL Death Switch Design System
 *
 * 设计理念：黑暗虚空中的能量裂隙
 * 阵亡时界面从暗金安静 → 红色脉冲，复活后回归平静
 *
 * Palette:
 *   Void Base:    #08080C  (最深底色)
 *   Void Surface: #111118  (卡片表面)
 *   Rift Gold:    #C89B3C  (LoL 暗金，主强调色)
 *   Soul Green:   #9FBEAD  (灰绿，存活/成功)
 *   Arcane Blue:  #AABEE0  (灰蓝，信息/辅助)
 *   Death Red:    #E84057  (阵亡红，危险/警示)
 */

const voidRiftTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#C89B3C',
      light: '#D4A84B',
      dark: '#A07828',
      contrastText: '#08080C',
    },
    secondary: {
      main: '#9FBEAD',
      light: '#B8D4C2',
      dark: '#7FA08A',
      contrastText: '#08080C',
    },
    background: {
      default: '#08080C',
      paper: '#111118',
    },
    text: {
      primary: '#E8E6E3',
      secondary: '#989691',
      disabled: '#5B5855',
    },
    error: {
      main: '#E84057',
      light: '#FF6B7F',
      dark: '#C4283D',
    },
    success: {
      main: '#9FBEAD',
      light: '#B8D4C2',
      dark: '#7FA08A',
    },
    warning: {
      main: '#C89B3C',
      light: '#D4A84B',
    },
    info: {
      main: '#AABEE0',
      light: '#C2D0EC',
      dark: '#8A9EC0',
    },
    divider: 'rgba(200, 155, 60, 0.12)',
  },

  typography: {
    fontFamily: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
      color: '#C89B3C',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
      color: '#C89B3C',
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      color: '#E8E6E3',
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h5: {
      fontSize: '1.1rem',
      fontWeight: 500,
    },
    h6: {
      fontSize: '0.875rem',
      fontWeight: 600,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      color: '#989691',
    },
    body1: {
      color: '#E8E6E3',
      lineHeight: 1.6,
    },
    body2: {
      color: '#989691',
      lineHeight: 1.5,
    },
    caption: {
      color: '#5B5855',
      letterSpacing: '0.02em',
    },
  },

  shape: {
    borderRadius: 8,
  },

  spacing: 4,

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#08080C',
          scrollbarWidth: 'thin',
          scrollbarColor: '#2A2825 #111118',
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#111118',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.03)',
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
          '&:active': {
            transform: 'scale(0.97)',
          },
        },
        containedPrimary: {
          backgroundColor: '#C89B3C',
          color: '#08080C',
          boxShadow: '0 0 0 1px rgba(200, 155, 60, 0.3), 0 2px 8px rgba(200, 155, 60, 0.15)',
          '&:hover': {
            backgroundColor: '#D4A84B',
            boxShadow: '0 0 0 1px rgba(200, 155, 60, 0.5), 0 4px 16px rgba(200, 155, 60, 0.25)',
          },
        },
        containedSecondary: {
          backgroundColor: '#9FBEAD',
          color: '#08080C',
          '&:hover': {
            backgroundColor: '#B8D4C2',
          },
        },
        containedError: {
          backgroundColor: '#E84057',
          color: '#FFFFFF',
          boxShadow: '0 0 0 1px rgba(232, 64, 87, 0.3), 0 2px 8px rgba(232, 64, 87, 0.2)',
          '&:hover': {
            backgroundColor: '#FF6B7F',
            boxShadow: '0 0 0 1px rgba(232, 64, 87, 0.5), 0 4px 16px rgba(232, 64, 87, 0.35)',
          },
        },
        outlinedPrimary: {
          borderColor: 'rgba(200, 155, 60, 0.3)',
          color: '#C89B3C',
          '&:hover': {
            borderColor: '#C89B3C',
            backgroundColor: 'rgba(200, 155, 60, 0.08)',
          },
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

    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: '#111118',
        },
        standardError: {
          borderColor: 'rgba(232, 64, 87, 0.3)',
          backgroundColor: 'rgba(232, 64, 87, 0.06)',
        },
        standardSuccess: {
          borderColor: 'rgba(159, 190, 173, 0.3)',
          backgroundColor: 'rgba(159, 190, 173, 0.06)',
        },
        standardWarning: {
          borderColor: 'rgba(200, 155, 60, 0.3)',
          backgroundColor: 'rgba(200, 155, 60, 0.06)',
        },
        standardInfo: {
          borderColor: 'rgba(170, 190, 224, 0.3)',
          backgroundColor: 'rgba(170, 190, 224, 0.06)',
        },
      },
    },

    MuiSlider: {
      styleOverrides: {
        root: {
          height: 4,
        },
        thumb: {
          width: 18,
          height: 18,
          boxShadow: '0 0 0 4px rgba(200, 155, 60, 0.2)',
          '&:hover': {
            boxShadow: '0 0 0 8px rgba(200, 155, 60, 0.15)',
          },
        },
        track: {
          border: 'none',
        },
        rail: {
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
        },
        mark: {
          backgroundColor: 'rgba(255, 255, 255, 0.12)',
          width: 2,
          height: 2,
          borderRadius: 1,
        },
        markLabel: {
          color: '#5B5855',
          fontSize: '0.7rem',
        },
      },
    },

    MuiSelect: {
      styleOverrides: {
        root: {
          color: '#E8E6E3',
        },
        icon: {
          color: '#989691',
        },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: '#989691',
          '&.Mui-focused': {
            color: '#C89B3C',
          },
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255, 255, 255, 0.08)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255, 255, 255, 0.15)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#C89B3C',
          },
        },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#1E1E24',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
          borderRadius: 6,
          fontSize: '0.8rem',
          padding: '8px 12px',
        },
      },
    },
  },
});

export default voidRiftTheme;

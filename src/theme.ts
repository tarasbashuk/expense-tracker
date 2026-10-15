import { createTheme } from '@mui/material/styles';
import { cardRadius, historyColors } from '@/components/history/tokens';

export const appTheme = createTheme({
  palette: {
    background: {
      default: historyColors.background,
      paper: historyColors.card,
    },
    text: { primary: historyColors.text, secondary: historyColors.secondary },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: cardRadius, textTransform: 'none' },
      },
    },
    MuiDialog: { styleOverrides: { paper: { borderRadius: cardRadius } } },
    MuiDialogTitle: { styleOverrides: { root: { fontSize: 22 } } },
    MuiOutlinedInput: {
      styleOverrides: { root: { borderRadius: cardRadius } },
    },
    MuiMenu: { styleOverrides: { paper: { borderRadius: cardRadius } } },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: cardRadius,
          '&.Mui-selected, &.Mui-selected:hover': {
            backgroundColor: historyColors.card,
          },
        },
      },
    },
    // MUI retains the straight inner edges and overlapping borders of grouped buttons.
    MuiToggleButtonGroup: {
      styleOverrides: { root: { borderRadius: cardRadius } },
    },
  },
});

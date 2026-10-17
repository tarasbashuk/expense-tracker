import type {} from '@mui/x-date-pickers/themeAugmentation';
import PickerSlideTransition from '@/components/shared/PickerSlideTransition';
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
    MuiPickersOutlinedInput: {
      styleOverrides: { root: { borderRadius: cardRadius } },
    },
    MuiPickerPopper: {
      styleOverrides: { paper: { borderRadius: cardRadius } },
    },
    MuiMobileDatePicker: {
      defaultProps: {
        slots: { mobileTransition: PickerSlideTransition },
        slotProps: {
          dialog: {
            sx: {
              '& .MuiDialog-container': { alignItems: 'flex-end' },
              '& .MuiDialog-paper': {
                m: 0,
                width: '100%',
                maxWidth: '100%',
                borderRadius: '20px 20px 0 0',
                maxHeight:
                  'calc(100dvh - env(safe-area-inset-top, 0px) - 12px)',
                pb: 'env(safe-area-inset-bottom, 0px)',
              },
              '& .MuiDialog-paper::before': {
                content: '""',
                display: 'block',
                flexShrink: 0,
                width: 40,
                height: 4,
                borderRadius: 2,
                bgcolor: 'divider',
                mx: 'auto',
                mt: 1,
              },
              '& .MuiDialogContent-root': { p: 0 },
            },
          },
        },
      },
    },
    MuiMenu: { styleOverrides: { paper: { borderRadius: cardRadius } } },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: cardRadius,
          borderColor: 'rgba(0, 0, 0, 0.23)',
          '&.Mui-selected, &.Mui-selected:hover': {
            backgroundColor: historyColors.card,
          },
        },
      },
    },
    // Keep shared borders visible when an opaque selected button overlaps its neighbor.
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: { borderRadius: cardRadius },
        grouped: {
          '&.MuiToggleButtonGroup-middleButton, &.MuiToggleButtonGroup-lastButton':
            {
              borderColor: 'rgba(0, 0, 0, 0.23)',
            },
        },
      },
    },
  },
});

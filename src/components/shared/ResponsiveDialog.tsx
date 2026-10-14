'use client';

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from 'react';
import {
  Box,
  Dialog,
  Drawer,
  DialogTitle,
  IconButton,
  useMediaQuery,
  useTheme,
  type DialogProps,
} from '@mui/material';
import { X } from 'lucide-react';
import { useIntl } from 'react-intl';

const TitleContext = createContext<string | undefined>(undefined);
const BusyContext = createContext<((_busy: boolean) => void) | null>(null);

export function useDialogBusy(busy: boolean) {
  const setBusy = useContext(BusyContext);

  useEffect(() => {
    setBusy?.(busy);

    return () => setBusy?.(false);
  }, [busy, setBusy]);
}

const DialogStepContext = createContext<
  ((_step: ReactNode | null) => void) | null
>(null);

export const useDialogStep = () => useContext(DialogStepContext);

export function FormTitle({
  children,
  onClose,
  disabled = false,
}: {
  children?: ReactNode;
  onClose: () => void;
  disabled?: boolean;
}) {
  const { formatMessage } = useIntl();
  const titleId = useContext(TitleContext);

  return (
    <DialogTitle
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 1.5,
        px: 2,
        minWidth: 0,
      }}
    >
      <Box
        component="span"
        id={titleId}
        sx={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}
      >
        {children}
      </Box>
      <IconButton
        disabled={disabled}
        onClick={onClose}
        aria-label={formatMessage({ id: 'common.close' })}
        sx={{ width: 44, height: 44, flexShrink: 0 }}
      >
        <X size={22} />
      </IconButton>
    </DialogTitle>
  );
}

export default function ResponsiveDialog({
  children,
  open,
  onClose,
  maxWidth = 'sm',
  desktop,
  mobileFullHeight = false,
  fullWidth: _fullWidth,
  ...props
}: Omit<DialogProps, 'PaperProps'> & {
  desktop?: boolean;
  mobileFullHeight?: boolean;
}) {
  const theme = useTheme();
  const small = useMediaQuery(theme.breakpoints.down('sm'));
  const mobile = desktop === undefined ? small : !desktop;
  const titleId = useId();
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<ReactNode | null>(null);
  const [viewport, setViewport] = useState<{
    height: number;
    bottom: number;
  } | null>(null);

  useEffect(() => {
    if (!open) setStep(null);
  }, [open]);

  useEffect(() => {
    const visualViewport = window.visualViewport;

    if (!visualViewport || !open) return;

    const update = () =>
      setViewport({
        height: visualViewport.height,
        bottom: Math.max(
          0,
          window.innerHeight - visualViewport.height - visualViewport.offsetTop,
        ),
      });
    update();
    visualViewport.addEventListener('resize', update);
    visualViewport.addEventListener('scroll', update);

    return () => {
      visualViewport.removeEventListener('resize', update);
      visualViewport.removeEventListener('scroll', update);
    };
  }, [open]);

  const close: DialogProps['onClose'] = (event, reason) => {
    if (busy) return;

    if (step) {
      setStep(null);

      return;
    }

    onClose?.(event, reason);
  };

  const Surface = mobile ? Drawer : Dialog;

  return (
    <BusyContext.Provider value={setBusy}>
      <DialogStepContext.Provider value={setStep}>
        <Surface
          {...props}
          open={open}
          onClose={close}
          {...(mobile
            ? { anchor: 'bottom' as const }
            : { fullWidth: true, maxWidth })}
          PaperProps={{
            role: 'dialog',
            'aria-modal': true,
            'aria-labelledby': props['aria-labelledby'] || titleId,
            sx: {
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              ...(mobile
                ? {
                    width: '100%',
                    m: 0,
                    left: 0,
                    right: 0,
                    bottom: viewport?.bottom ?? 0,
                    borderRadius: mobileFullHeight ? 0 : '20px 20px 0 0',
                    ...(mobileFullHeight && {
                      height: viewport ? `${viewport.height}px` : '100dvh',
                      pt: 'env(safe-area-inset-top, 0px)',
                      boxSizing: 'border-box',
                    }),
                    maxHeight: mobileFullHeight
                      ? viewport
                        ? `${viewport.height}px`
                        : '100dvh'
                      : `calc(${viewport ? `${viewport.height}px` : '100dvh'} - env(safe-area-inset-top, 0px) - 12px)`,
                  }
                : {
                    maxWidth: step || maxWidth === 'xs' ? 440 : 600,
                    maxHeight: 'calc(100dvh - 64px)',
                  }),
              '& .MuiDialogTitle-root': { flexShrink: 0, fontSize: 20 },
              '& .MuiDialogContent-root': {
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                overscrollBehavior: 'contain',
                px: { xs: 2, sm: 3 },
                pt: '8px !important',
                pb: 2,
              },
              '& .MuiDialogActions-root': {
                flexShrink: 0,
                px: 2,
                pt: 1.5,
                pb: mobile ? 'max(16px, env(safe-area-inset-bottom, 0px))' : 2,
                borderTop: '1px solid',
                borderColor: 'divider',
                '& .MuiButton-root': { minHeight: 44 },
                '& .MuiButton-contained': { flex: { xs: 1, sm: 'initial' } },
              },
              '& input, & textarea, & .MuiSelect-select': {
                fontSize: { xs: 16 },
              },
            },
          }}
        >
          {mobile && !mobileFullHeight && (
            <Box
              aria-hidden
              sx={{
                flexShrink: 0,
                width: 40,
                height: 4,
                borderRadius: 2,
                bgcolor: 'divider',
                mx: 'auto',
                mt: 1,
              }}
            />
          )}
          <TitleContext.Provider value={step ? undefined : titleId}>
            <Box
              sx={{
                display: step ? 'none' : 'flex',
                flex: mobile && mobileFullHeight ? 1 : undefined,
                flexDirection: 'column',
                minHeight: 0,
                overflow: 'hidden',
              }}
            >
              {children}
            </Box>
          </TitleContext.Provider>
          {step && (
            <TitleContext.Provider value={titleId}>
              <Box
                sx={{
                  display: 'flex',
                  flex: mobile && mobileFullHeight ? 1 : undefined,
                  flexDirection: 'column',
                  minHeight: 0,
                  overflow: 'hidden',
                }}
              >
                {step}
              </Box>
            </TitleContext.Provider>
          )}
        </Surface>
      </DialogStepContext.Provider>
    </BusyContext.Provider>
  );
}

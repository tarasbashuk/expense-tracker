'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, GlobalStyles, IconButton } from '@mui/material';
import {
  ToastContainer,
  toast,
  cssTransition,
  type CloseButtonProps,
  type IconProps,
} from 'react-toastify';
import { CircleCheck, CircleAlert, TriangleAlert, Info, X } from 'lucide-react';
import { useIntl } from 'react-intl';
import { cardRadius, historyColors } from './history/tokens';

const transition = cssTransition({
  enter: 'toast-enter',
  exit: 'toast-exit',
  collapse: false,
});
const palettes = {
  success: {
    icon: CircleCheck,
    foreground: historyColors.income,
    background: historyColors.incomeBackground,
  },
  error: { icon: CircleAlert, foreground: '#B42318', background: '#FEECEB' },
  warning: {
    icon: TriangleAlert,
    foreground: '#92400E',
    background: '#FEF3C7',
  },
  info: { icon: Info, foreground: '#175CD3', background: '#EFF6FF' },
};

function StatusIcon({ type }: IconProps) {
  const palette = palettes[type as keyof typeof palettes] || palettes.info;
  const Icon = palette.icon;

  return (
    <Box
      aria-hidden="true"
      sx={{
        width: 36,
        height: 36,
        display: 'grid',
        placeItems: 'center',
        borderRadius: '50%',
        bgcolor: palette.background,
        color: palette.foreground,
      }}
    >
      <Icon size={21} />
    </Box>
  );
}

function CloseToast({ closeToast }: CloseButtonProps) {
  const { formatMessage } = useIntl();

  return (
    <IconButton
      onClick={closeToast}
      aria-label={formatMessage({ id: 'common.close' })}
      sx={{ width: 44, height: 44, flexShrink: 0 }}
    >
      <X size={18} />
    </IconButton>
  );
}

export default function AppToasts() {
  const { formatMessage } = useIntl();
  const host = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const blocked = useRef({ modal: false, focus: false, hover: false });
  const syncTimer = () => {
    const reasons = blocked.current;

    if (reasons.modal || reasons.focus || reasons.hover || document.hidden)
      toast.pause();
    else toast.play();
  };

  useEffect(() => {
    const navigation = document.querySelector<HTMLElement>(
      '[data-bottom-navigation]',
    );
    const measure = () => {
      const height = navigation?.getBoundingClientRect().height || 0;
      host.current?.style.setProperty(
        '--toast-bottom',
        height
          ? `${height + 12}px`
          : 'calc(12px + env(safe-area-inset-bottom, 0px))',
      );
    };
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(measure);

    if (navigation) observer?.observe(navigation);

    measure();
    window.addEventListener('resize', measure);
    const updateModal = () => {
      // Each toast owns its live-region role; avoid Toastify's second announcement.
      host.current?.querySelector('.Toastify')?.removeAttribute('aria-live');
      const open = Boolean(
        document.querySelector('.MuiModal-root, [aria-modal="true"]'),
      );

      if (blocked.current.modal !== open) {
        blocked.current.modal = open;
        setModalOpen(open);
        syncTimer();
      }
    };
    const mutations = new MutationObserver(updateModal);
    mutations.observe(document.body, { childList: true, subtree: true });
    updateModal();
    const unsubscribe = toast.onChange((event) => {
      if (event.status === 'added') syncTimer();
    });
    document.addEventListener('visibilitychange', syncTimer);

    return () => {
      observer?.disconnect();
      mutations.disconnect();
      unsubscribe();
      window.removeEventListener('resize', measure);
      document.removeEventListener('visibilitychange', syncTimer);
    };
  }, []);

  return (
    <Box
      ref={host}
      sx={{ visibility: modalOpen ? 'hidden' : 'visible' }}
      onAnimationEndCapture={() => queueMicrotask(syncTimer)}
      onFocusCapture={() => {
        blocked.current.focus = true;
        syncTimer();
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          blocked.current.focus = false;
          syncTimer();
        }
      }}
      onMouseEnter={() => {
        blocked.current.hover = true;
        syncTimer();
      }}
      onMouseLeave={() => {
        blocked.current.hover = false;
        syncTimer();
      }}
    >
      <GlobalStyles
        styles={{
          '.app-toasts.Toastify__toast-container': {
            width: 360,
            maxWidth: 420,
            right: 24,
            bottom: 24,
            left: 'auto',
            padding: 0,
            zIndex: 1200,
          },
          '.app-toasts .Toastify__toast': {
            width: '100%',
            maxHeight: 'none',
            background: '#fff',
            color: historyColors.text,
            border: `1px solid ${historyColors.divider}`,
            borderRadius: cardRadius,
            boxShadow: '0 4px 16px rgba(24,32,47,.12)',
            minHeight: 64,
            padding: '10px 8px 10px 14px',
            fontFamily: 'inherit',
            fontSize: 15,
            lineHeight: 1.4,
            gap: 10,
            overflowWrap: 'anywhere',
            alignItems: 'center',
            marginBottom: 0,
          },
          '.app-toasts .app-toast-message': { flex: 1, minWidth: 0 },
          '.app-toasts .Toastify__toast-icon': {
            width: 36,
            flexShrink: 0,
            margin: 0,
            animation: 'none',
          },
          '.toast-enter': { animation: 'toast-in 160ms ease-out both' },
          '.toast-exit': { animation: 'toast-out 120ms ease-in both' },
          '@keyframes toast-in': {
            from: { opacity: 0, transform: 'translateY(6px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
          '@keyframes toast-out': {
            to: { opacity: 0, transform: 'translateY(6px)' },
          },
          '@media (max-width: 1199px)': {
            '.app-toasts.Toastify__toast-container': {
              width: 'calc(100% - 32px)',
              maxWidth: 420,
              left: 'auto',
              right: 16,
              bottom:
                'var(--toast-bottom, calc(68px + env(safe-area-inset-bottom, 0px)))',
              transform: 'none',
            },
          },
          '@media (prefers-reduced-motion: reduce)': {
            '.toast-enter, .toast-exit': {
              animationDuration: '1ms',
              transform: 'none',
            },
            '@keyframes toast-in': { from: { opacity: 1 }, to: { opacity: 1 } },
            '@keyframes toast-out': {
              from: { opacity: 1 },
              to: { opacity: 0 },
            },
          },
        }}
      />
      <ToastContainer
        aria-label={formatMessage({ id: 'common.notifications' })}
        className="app-toasts"
        position="bottom-right"
        limit={1}
        autoClose={4000}
        hideProgressBar
        closeOnClick={false}
        pauseOnHover
        pauseOnFocusLoss
        draggable={false}
        role="status"
        icon={StatusIcon}
        closeButton={CloseToast}
        transition={transition}
        hotKeys={() => false}
      />
    </Box>
  );
}

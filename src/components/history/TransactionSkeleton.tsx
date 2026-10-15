'use client';

import { Box, Skeleton, type SkeletonProps } from '@mui/material';
import { cardStyles, historyColors } from './tokens';

export function LoadingPlaceholder(props: SkeletonProps) {
  return (
    <Skeleton
      aria-hidden="true"
      variant="rounded"
      animation="pulse"
      {...props}
      sx={{
        bgcolor: historyColors.divider,
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        ...props.sx,
      }}
    />
  );
}

const groups = [
  [65, 85, 55],
  [70, 60],
];

export default function TransactionSkeleton() {
  return (
    <Box aria-hidden="true" sx={{ py: 1 }}>
      {groups.map((widths, group) => (
        <Box key={group} sx={{ mb: 1.5 }}>
          <LoadingPlaceholder width={130} height={18} sx={{ my: 1.5 }} />
          <Box sx={{ ...cardStyles, overflow: 'hidden' }}>
            {widths.map((width, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  gap: 1,
                  px: 1.25,
                  py: 1.5,
                  alignItems: 'center',
                  borderBottom:
                    index < widths.length - 1
                      ? `1px solid ${historyColors.divider}`
                      : 0,
                }}
              >
                <LoadingPlaceholder
                  width={52}
                  height={48}
                  sx={{ flexShrink: 0, borderRadius: '10px' }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <LoadingPlaceholder width={`${width}%`} height={18} />
                </Box>
                <Box sx={{ width: { xs: 76, sm: 104 }, flexShrink: 0 }}>
                  <LoadingPlaceholder width="100%" height={18} />
                  <LoadingPlaceholder
                    width="72%"
                    height={12}
                    sx={{ mt: 0.5, ml: 'auto' }}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

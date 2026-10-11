'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, Button, Stack } from '@mui/material';
import {
  Home,
  List,
  ChartPie,
  CalendarDays,
  Repeat,
  Settings,
} from 'lucide-react';
import { SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/nextjs';
import { NavigationPath } from '@/constants/types';
import { FormattedMessage } from 'react-intl';

const destinations = [
  { path: NavigationPath.Home, label: 'home', icon: Home },
  { path: NavigationPath.Transactions, label: 'transactions', icon: List },
  { path: NavigationPath.Stats, label: 'stats', icon: ChartPie },
  {
    path: NavigationPath.YearlyStats,
    label: 'yearlyStats',
    icon: CalendarDays,
  },
  { path: NavigationPath.Recurring, label: 'recurring', icon: Repeat },
  { path: NavigationPath.Settings, label: 'settings', icon: Settings },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <Box
      component="nav"
      sx={{
        display: { xs: 'none', lg: 'block' },
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        gap={2}
        sx={{ maxWidth: 1400, mx: 'auto', px: 3, py: 1.5 }}
      >
        <Stack direction="row" gap={0.5}>
          {destinations.map(({ path, label, icon: Icon }) => {
            const active = pathname === path;
            const link = (
              <Button
                component={Link}
                href={path}
                aria-current={active ? 'page' : undefined}
                startIcon={<Icon size={19} />}
                sx={{
                  color: active ? 'primary.main' : 'text.secondary',
                  bgcolor: active ? '#EDF2FF' : 'transparent',
                  px: 1.5,
                  minHeight: 44,
                  whiteSpace: 'nowrap',
                }}
              >
                <FormattedMessage id={`navigation.${label}`} />
              </Button>
            );

            return path === NavigationPath.Home ? (
              <Box key={path}>{link}</Box>
            ) : (
              <SignedIn key={path}>{link}</SignedIn>
            );
          })}
        </Stack>
        <Box
          sx={{
            flexShrink: 0,
            maxWidth: 180,
            '& .cl-userButtonOuterIdentifier': {
              color: 'text.primary',
              fontSize: 14,
              maxWidth: 110,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            },
          }}
        >
          <SignedIn>
            <UserButton showName />
          </SignedIn>
          <SignedOut>
            <SignInButton>
              <Button variant="contained">Sign In</Button>
            </SignInButton>
          </SignedOut>
        </Box>
      </Stack>
    </Box>
  );
}

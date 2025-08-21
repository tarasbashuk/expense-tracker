'use client';
import Link from 'next/link';
import { Suspense } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import HomeIcon from '@mui/icons-material/Home';
import Typography from '@mui/material/Typography';
import ReceiptIcon from '@mui/icons-material/Receipt';
import DonutSmallIcon from '@mui/icons-material/DonutSmall';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import { SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/nextjs';
import { NavigationPath } from '@/constants/types';
import { FormattedMessage } from 'react-intl';

const Header = () => {
  return (
    <Box sx={{ top: 'auto', bottom: 0, display: { xs: 'none', sm: 'block' } }}>
      <nav className="navbar">
        <div className="navbar-container">
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Link href="/">
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <HomeIcon />
                <Typography variant="h6">
                  <FormattedMessage
                    id="navigation.home"
                    defaultMessage="Home"
                  />
                </Typography>
              </Stack>
            </Link>
            <SignedIn>
              <Link href={NavigationPath.Transactions} className="nav-link">
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center' }}
                >
                  <ReceiptIcon />
                  <Typography variant="h6">
                    <FormattedMessage
                      id="navigation.transactions"
                      defaultMessage="Transactions"
                    />
                  </Typography>
                </Stack>
              </Link>
              <Link href={NavigationPath.Stats} className="nav-link">
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center' }}
                >
                  <DonutSmallIcon />
                  <Typography variant="h6">
                    <FormattedMessage
                      id="navigation.stats"
                      defaultMessage="Stats"
                    />
                  </Typography>
                </Stack>
              </Link>
              <Link href={NavigationPath.YearlyStats} className="nav-link">
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center' }}
                >
                  <BarChartIcon />
                  <Typography variant="h6">
                    <FormattedMessage
                      id="navigation.yearlyStats"
                      defaultMessage="Yearly stats"
                    />
                  </Typography>
                </Stack>
              </Link>
              <Link href={NavigationPath.Settings} className="nav-link">
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center' }}
                >
                  <SettingsIcon />
                  <Typography variant="h6">
                    <FormattedMessage
                      id="navigation.settings"
                      defaultMessage="Settings"
                    />
                  </Typography>
                </Stack>
              </Link>
            </SignedIn>
          </Stack>
          <Suspense fallback={<Box sx={{ height: 44 }} />}>
            <SignedOut>
              <SignInButton>
                <Button variant="contained" sx={{ textTransform: 'none' }}>
                  Sign In
                </Button>
              </SignInButton>
            </SignedOut>

            <SignedIn>
              <Typography variant="h6">
                <UserButton showName />
              </Typography>
            </SignedIn>
          </Suspense>
        </div>
      </nav>
    </Box>
  );
};

export default Header;

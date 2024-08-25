import Link from 'next/link';
import { Suspense } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import HomeIcon from '@mui/icons-material/Home';
import ReceiptIcon from '@mui/icons-material/Receipt';
import DonutSmallIcon from '@mui/icons-material/DonutSmall';
import { SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/nextjs';
import { Button } from '@mui/material';
import { NavigationPath } from '@/constants/types';

const Header = async () => {
  return (
    <Box sx={{ top: 'auto', bottom: 0, display: { xs: 'none', sm: 'block' } }}>
      <nav className="navbar">
        <div className="navbar-container">
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Link href="/">
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <HomeIcon />
                <h3>Expense Tracker</h3>
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
                  <h3>Transactions</h3>
                </Stack>
              </Link>
              <Link href={NavigationPath.Stats} className="nav-link">
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center' }}
                >
                  <DonutSmallIcon />
                  <h3>Stats</h3>
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
              <UserButton showName />
            </SignedIn>
          </Suspense>
        </div>
      </nav>
    </Box>
  );
};

export default Header;

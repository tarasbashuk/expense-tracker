import Link from 'next/link';
import { Suspense } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import HomeIcon from '@mui/icons-material/Home';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/nextjs';

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
              <Link href="/transactions" className="nav-link">
                <ReceiptIcon />
              </Link>
            </SignedIn>
          </Stack>
          <Suspense fallback={<Box sx={{ height: 44 }} />}>
            <SignedOut>
              <SignInButton />
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

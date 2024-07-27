import Link from 'next/link';
import HomeIcon from '@mui/icons-material/Home';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/nextjs';
import { Stack } from '@mui/material';

const Header = async () => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Link href="/">
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <HomeIcon />
              <h3>Expense Tracker</h3>
            </Stack>
          </Link>

          <Link href="/transactions" className="nav-link">
            <ReceiptIcon />
          </Link>
        </Stack>
        <div>
          <SignedOut>
            <SignInButton />
          </SignedOut>

          <SignedIn>
            <UserButton showName />
          </SignedIn>
        </div>
      </div>
    </nav>
  );
};

export default Header;

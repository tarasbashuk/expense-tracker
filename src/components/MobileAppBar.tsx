'use client';
import { useState, MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import { SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/nextjs';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';

import AddTransactionModal from './AddTransactionModal/AddTransactionModal';
import { useTransactions } from '@/context/TranasctionsContext';
import WelcomeModal from './WelcomeModal/WelcomeModal';
import { NavigationPath } from '@/constants/types';

const fabStyles = {
  position: 'fixed',
  zIndex: 1200,
  left: { xs: 0, sm: 'unset' },
  right: { xs: 0, sm: 20 },
  bottom: { xs: 30, sm: 15 },
  margin: '0 auto',
};

const MobileAppBar = () => {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { isTransactionModalOpen, setIsTransactionModalOpen } =
    useTransactions();
  const handleOpenTransactionModal = () => setIsTransactionModalOpen(true);

  const isOpen = Boolean(anchorEl);
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNav = (path: string) => {
    router.push(path);
    handleClose();
  };

  return (
    <>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <AppBar
          position="fixed"
          color="info"
          sx={{ top: 'auto', bottom: 0, display: { xs: 'block', sm: 'none' } }}
        >
          <Toolbar>
            <Menu
              id="basic-menu"
              anchorEl={anchorEl}
              open={isOpen}
              onClose={handleClose}
              MenuListProps={{
                'aria-labelledby': 'basic-button',
              }}
            >
              <MenuItem onClick={() => handleNav(NavigationPath.Home)}>
                Home
              </MenuItem>
              <MenuItem onClick={() => handleNav(NavigationPath.Transactions)}>
                Transactions
              </MenuItem>
              <MenuItem onClick={() => handleNav(NavigationPath.Stats)}>
                Stats
              </MenuItem>
              <MenuItem onClick={() => handleNav('/yearly-stats')}>
                Yearly Stats
              </MenuItem>
            </Menu>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              onClick={handleClick}
            >
              <MenuIcon />
            </IconButton>
            <Box sx={{ flexGrow: 1 }} />
            <Stack>
              <SignedOut>
                <SignInButton />
              </SignedOut>

              <SignedIn>
                <UserButton />
              </SignedIn>
            </Stack>
          </Toolbar>
        </AppBar>
        <SignedIn>
          <Fab
            color="primary"
            aria-label="add"
            sx={fabStyles}
            onClick={handleOpenTransactionModal}
          >
            <AddIcon />
          </Fab>
        </SignedIn>
        <WelcomeModal />
        {isTransactionModalOpen && <AddTransactionModal />}
      </LocalizationProvider>
    </>
  );
};

export default MobileAppBar;

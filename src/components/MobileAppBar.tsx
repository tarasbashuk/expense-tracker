'use client';
import { useState, MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { styled } from '@mui/material/styles';
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
import { useSettings } from '@/context/SettingsContexts';

const StyledFab = styled(Fab)({
  position: 'absolute',
  zIndex: 1,
  top: -30,
  left: 0,
  right: 0,
  margin: '0 auto',
});

const MobileAppBar = () => {
  const { settings } = useSettings();
  console.log('settings', settings);
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const isOpen = Boolean(anchorEl);
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const goToHome = () => {
    router.push('/');
    handleClose();
  };

  const goToTransactions = () => {
    router.push('/transactions');
    handleClose();
  };

  return (
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
          <MenuItem onClick={goToHome}>Home</MenuItem>
          <MenuItem onClick={goToTransactions}>Transactions</MenuItem>
        </Menu>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          onClick={handleClick}
        >
          <MenuIcon />
        </IconButton>
        <StyledFab color="primary" aria-label="add">
          <AddIcon />
        </StyledFab>
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
  );
};

export default MobileAppBar;

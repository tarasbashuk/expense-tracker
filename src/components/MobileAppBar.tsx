'use client';
import { useState, MouseEvent } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  BottomNavigation,
  BottomNavigationAction,
  Button,
} from '@mui/material';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SettingsIcon from '@mui/icons-material/Settings';
import HomeIcon from '@mui/icons-material/Home';
import ReceiptIcon from '@mui/icons-material/Receipt';
import DonutSmallIcon from '@mui/icons-material/DonutSmall';
import BarChartIcon from '@mui/icons-material/BarChart';
import RepeatIcon from '@mui/icons-material/Repeat';
import { SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/nextjs';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { FormattedMessage, useIntl } from 'react-intl';

import AddTransactionModal from './AddTransactionModal/AddTransactionModal';
import ImportStatementModal from './ImportStatementModal';
import { useTransactions } from '@/context/TranasctionsContext';
import WelcomeModal from './WelcomeModal/WelcomeModal';
import { NavigationPath } from '@/constants/types';

const fabContainerStyles = {
  position: 'fixed',
  zIndex: 1200,
  left: { xs: 0, sm: 'unset' },
  right: { xs: 0, sm: 20 },
  bottom: { xs: 'calc(72px + env(safe-area-inset-bottom))', sm: 15 },
  margin: '0 auto',
  width: { xs: 'fit-content', sm: 'auto' },
  display: 'flex',
  gap: 1.5,
  alignItems: 'center',
};

const appBarStyles = {
  position: 'fixed',
  zIndex: 1100,
  top: 'auto',
  bottom: 0,
  display: { xs: 'block', sm: 'none' },
};

const MobileAppBar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { formatMessage } = useIntl();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
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
        <AppBar position="fixed" color="info" sx={appBarStyles}>
          <Toolbar
            sx={{
              display: 'block',
              p: '0 !important',
              minHeight: '0 !important',
              pb: 'env(safe-area-inset-bottom) !important',
            }}
          >
            <Menu
              id="mobile-more-menu"
              anchorEl={anchorEl}
              open={isOpen}
              onClose={handleClose}
              MenuListProps={{
                'aria-labelledby': 'mobile-more-button',
              }}
            >
              <MenuItem
                onClick={() => handleNav(NavigationPath.YearlyStats)}
                sx={{ py: 1.5 }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <BarChartIcon />
                  <Typography>
                    <FormattedMessage
                      id="navigation.yearlyStats"
                      defaultMessage="Yearly stats"
                    />
                  </Typography>
                </Stack>
              </MenuItem>
              <MenuItem
                onClick={() => handleNav(NavigationPath.Recurring)}
                sx={{ py: 1.5 }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <RepeatIcon />
                  <Typography>
                    <FormattedMessage
                      id="navigation.recurring"
                      defaultMessage="Recurring"
                    />
                  </Typography>
                </Stack>
              </MenuItem>
              <MenuItem
                onClick={() => handleNav(NavigationPath.Settings)}
                sx={{ py: 1.5 }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <SettingsIcon />
                  <Typography>
                    <FormattedMessage
                      id="navigation.settings"
                      defaultMessage="Settings"
                    />
                  </Typography>
                </Stack>
              </MenuItem>
              <Box sx={{ px: 2, py: 1.5 }}>
                <SignedOut>
                  <SignInButton />
                </SignedOut>
                <SignedIn>
                  <UserButton />
                </SignedIn>
              </Box>
            </Menu>
            <BottomNavigation
              showLabels
              value={
                [
                  NavigationPath.Home,
                  NavigationPath.Transactions,
                  NavigationPath.Stats,
                ].includes(pathname as NavigationPath)
                  ? pathname
                  : 'more'
              }
              sx={{ height: 64 }}
            >
              <BottomNavigationAction
                label={formatMessage({
                  id: 'navigation.home',
                  defaultMessage: 'Home',
                })}
                aria-current={
                  pathname === NavigationPath.Home ? 'page' : undefined
                }
                value={NavigationPath.Home}
                icon={<HomeIcon />}
                onClick={() => handleNav(NavigationPath.Home)}
              />
              <BottomNavigationAction
                label={formatMessage({
                  id: 'transactions.title',
                  defaultMessage: 'History',
                })}
                aria-current={
                  pathname === NavigationPath.Transactions ? 'page' : undefined
                }
                value={NavigationPath.Transactions}
                icon={<ReceiptIcon />}
                onClick={() => handleNav(NavigationPath.Transactions)}
              />
              <BottomNavigationAction
                label={formatMessage({
                  id: 'navigation.stats',
                  defaultMessage: 'Stats',
                })}
                aria-current={
                  pathname === NavigationPath.Stats ? 'page' : undefined
                }
                value={NavigationPath.Stats}
                icon={<DonutSmallIcon />}
                onClick={() => handleNav(NavigationPath.Stats)}
              />
              <BottomNavigationAction
                id="mobile-more-button"
                label={formatMessage({
                  id: 'navigation.more',
                  defaultMessage: 'More',
                })}
                value="more"
                icon={<MoreHorizIcon />}
                onClick={handleClick}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-controls={isOpen ? 'mobile-more-menu' : undefined}
              />
            </BottomNavigation>
          </Toolbar>
        </AppBar>
        <SignedIn>
          <Box sx={fabContainerStyles}>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<AutoAwesomeIcon />}
              onClick={() => setIsImportModalOpen(true)}
              sx={{ borderRadius: 7, minHeight: 48 }}
            >
              {formatMessage({
                id: 'navigation.import',
                defaultMessage: 'Import',
              })}
            </Button>
            <Fab
              color="primary"
              aria-label={formatMessage({
                id: 'addTransaction.title',
                defaultMessage: 'Add transaction',
              })}
              onClick={handleOpenTransactionModal}
            >
              <AddIcon />
            </Fab>
          </Box>
        </SignedIn>
        <WelcomeModal />
        {isTransactionModalOpen && <AddTransactionModal />}
        {isImportModalOpen && (
          <ImportStatementModal onClose={() => setIsImportModalOpen(false)} />
        )}
      </LocalizationProvider>
    </>
  );
};

export default MobileAppBar;

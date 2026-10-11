'use client';
import { Box, Typography } from '@mui/material';
import { useIntl } from 'react-intl';
import HistoryHeaderActions from './history/HistoryHeaderActions';

interface Props {
  firstName: string | null;
}

const WelcomeMessage = ({ firstName }: Props) => {
  const { formatMessage } = useIntl();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        mb: 2,
      }}
    >
      <Typography
        variant="h4"
        component="h1"
        sx={{
          minWidth: 0,
          overflowWrap: 'anywhere',
          fontSize: { xs: 28, sm: 34 },
          fontWeight: 600,
        }}
      >
        {formatMessage(
          { id: 'home.welcome', defaultMessage: 'Welcome, {name}' },
          { name: firstName || '' },
        )}
      </Typography>
      <Box sx={{ display: { xs: 'block', sm: 'none' }, flexShrink: 0 }}>
        <HistoryHeaderActions />
      </Box>
    </Box>
  );
};

export default WelcomeMessage;

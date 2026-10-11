'use client';
import { Box, Typography } from '@mui/material';
import { useIntl } from 'react-intl';
import { pageHeaderStyles } from './history/tokens';
import HistoryHeaderActions from './history/HistoryHeaderActions';

interface Props {
  firstName: string | null;
}

const WelcomeMessage = ({ firstName }: Props) => {
  const { formatMessage } = useIntl();

  return (
    <Box sx={pageHeaderStyles}>
      <Typography
        variant="h4"
        component="h1"
        sx={{
          minWidth: 0,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          fontSize: { xs: 22, sm: 34 },
          fontWeight: 600,
        }}
      >
        {formatMessage(
          { id: 'home.welcome', defaultMessage: 'Welcome, {name}' },
          { name: firstName || '' },
        )}
      </Typography>
      <Box sx={{ flexShrink: 0 }}>
        <HistoryHeaderActions />
      </Box>
    </Box>
  );
};

export default WelcomeMessage;

'use client';
import { Typography } from '@mui/material';
import { useIntl } from 'react-intl';

interface Props {
  firstName: string | null;
}

const WelcomeMessage = ({ firstName }: Props) => {
  const { formatMessage } = useIntl();

  return (
    <Typography variant="h4" component="h3" gutterBottom>
      {formatMessage(
        { id: 'home.welcome', defaultMessage: 'Welcome, {name}' },
        { name: firstName || '' },
      )}
    </Typography>
  );
};

export default WelcomeMessage;

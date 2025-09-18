'use client';
import { Typography } from '@mui/material';
import { useIntl } from 'react-intl';

interface Props {
  firstName: string | null;
}

const WelcomeMessage = ({ firstName }: Props) => {
  const { formatMessage } = useIntl();
  const smallScreen =
    window.matchMedia('(max-width: 480px)').matches &&
    window.devicePixelRatio === 1;

  const matchMedia = window.matchMedia('(max-width: 480px)').matches;

  return (
    <>
      Small screen - {`${smallScreen}`}
      <br />
      matchMedia 480 - {`${matchMedia}`}
      <br />
      DPR - {window.devicePixelRatio}
      <Typography variant="h4" component="h3" gutterBottom>
        {formatMessage(
          { id: 'home.welcome', defaultMessage: 'Welcome, {name}' },
          { name: firstName || '' },
        )}
      </Typography>
    </>
  );
};

export default WelcomeMessage;

'use client';
import React, { useState } from 'react';
import { Alert, Box, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useMediaQueries } from '@/lib/useMediaQueries';
import { useIntl } from 'react-intl';

const MobileWarning: React.FC = () => {
  const { isExtraSmall } = useMediaQueries();
  const { formatMessage } = useIntl();

  const [open, setOpen] = useState(true);

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      {isExtraSmall && open && (
        <Box
          sx={{
            width: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 1000,
          }}
        >
          <Alert
            severity="warning"
            variant="filled"
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={handleClose}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
            onClose={handleClose}
          >
            {formatMessage({
              id: 'mobile.warning',
              defaultMessage:
                'This page is not optimized for mobile screens. For the best experience, please view it on a larger device.',
            })}
          </Alert>
        </Box>
      )}
    </>
  );
};

export default MobileWarning;

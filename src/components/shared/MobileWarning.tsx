'use client';
import React, { useState } from 'react';
import { Alert, Box, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useMediaQueries } from '@/lib/useMediaQueries';

const MobileWarning: React.FC = () => {
  const { isExtraSmall } = useMediaQueries();

  // State to control visibility of the alert
  const [open, setOpen] = useState(true);

  // Function to close the alert
  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      {isExtraSmall && open && (
        <Box sx={{ width: '100%', position: 'fixed', top: 0, zIndex: 1000 }}>
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
            This page is not optimized for mobile screens. For the best
            experience, please view it on a larger device.
          </Alert>
        </Box>
      )}
    </>
  );
};

export default MobileWarning;

'use client';
import { useState } from 'react';
import { Button } from '@mui/material';

const CrashNow = () => {
  throw new Error('Manual test error from DebugErrorButton');
};

const DebugErrorButton = () => {
  const [shouldCrash, setShouldCrash] = useState(false);

  return (
    <>
      <Button
        color="error"
        variant="outlined"
        onClick={() => setShouldCrash(true)}
        sx={{ mb: 2 }}
      >
        Trigger Error (dev only)
      </Button>
      {shouldCrash && <CrashNow />}
    </>
  );
};

export default DebugErrorButton;

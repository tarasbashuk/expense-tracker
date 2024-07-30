import { SignInButton } from '@clerk/nextjs';
import { Button, Stack, Typography } from '@mui/material';

const Guest = () => {
  return (
    <Stack>
      <Typography variant="h4">Welcome</Typography>
      <Typography variant="body1" gutterBottom>
        Please Sign In to manage your transactions
      </Typography>
      <SignInButton>
        <Button variant="contained" sx={{ textTransform: 'none' }}>
          Sign In
        </Button>
      </SignInButton>
    </Stack>
  );
};

export default Guest;

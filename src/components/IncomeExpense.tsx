import Link from 'next/link';
import {
  Box,
  Card,
  Chip,
  CardContent,
  Divider,
  Typography,
} from '@mui/material';
import getIncomeExpense from '@/app/actions/getIncomeExpense';

import { NavigationPath } from '@/constants/types';

const IncomeExpense = async () => {
  const { income, expense, creditReceived, creditReturned } =
    await getIncomeExpense();

  return (
    <Link href={NavigationPath.Transactions}>
      <Card>
        <CardContent>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box display="flex" flexDirection="column" flex={1} p={1}>
              <Typography variant="h6" component="div">
                Income
              </Typography>
              <Typography
                variant="h5"
                component="div"
                sx={{ color: 'success.main' }}
              >
                {income?.toFixed(2)}
              </Typography>
            </Box>

            <Divider orientation="vertical" flexItem sx={{ marginX: '1px' }} />

            <Box display="flex" flexDirection="column" flex={1} p={1}>
              <Typography variant="h6" component="div">
                Expense
              </Typography>
              <Typography
                variant="h5"
                component="div"
                sx={{ color: 'error.main' }}
              >
                {expense?.toFixed(2)}
              </Typography>
            </Box>
          </Box>

          {/* <Divider orientation="horizontal" flexItem sx={{ marginY: 2 }} /> */}
          <Box
            width={'100%'}
            display="flex"
            justifyContent="flex-start"
            flex={1}
          >
            <Chip
              label="plus:"
              color="error"
              variant="outlined"
              size="small"
              sx={{
                flex: '1 1 50%',
                mr: 1,
              }}
            />
            <Chip
              label="plus:"
              color="success"
              variant="outlined"
              size="small"
              sx={{
                flex: '1 1 50%',
              }}
            />
          </Box>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box display="flex" flexDirection="column" flex={1} p={1}>
              <Typography
                variant="h6"
                component="div"
                sx={{
                  whiteSpace: 'nowrap',
                }}
              >
                credit recieved
              </Typography>

              <Typography
                variant="h5"
                component="div"
                sx={{ color: 'error.main' }}
              >
                {creditReceived?.toFixed(2)}
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem sx={{ marginX: '1px' }} />

            <Box display="flex" flexDirection="column" flex={1} p={1}>
              <Typography
                variant="h6"
                component="div"
                sx={{
                  whiteSpace: 'nowrap',
                }}
              >
                credit returned
              </Typography>
              <Typography
                variant="h5"
                component="div"
                sx={{ color: 'success.main' }}
              >
                {creditReturned?.toFixed(2)}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Link>
  );
};

export default IncomeExpense;

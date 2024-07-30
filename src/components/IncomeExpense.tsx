import { Box, Card, CardContent, Divider, Typography } from '@mui/material';
import getIncomeExpense from '@/app/actions/getIncomeExpense';

const IncomeExpense = async () => {
  const { income, expense } = await getIncomeExpense();

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box textAlign="center" flex={1} p={1}>
            <Typography variant="h6" component="div">
              Income
            </Typography>
            <Typography
              variant="h5"
              component="div"
              sx={{ color: 'success.main' }}
            >
              {income}
            </Typography>
          </Box>
          <Divider orientation="vertical" flexItem sx={{ marginX: 2 }} />
          <Box textAlign="center" flex={1} p={1}>
            <Typography variant="h6" component="div">
              Expense
            </Typography>
            <Typography
              variant="h5"
              component="div"
              sx={{ color: 'error.main' }}
            >
              {expense}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default IncomeExpense;

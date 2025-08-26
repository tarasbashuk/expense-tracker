'use client';
import Link from 'next/link';
import {
  Box,
  Card,
  Chip,
  CardContent,
  Divider,
  Typography,
} from '@mui/material';
import { FormattedMessage } from 'react-intl';
import { NavigationPath } from '@/constants/types';
import { formatCurrency } from '@/lib/formatCurrency';

interface Props {
  income?: number | null;
  expense?: number | null;
  creditReceived?: number | null;
  creditReturned?: number | null;
}

const IncomeExpenseView = ({
  income,
  expense,
  creditReceived,
  creditReturned,
}: Props) => (
  <Link href={NavigationPath.Transactions}>
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" flexDirection="column" flex={1} p={1}>
            <Typography variant="h6" component="div">
              <FormattedMessage
                id="incomeExpense.income"
                defaultMessage="Income"
              />
            </Typography>
            <Typography
              variant="h5"
              component="div"
              sx={{ color: 'success.main' }}
            >
              {formatCurrency(income ?? 0)}
            </Typography>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ marginX: '1px' }} />

          <Box display="flex" flexDirection="column" flex={1} p={1}>
            <Typography variant="h6" component="div">
              <FormattedMessage
                id="incomeExpense.expense"
                defaultMessage="Expense"
              />
            </Typography>
            <Typography
              variant="h5"
              component="div"
              sx={{ color: 'error.main' }}
            >
              {formatCurrency(expense ?? 0)}
            </Typography>
          </Box>
        </Box>

        <Box width={'100%'} display="flex" justifyContent="flex-start" flex={1}>
          <Chip
            label={<FormattedMessage id="common.plus" defaultMessage="plus:" />}
            color="error"
            variant="outlined"
            size="small"
            sx={{ flex: '1 1 50%', mr: 1 }}
          />
          <Chip
            label={<FormattedMessage id="common.plus" defaultMessage="plus:" />}
            color="success"
            variant="outlined"
            size="small"
            sx={{ flex: '1 1 50%' }}
          />
        </Box>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" flexDirection="column" flex={1} p={1}>
            <Typography
              variant="h6"
              component="div"
              // sx={{ whiteSpace: 'nowrap' }}
            >
              <FormattedMessage
                id="incomeExpense.creditReceived"
                defaultMessage="credit taken"
              />
            </Typography>
            <Typography
              variant="h5"
              component="div"
              sx={{ color: 'error.main' }}
            >
              {formatCurrency(creditReceived ?? 0)}
            </Typography>
          </Box>
          <Divider orientation="vertical" flexItem sx={{ marginX: '1px' }} />
          <Box display="flex" flexDirection="column" flex={1} p={1}>
            <Typography
              variant="h6"
              component="div"
              // sx={{ whiteSpace: 'nowrap' }}
            >
              <FormattedMessage
                id="incomeExpense.creditReturned"
                defaultMessage="credit back"
              />
            </Typography>
            <Typography
              variant="h5"
              component="div"
              sx={{ color: 'success.main' }}
            >
              {formatCurrency(creditReturned ?? 0)}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  </Link>
);

export default IncomeExpenseView;

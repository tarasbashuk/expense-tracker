'use client';
import Link from 'next/link';
import { Box, Card, CardContent, Divider, Typography } from '@mui/material';
import { FormattedMessage } from 'react-intl';
import { NavigationPath } from '@/constants/types';
import { formatCurrency } from '@/lib/formatCurrency';

interface Props {
  income?: number | null;
  expense?: number | null;
}

const IncomeExpenseView = ({ income, expense }: Props) => (
  <Link href={NavigationPath.Transactions}>
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box
            display="flex"
            flexDirection="column"
            flex={1}
            p={1}
            sx={{ minWidth: 0, width: '50%' }}
          >
            <Typography variant="h6" component="div">
              <FormattedMessage
                id="incomeExpense.income"
                defaultMessage="Income"
              />
            </Typography>
            <Typography
              variant="h5"
              component="div"
              sx={{
                color: 'success.main',
                whiteSpace: 'nowrap',
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatCurrency(income ?? 0)}
            </Typography>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ marginX: '1px' }} />

          <Box
            display="flex"
            flexDirection="column"
            flex={1}
            p={1}
            sx={{ minWidth: 0, width: '50%' }}
          >
            <Typography variant="h6" component="div">
              <FormattedMessage
                id="incomeExpense.expense"
                defaultMessage="Expense"
              />
            </Typography>
            <Typography
              variant="h5"
              component="div"
              sx={{
                color: 'error.main',
                whiteSpace: 'nowrap',
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatCurrency(expense ?? 0)}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  </Link>
);

export default IncomeExpenseView;

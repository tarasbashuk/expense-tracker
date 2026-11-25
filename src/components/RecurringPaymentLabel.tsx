'use client';

import { Typography } from '@mui/material';
import { useIntl } from 'react-intl';

export default function RecurringPaymentLabel({
  transaction,
}: {
  transaction: {
    recurringPaymentNumber?: number | null;
    recurringPaymentCount?: number | null;
  };
}) {
  const { formatMessage } = useIntl();

  if (!transaction.recurringPaymentNumber || !transaction.recurringPaymentCount)
    return null;

  return (
    <Typography
      component="span"
      variant="caption"
      color="text.secondary"
      sx={{ display: 'block' }}
    >
      {formatMessage(
        { id: 'recurrence.paymentProgress' },
        {
          number: transaction.recurringPaymentNumber,
          count: transaction.recurringPaymentCount,
        },
      )}
    </Typography>
  );
}

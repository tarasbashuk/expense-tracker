'use client';
import { FC } from 'react';
import { format } from 'date-fns';
import { Transaction, TransactionType } from '@prisma/client';
import { useIntl } from 'react-intl';
import {
  Avatar,
  Divider,
  IconButton,
  ListItem,
  ListItemAvatar,
  ListItemSecondaryAction,
  ListItemText,
  Typography,
  Tooltip,
  Box,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RepeatIcon from '@mui/icons-material/Repeat';
import { getIconByName } from '@/lib/getCategoryIcon';
import { green, red } from '@mui/material/colors';

import { TransactionCategory } from '@/constants/types';
import { CURRENCY_SYMBOL_MAP } from '@/constants/constants';
import { useSettings } from '@/context/SettingsContexts';
import { getTransactionSign, formatDate } from '@/lib/utils';
import { Locale } from '@/locales';

interface Props {
  transaction: Transaction;
  /* eslint-disable no-unused-vars*/
  handleEdit: (id: string) => void;
  handleDelete: (id: string) => void;
  /* eslint-enable */
}

const TransactionItem: FC<Props> = ({
  transaction,
  handleEdit,
  handleDelete,
}) => {
  // TODO: pass as prop
  const { settings } = useSettings();
  const { locale } = useIntl();
  const {
    id,
    date,
    type,
    text,
    amount,
    category,
    currency,
    amountDefaultCurrency,
    isRecurring,
    recurringEndDate,
  } = transaction;
  const sign = getTransactionSign(type);
  const IconComponent = getIconByName(category as TransactionCategory);
  const labelColor = type === TransactionType.Expense ? red[500] : green[500];
  const formattedDate = formatDate(date, locale as Locale);
  const isSecondaryAmountShown = currency !== settings.defaultCurrency;

  // Format recurring end date for tooltip
  const recurringEndDateFormatted = recurringEndDate
    ? format(new Date(recurringEndDate), 'PP')
    : null;

  const recurringTooltip = isRecurring
    ? `Recurring transaction${recurringEndDateFormatted ? ` until ${recurringEndDateFormatted}` : ' (infinite)'}`
    : '';

  return (
    <>
      <ListItem sx={{ mt: 1, backgroundColor: 'background.paper' }}>
        <ListItemAvatar
          onClick={() => handleEdit(id)}
          sx={{
            cursor: 'pointer',
            '&:hover': {
              opacity: '0.7',
            },
          }}
        >
          <Avatar sx={{ bgcolor: labelColor }}>
            {IconComponent && <IconComponent />}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                noWrap
                sx={{
                  width: { xs: '130px', sm: '250px' },
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {text}
              </Typography>
              {isRecurring && (
                <Tooltip title={recurringTooltip} arrow>
                  <RepeatIcon
                    sx={{
                      color: green[500],
                      fontSize: '1.2rem',
                      cursor: 'help',
                    }}
                  />
                </Tooltip>
              )}
            </Box>
          }
          secondary={formattedDate}
        />
        <ListItemText
          sx={{
            textAlign: 'right',
            width: { xs: '100px', sm: '150px' },
          }}
          primary={`${sign} ${Math.abs(amountDefaultCurrency!)} ${CURRENCY_SYMBOL_MAP[settings.defaultCurrency]}`}
          secondary={
            isSecondaryAmountShown &&
            `${sign} ${Math.abs(amount)} ${CURRENCY_SYMBOL_MAP[currency]}`
          }
        />
        <ListItemSecondaryAction>
          <IconButton
            edge="end"
            aria-label="delete"
            onClick={() => handleDelete(id)}
          >
            <DeleteIcon />
          </IconButton>
        </ListItemSecondaryAction>
      </ListItem>
      <Divider />
    </>
  );
};

export default TransactionItem;

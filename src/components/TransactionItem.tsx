'use client';
import { FC } from 'react';
import { format } from 'date-fns';
import { Transaction, TransactionType } from '@prisma/client';
import {
  Avatar,
  Divider,
  IconButton,
  ListItem,
  ListItemAvatar,
  ListItemSecondaryAction,
  ListItemText,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { getIconByName } from '@/lib/getCategoryIcon';
import { green, red } from '@mui/material/colors';

import { TranactionCategory } from '@/constants/types';
import { CURRENCY_SYMBOL_MAP } from '@/constants/constants';
import { useSettings } from '@/context/SettingsContexts';

interface Props {
  transaction: Transaction;
  handleDelete: (id: string) => void;
}

const TransactionItem: FC<Props> = ({ transaction, handleDelete }) => {
  const { settings } = useSettings();
  const {
    id,
    date,
    type,
    text,
    amount,
    category,
    currency,
    amountDefaultCurrency,
  } = transaction;
  const sign = type === TransactionType.Expense ? '-' : '+';
  const IconComponent = getIconByName(category as TranactionCategory);
  const labelColor = type === TransactionType.Expense ? red[500] : green[500];
  const formattedDate = format(date, 'PP');

  return (
    <>
      <ListItem sx={{ mt: 1, backgroundColor: 'background.paper' }}>
        <ListItemAvatar>
          <Avatar sx={{ bgcolor: labelColor }}>
            {IconComponent && <IconComponent />}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={
            <Typography
              noWrap
              sx={{
                width: { xs: '150px', sm: '250px' },
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {text}
            </Typography>
          }
          secondary={formattedDate}
        />
        <ListItemText
          sx={{
            textAlign: 'right',
            width: { xs: '100px', sm: '150px' },
          }}
          primary={`${sign} ${Math.abs(amountDefaultCurrency!)} ${CURRENCY_SYMBOL_MAP[settings.defaultCurrency]}`}
          secondary={`${sign} ${Math.abs(amount)} ${CURRENCY_SYMBOL_MAP[currency]}`}
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

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

interface Props {
  transaction: Transaction;
  handleDelete: (id: string) => void;
}

const TransactionItem: FC<Props> = ({ transaction, handleDelete }) => {
  const { id, createdAt, type, text, amount, category } = transaction;
  const sign = type === TransactionType.Expense ? '-' : '+';
  const IconComponent = getIconByName(category as TranactionCategory);
  const labelColor = type === TransactionType.Expense ? red[500] : green[500];
  const formattedDate = format(createdAt, 'PP');

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
        <Typography variant="body1" sx={{ marginX: 2, textWrap: 'nowrap' }}>
          {sign} {Math.abs(amount)}
        </Typography>
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

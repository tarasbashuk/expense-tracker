'use client';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import { Transaction, TransactionType } from '@prisma/client';

import deleteTransaction from '@/app/actions/deleteTransaction';
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
import { format } from 'date-fns';

const TransactionItem = ({ transaction }: { transaction: Transaction }) => {
  const router = useRouter();
  const { id, createdAt, type, text, amount, category } = transaction;
  const sign = type === TransactionType.Expense ? '-' : '+';
  const IconComponent = getIconByName(category as TranactionCategory);
  const labelColor = type === TransactionType.Expense ? red[500] : green[500];
  const formattedDate = format(createdAt, 'PP');

  const handleDeleteTransaction = async (transactionId: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this transaction?',
    );

    if (!confirmed) return;

    const { message, error } = await deleteTransaction(transactionId);

    if (error) {
      toast.error(error);
    }

    router.refresh();
    toast.success(message);
  };

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
                width: '250px',
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
            onClick={() => handleDeleteTransaction(id)}
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

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
  ListItemText,
  Typography,
  Tooltip,
  Box,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import RepeatIcon from '@mui/icons-material/Repeat';
import { getIconByName } from '@/lib/getCategoryIcon';
import { green, red } from '@mui/material/colors';

import { TransactionCategory } from '@/constants/types';
import { formatCurrency } from '@/lib/formatCurrency';
import { useSettings } from '@/context/SettingsContexts';
import { getTransactionSign, formatDate } from '@/lib/utils';
import { Locale } from '@/locales';

interface Props {
  transaction: Transaction;
  /* eslint-disable no-unused-vars*/
  handleEdit: (id: string) => void;
  handleDelete: (id: string) => void;
  handleCopy?: (id: string) => void;
  /* eslint-enable */
}

const TransactionItem: FC<Props> = ({
  transaction,
  handleEdit,
  handleDelete,
  handleCopy,
}) => {
  // TODO: pass as prop
  const { settings } = useSettings();
  const { locale, formatMessage } = useIntl();
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
      <ListItem
        disableGutters
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '40px minmax(0, 1fr) auto',
            sm: '40px minmax(0, 1fr) auto auto',
          },
          columnGap: { xs: 1, sm: 2 },
          py: 1,
          minWidth: 0,
        }}
      >
        <ListItemAvatar sx={{ minWidth: 0 }}>
          <Avatar sx={{ bgcolor: labelColor }}>
            {IconComponent && <IconComponent />}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          sx={{ minWidth: 0 }}
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                noWrap
                sx={{
                  minWidth: 0,
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
                      flexShrink: 0,
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
        <Box sx={{ textAlign: 'right', minWidth: 0 }}>
          <Typography
            color={
              type === TransactionType.Expense ? 'error.main' : 'success.main'
            }
            sx={{ whiteSpace: 'nowrap' }}
          >
            {sign}{' '}
            {formatCurrency(
              Math.abs(amountDefaultCurrency),
              settings.defaultCurrency,
            )}
          </Typography>
          {isSecondaryAmountShown && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ whiteSpace: 'nowrap' }}
            >
              {formatCurrency(Math.abs(amount), currency)}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            display: 'flex',
            justifySelf: 'end',
            gridColumn: { xs: '2 / -1', sm: 'auto' },
          }}
        >
          <Tooltip
            title={formatMessage({ id: 'common.edit', defaultMessage: 'Edit' })}
          >
            <IconButton
              aria-label={formatMessage({
                id: 'common.edit',
                defaultMessage: 'Edit',
              })}
              onClick={() => handleEdit(id)}
              sx={{ width: 44, height: 44 }}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          {handleCopy && (
            <Tooltip
              title={formatMessage({
                id: 'home.repeatTransaction',
                defaultMessage: 'Repeat transaction',
              })}
            >
              <IconButton
                aria-label={formatMessage({
                  id: 'home.repeatTransaction',
                  defaultMessage: 'Repeat transaction',
                })}
                onClick={() => handleCopy(id)}
                sx={{ width: 44, height: 44 }}
              >
                <ContentCopyIcon />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip
            title={formatMessage({
              id: 'common.delete',
              defaultMessage: 'Delete',
            })}
          >
            <IconButton
              aria-label={formatMessage({
                id: 'common.delete',
                defaultMessage: 'Delete',
              })}
              onClick={() => handleDelete(id)}
              sx={{
                width: 44,
                height: 44,
                '&:hover, &.Mui-focusVisible': { color: 'error.main' },
              }}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </ListItem>
      <Divider />
    </>
  );
};

export default TransactionItem;

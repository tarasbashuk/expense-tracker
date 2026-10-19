'use client';
import { RepeatIcon } from '@/components/shared/icons';
import TagBadges from './tags/TagBadges';
import { FC } from 'react';
import TransactionActionsMenu from './TransactionActionsMenu';
import { format } from 'date-fns';
import { TransactionType } from '@prisma/client';
import { Transaction } from '@/lib/tags';
import { useIntl } from 'react-intl';
import {
  Avatar,
  Divider,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
  Tooltip,
  Box,
} from '@mui/material';
import CategoryIcon from './history/CategoryIcon';
import { green, red } from '@mui/material/colors';

import { formatCurrency } from '@/lib/formatCurrency';
import { useSettings } from '@/context/SettingsContexts';
import { getTransactionSign, formatDate } from '@/lib/utils';
import { Locale } from '@/locales';
import MobileTransactionItem, {
  TransactionTagLabels,
} from './history/MobileTransactionItem';

interface Props {
  transaction: Transaction;
  mobileGrouped?: boolean;
  tags?: TransactionTagLabels;
  /* eslint-disable no-unused-vars*/
  handleEdit: (id: string) => void;
  handleDelete: (id: string) => void;
  handleCopy?: (id: string) => void;
  /* eslint-enable */
}

const TransactionItem: FC<Props> = ({
  transaction,
  mobileGrouped = false,
  tags,
  handleEdit,
  handleDelete,
  handleCopy,
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

  if (mobileGrouped) {
    return (
      <MobileTransactionItem
        transaction={transaction}
        tags={tags}
        handleEdit={handleEdit}
        handleCopy={handleCopy}
        handleDelete={handleDelete}
      />
    );
  }

  return (
    <>
      <ListItem
        disableGutters
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '36px minmax(0, 1fr) auto 44px',
            sm: '40px minmax(0, 1fr) auto 44px',
          },
          columnGap: { xs: 0.5, sm: 2 },
          py: 1,
          minWidth: 0,
        }}
      >
        <ListItemAvatar sx={{ minWidth: 0 }}>
          <Avatar
            sx={{
              bgcolor: labelColor,
              width: { xs: 36, sm: 40 },
              height: { xs: 36, sm: 40 },
            }}
          >
            <CategoryIcon category={category} />
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
          secondary={
            <>
              {formattedDate}
              <TagBadges tags={transaction.tags} />
            </>
          }
        />
        <Box sx={{ textAlign: 'right', minWidth: 0 }}>
          <Typography
            color={
              type === TransactionType.Expense ? 'error.main' : 'success.main'
            }
            sx={{
              whiteSpace: 'nowrap',
              fontSize: { xs: '1.125rem', sm: '1rem' },
            }}
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
        <TransactionActionsMenu
          transaction={transaction}
          onEdit={() => handleEdit(id)}
          onCopy={handleCopy ? () => handleCopy(id) : undefined}
          onDelete={() => handleDelete(id)}
        />
      </ListItem>
      <Divider />
    </>
  );
};

export default TransactionItem;

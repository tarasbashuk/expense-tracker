'use client';

import TagBadges from '../tags/TagBadges';
import { Box, ButtonBase, ListItem, Tooltip, Typography } from '@mui/material';
import { Transaction } from '@/lib/tags';
import { Repeat2 } from 'lucide-react';
import { useIntl } from 'react-intl';
import TransactionActionsMenu from '../TransactionActionsMenu';
import { useSettings } from '@/context/SettingsContexts';
import { formatCurrency } from '@/lib/formatCurrency';
import { Locale } from '@/locales';
import { getTransactionSign, formatDate } from '@/lib/utils';
import { historyColors as colors } from './tokens';

export type TransactionTagLabels =
  | readonly []
  | readonly [string]
  | readonly [string, string];

interface Props {
  transaction: Transaction;
  tags?: TransactionTagLabels;
  handleEdit: (_id: string) => void;
  handleDelete: (_id: string) => void;
  handleCopy?: (_id: string) => void;
}

export default function MobileTransactionItem({
  transaction,
  tags,
  handleEdit,
  handleCopy,
  handleDelete,
}: Props) {
  const { settings } = useSettings();
  const { formatMessage, locale } = useIntl();
  const {
    id,
    text,
    type,
    amount,
    amountDefaultCurrency,
    currency,
    isRecurring,
  } = transaction;
  const editLabel = formatMessage(
    { id: 'history.editTransaction' },
    { description: text },
  );
  const hasTags = Boolean(transaction.tags?.length || tags?.length);
  const amountColor = type === 'Expense' ? colors.expense : colors.income;
  const recurringLabel = formatMessage({ id: 'grid.recurringTooltip' });
  const recurringDetails = transaction.recurringEndDate
    ? `${formatMessage({ id: 'grid.until' })} ${formatDate(transaction.recurringEndDate, locale as Locale)}`
    : formatMessage({ id: 'grid.infinite' });

  return (
    <ListItem
      disableGutters
      sx={{ px: 1.25, py: 1.5, gap: 1, alignItems: 'center', minWidth: 0 }}
    >
      <TransactionActionsMenu
        categoryButton
        stretchCategoryButton={hasTags}
        transaction={transaction}
        onEdit={() => handleEdit(id)}
        onCopy={handleCopy ? () => handleCopy(id) : undefined}
        onDelete={() => handleDelete(id)}
      />
      <ButtonBase
        onClick={() => handleEdit(id)}
        aria-label={editLabel}
        sx={{
          flex: 1,
          minWidth: 0,
          minHeight: 44,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          alignItems: 'center',
          gap: 1,
          textAlign: 'left',
          borderRadius: 1,
          '&.Mui-focusVisible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2,
          },
        }}
      >
        <Box component="span" sx={{ minWidth: 0 }}>
          <Box
            component="span"
            sx={{
              display: 'flex',
              gap: 0.5,
              alignItems: 'center',
              minWidth: 0,
            }}
          >
            <Typography
              component="span"
              sx={{
                color: colors.text,
                fontSize: 16,
                lineHeight: 1.4,
                overflow: 'hidden',
                display: hasTags ? 'block' : '-webkit-box',
                minWidth: 0,
                whiteSpace: hasTags ? 'nowrap' : 'normal',
                WebkitLineClamp: hasTags ? undefined : 2,
                WebkitBoxOrient: hasTags ? undefined : 'vertical',
                overflowWrap: 'anywhere',
                textOverflow: 'ellipsis',
              }}
            >
              {text}
            </Typography>
            {isRecurring && (
              <Tooltip title={`${recurringLabel} (${recurringDetails})`} arrow>
                <Box
                  component="span"
                  aria-label={recurringLabel}
                  sx={{
                    color: colors.income,
                    flexShrink: 0,
                    display: 'inline-flex',
                  }}
                >
                  <Repeat2 size={16} aria-hidden="true" />
                </Box>
              </Tooltip>
            )}
          </Box>
          <TagBadges tags={transaction.tags} />
          {!transaction.tags?.length && !!tags?.length && (
            <TagBadges
              tags={tags.map((name, index) => ({
                id: String(index),
                name,
                color: 'slate',
              }))}
            />
          )}
        </Box>
        <Box
          component="span"
          sx={{
            textAlign: 'right',
            whiteSpace: 'nowrap',
            alignSelf: 'center',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <Typography
            component="span"
            sx={{
              display: 'block',
              color: amountColor,
              fontSize: 16,
              fontWeight: 600,
              lineHeight: 1.4,
            }}
          >
            {getTransactionSign(type)}
            {formatCurrency(
              Math.abs(amountDefaultCurrency),
              settings.defaultCurrency,
            )}
          </Typography>
          {currency !== settings.defaultCurrency && (
            <Typography
              component="span"
              sx={{
                display: 'block',
                color: colors.secondary,
                fontSize: 12,
                mt: 0.25,
              }}
            >
              {formatCurrency(Math.abs(amount), currency)}
            </Typography>
          )}
        </Box>
      </ButtonBase>
    </ListItem>
  );
}

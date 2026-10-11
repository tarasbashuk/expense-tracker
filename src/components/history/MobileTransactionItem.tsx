'use client';

import { Box, ButtonBase, ListItem, Typography } from '@mui/material';
import { Transaction } from '@prisma/client';
import { Repeat2 } from 'lucide-react';
import { useIntl } from 'react-intl';
import TransactionActionsMenu from '../TransactionActionsMenu';
import { useSettings } from '@/context/SettingsContexts';
import { formatCurrency } from '@/lib/formatCurrency';
import { getTransactionSign } from '@/lib/utils';
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
  const { formatMessage } = useIntl();
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
  const amountColor = type === 'Expense' ? colors.expense : colors.income;

  return (
    <ListItem
      disableGutters
      sx={{ px: 1.25, py: 1.5, gap: 1, alignItems: 'center', minWidth: 0 }}
    >
      <TransactionActionsMenu
        categoryButton
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
            sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}
          >
            <Typography
              component="span"
              sx={{
                color: colors.text,
                fontSize: 16,
                lineHeight: 1.4,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflowWrap: 'anywhere',
              }}
            >
              {text}
            </Typography>
            {isRecurring && (
              <Box
                component="span"
                aria-label={formatMessage({ id: 'history.recurringOnly' })}
                sx={{
                  color: colors.income,
                  flexShrink: 0,
                  display: 'inline-flex',
                }}
              >
                <Repeat2 size={16} aria-hidden="true" />
              </Box>
            )}
          </Box>
          {!!tags?.length && (
            <Box
              component="span"
              sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}
            >
              {tags.map((tag, index) => (
                <Box
                  component="span"
                  key={index}
                  sx={{
                    px: 0.75,
                    py: 0.125,
                    borderRadius: 1,
                    bgcolor: colors.expenseBackground,
                    color: colors.secondary,
                    fontSize: 12,
                    overflowWrap: 'anywhere',
                    maxWidth: '100%',
                  }}
                >
                  {tag}
                </Box>
              ))}
            </Box>
          )}
        </Box>
        <Box
          component="span"
          sx={{
            textAlign: 'right',
            whiteSpace: 'nowrap',
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

'use client';

import { Transaction, TransactionType } from '@prisma/client';
import {
  Avatar,
  Box,
  Card,
  CardContent,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { green, red } from '@mui/material/colors';
import { useIntl } from 'react-intl';

import { getIconByName } from '@/lib/getCategoryIcon';
import { TransactionCategory } from '@/constants/types';
import { useSettings } from '@/context/SettingsContexts';
import { useTransactions } from '@/context/TranasctionsContext';
import { formatCurrency } from '@/lib/formatCurrency';
import { formatDate } from '@/lib/utils';
import { Locale } from '@/locales';

export default function RecentTransactions({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const { formatMessage, locale } = useIntl();
  const {
    settings: { defaultCurrency },
  } = useSettings();
  const {
    setTransactionDraft,
    setTransactionId,
    setIsCopyTransactionFlow,
    setIsTransactionModalOpen,
  } = useTransactions();

  const repeatTransaction = (transaction: Transaction) => {
    setTransactionId(null);
    setIsCopyTransactionFlow(false);
    setTransactionDraft({
      text: transaction.text,
      amount: transaction.amount,
      category: transaction.category,
      currency: transaction.currency,
      type: transaction.type,
    });
    setIsTransactionModalOpen(true);
  };

  return (
    <Card sx={{ minWidth: 0, width: '100%' }}>
      <CardContent
        sx={{
          p: { xs: 2, sm: 3 },
          minWidth: 0,
          '&:last-child': { pb: { xs: 2, sm: 3 } },
        }}
      >
        <Typography variant="h6">
          {formatMessage({
            id: 'home.recentTransactions',
            defaultMessage: 'Recent transactions',
          })}
        </Typography>

        {!transactions.length ? (
          <Typography color="text.secondary" mt={2}>
            {formatMessage({
              id: 'home.noRecentTransactions',
              defaultMessage: 'No transactions yet',
            })}
          </Typography>
        ) : (
          <List disablePadding>
            {transactions.map((transaction) => {
              const Icon = getIconByName(
                transaction.category as TransactionCategory,
              );
              const isExpense = transaction.type === TransactionType.Expense;

              return (
                <ListItem
                  key={transaction.id}
                  disableGutters
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '48px minmax(0, 1fr) auto 40px',
                      sm: '56px minmax(0, 1fr) auto 48px',
                    },
                    columnGap: { xs: 0.5, sm: 1 },
                    minWidth: 0,
                    py: 1,
                  }}
                >
                  <ListItemAvatar sx={{ minWidth: 0 }}>
                    <Avatar sx={{ bgcolor: isExpense ? red[500] : green[500] }}>
                      <Icon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={transaction.text}
                    secondary={formatDate(transaction.date, locale as Locale)}
                    primaryTypographyProps={{ noWrap: true }}
                    sx={{ minWidth: 0, m: 0 }}
                  />
                  <Box textAlign="right" minWidth={0}>
                    <Typography
                      color={isExpense ? 'error.main' : 'success.main'}
                      whiteSpace="nowrap"
                    >
                      {isExpense ? '−' : '+'}{' '}
                      {formatCurrency(
                        transaction.amountDefaultCurrency,
                        defaultCurrency,
                      )}
                    </Typography>
                    {transaction.currency !== defaultCurrency && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        whiteSpace="nowrap"
                      >
                        {formatCurrency(
                          transaction.amount,
                          transaction.currency,
                        )}
                      </Typography>
                    )}
                  </Box>
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
                      onClick={() => repeatTransaction(transaction)}
                      sx={{ justifySelf: 'end' }}
                    >
                      <ContentCopyIcon />
                    </IconButton>
                  </Tooltip>
                </ListItem>
              );
            })}
          </List>
        )}
      </CardContent>
    </Card>
  );
}

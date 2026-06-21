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
    <Card>
      <CardContent>
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
                  secondaryAction={
                    <Tooltip
                      title={formatMessage({
                        id: 'home.repeatTransaction',
                        defaultMessage: 'Repeat transaction',
                      })}
                    >
                      <IconButton
                        edge="end"
                        aria-label={formatMessage({
                          id: 'home.repeatTransaction',
                          defaultMessage: 'Repeat transaction',
                        })}
                        onClick={() => repeatTransaction(transaction)}
                      >
                        <ContentCopyIcon />
                      </IconButton>
                    </Tooltip>
                  }
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: isExpense ? red[500] : green[500] }}>
                      <Icon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={transaction.text}
                    secondary={formatDate(transaction.date, locale as Locale)}
                    primaryTypographyProps={{ noWrap: true }}
                    sx={{ minWidth: 0, pr: 1 }}
                  />
                  <Box pr={5} textAlign="right">
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
                </ListItem>
              );
            })}
          </List>
        )}
      </CardContent>
    </Card>
  );
}

'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Transaction } from '@prisma/client';
import { Box, List, Typography, CircularProgress } from '@mui/material';
import ViewListIcon from '@mui/icons-material/ViewList';
import TableViewIcon from '@mui/icons-material/TableView';

import TransactionItem from './TransactionItem';
import getTransactions from '@/app/actions/getTransactions';
import deleteTransaction from '@/app/actions/deleteTransaction';
import { useTransactions } from '@/context/TranasctionsContext';
import { useSettings } from '@/context/SettingsContexts';
import DatePeriodFilter from './shared/DatePeriodFilter';
import TransactionsDataGrid from './TransactionsDataGrid';
import { TransactionCategory, ViewType } from '@/constants/types';
import AdditionalBalanceInfo from './AdditionalBalanceInfo';
import getIncomeExpense from '@/app/actions/getIncomeExpense';
import { useIntl } from 'react-intl';
import {
  INCOME_CATEGORIES_LIST,
  EXPENSE_CATEGORIES_LIST,
  CURRENCY_SYMBOL_MAP,
} from '@/constants/constants';
import { TransactionType } from '@prisma/client';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  dateKeyFromLocalDate,
  DateRangeValue,
  getPeriodRange,
  PeriodMode,
  shiftPeriod,
} from '@/lib/dateRange';

const today = new Date();
const currentDate = dateKeyFromLocalDate(today);
const initialCustomRange = {
  ...getPeriodRange('month', currentDate, {
    start: currentDate,
    end: currentDate,
  }),
  end: currentDate,
};

const TransactionList = () => {
  const {
    transactions,
    setTransactions,
    setTransactionId,
    setIsCopyTransactionFlow,
    setIsTransactionModalOpen,
    transactionsRefreshKey,
  } = useTransactions();

  const [error, setError] = useState<string>('');
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
  const [anchorDate, setAnchorDate] = useState(currentDate);
  const [customRange, setCustomRange] =
    useState<DateRangeValue>(initialCustomRange);
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [viewType, setViewType] = useState(ViewType.List);
  const [isLoading, setIsloading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<
    TransactionCategory | 'all'
  >('all');
  const [selectedTransactionType, setSelectedTransactionType] = useState<
    TransactionType | 'all'
  >('all');
  const [filteredSum, setFilteredSum] = useState<number>(0);

  const { formatMessage } = useIntl();
  const { settings } = useSettings();
  const selectedRange = useMemo(
    () => getPeriodRange(periodMode, anchorDate, customRange),
    [anchorDate, customRange, periodMode],
  );

  const shiftSelectedPeriod = useCallback(
    (direction: -1 | 1) => {
      const shifted = shiftPeriod(
        periodMode,
        anchorDate,
        customRange,
        direction,
      );

      setAnchorDate(shifted.anchorDate);
      setCustomRange(shifted.customRange);
    },
    [anchorDate, customRange, periodMode],
  );

  const handlePeriodModeChange = useCallback(
    (nextMode: PeriodMode) => {
      if (periodMode === 'custom' && nextMode !== 'custom') {
        setAnchorDate(customRange.start);
      }

      setPeriodMode(nextMode);
    },
    [customRange.start, periodMode],
  );

  // Get categories based on selected transaction type
  const getAvailableCategories = () => {
    if (selectedTransactionType === 'all') {
      return [...INCOME_CATEGORIES_LIST, ...EXPENSE_CATEGORIES_LIST];
    } else if (selectedTransactionType === TransactionType.Income) {
      return INCOME_CATEGORIES_LIST;
    } else {
      return EXPENSE_CATEGORIES_LIST;
    }
  };

  const availableCategories = getAvailableCategories();

  const handleEditTransaction = useCallback(
    (transactionId: string) => {
      setTransactionId(transactionId);
      setIsTransactionModalOpen(true);
    },
    [setTransactionId, setIsTransactionModalOpen],
  );

  const handleCopyTransaction = useCallback(
    (transactionId: string) => {
      setTransactionId(transactionId);
      setIsTransactionModalOpen(true);
      setIsCopyTransactionFlow(true);
    },
    [setTransactionId, setIsCopyTransactionFlow, setIsTransactionModalOpen],
  );

  const handleDeleteTransaction = useCallback(
    async (transactionId: string) => {
      const confirmed = window.confirm(
        formatMessage({
          id: 'transactions.deleteConfirm',
          defaultMessage: 'Are you sure you want to delete this transaction?',
        }),
      );

      if (!confirmed) return;

      const { message, error } = await deleteTransaction(transactionId);

      if (error) {
        toast.error(error);
      }

      toast.success(message);
      setTransactions((prevTrans: Transaction[]) => {
        const updatedTransactions = prevTrans.filter(
          (trans) => trans.id !== transactionId,
        );

        return updatedTransactions;
      });
    },
    [setTransactions, formatMessage],
  );

  const handleTypeChange = useCallback(
    (_event: React.MouseEvent<HTMLElement>, newType: ViewType) => {
      // If a user click on already selected type button, the newType cames as null
      if (!newType) return;

      setViewType(newType);
    },
    [],
  );

  const handleTransactionTypeChange = useCallback(
    (
      _event: React.MouseEvent<HTMLElement>,
      newType: 'all' | TransactionType,
    ) => {
      if (!newType) return;

      setSelectedTransactionType(newType);
      // Reset category when transaction type changes
      setSelectedCategory('all');
    },
    [],
  );

  useEffect(() => {
    let isCurrentRequest = true;

    const fetchTrans = async () => {
      const [transactionsResponse, incomeExpenseResponse] = await Promise.all([
        getTransactions(selectedRange.start, selectedRange.end, true),
        getIncomeExpense(selectedRange.start, selectedRange.end),
      ]);

      if (!isCurrentRequest) return;

      const { transactions, error } = transactionsResponse;
      const { income, expense } = incomeExpenseResponse;

      // Filter by category if selected
      let filteredTransactions = transactions || [];

      if (selectedCategory !== 'all') {
        filteredTransactions = filteredTransactions.filter(
          (transaction) => transaction.category === selectedCategory,
        );
      }

      // Filter by transaction type if selected
      if (selectedTransactionType !== 'all') {
        filteredTransactions = filteredTransactions.filter(
          (transaction) => transaction.type === selectedTransactionType,
        );
      }

      setTransactions(filteredTransactions);
      setIncome(income || 0);
      setExpense(expense || 0);

      // Calculate filtered sum when category is selected
      if (selectedCategory !== 'all') {
        let totalSum = 0;

        filteredTransactions.forEach((transaction) => {
          if (transaction.type === TransactionType.Income) {
            totalSum += transaction.amountDefaultCurrency;
          } else {
            totalSum -= transaction.amountDefaultCurrency;
          }
        });

        setFilteredSum(totalSum);
      } else {
        setFilteredSum(0);
      }

      setError(error || '');
      setIsloading(false);
    };

    setIsloading(true);
    fetchTrans();

    return () => {
      isCurrentRequest = false;
    };
  }, [
    selectedCategory,
    selectedRange.end,
    selectedRange.start,
    selectedTransactionType,
    setTransactions,
    transactionsRefreshKey,
  ]);

  if (error) {
    return (
      <Typography variant="h5" component="p" color="error" my="4">
        {error}
      </Typography>
    );
  }

  return (
    <>
      <Typography variant="h4" component="h3" gutterBottom>
        {formatMessage({ id: 'transactions.title', defaultMessage: 'History' })}
      </Typography>
      <Stack
        direction="column"
        spacing={2}
        sx={{ width: { xs: '100%', sm: 400 } }}
      >
        <DatePeriodFilter
          mode={periodMode}
          range={selectedRange}
          onModeChange={handlePeriodModeChange}
          onPrevious={() => shiftSelectedPeriod(-1)}
          onNext={() => shiftSelectedPeriod(1)}
          onCustomRangeChange={setCustomRange}
        />

        <ToggleButtonGroup
          exclusive
          size="small"
          color="primary"
          value={selectedTransactionType}
          onChange={handleTransactionTypeChange}
          sx={{ width: '100%' }}
        >
          <ToggleButton value={TransactionType.Expense} sx={{ flex: 1 }}>
            {formatMessage({
              id: 'transactionType.expense',
              defaultMessage: 'Expense',
            })}
          </ToggleButton>
          <ToggleButton value="all" sx={{ flex: 1 }}>
            {formatMessage({
              id: 'filters.allTypes',
              defaultMessage: 'All',
            })}
          </ToggleButton>
          <ToggleButton value={TransactionType.Income} sx={{ flex: 1 }}>
            {formatMessage({
              id: 'transactionType.income',
              defaultMessage: 'Income',
            })}
          </ToggleButton>
        </ToggleButtonGroup>

        <FormControl variant="standard" size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="category-select-label">
            {formatMessage({
              id: 'filters.category',
              defaultMessage: 'Category',
            })}
          </InputLabel>
          <Select
            labelId="category-select-label"
            id="category-select"
            value={selectedCategory}
            onChange={(e) =>
              setSelectedCategory(e.target.value as TransactionCategory | 'all')
            }
            label={formatMessage({
              id: 'filters.category',
              defaultMessage: 'Category',
            })}
          >
            <MenuItem value="all">
              {formatMessage({
                id: 'filters.allCategories',
                defaultMessage: 'All categories',
              })}
            </MenuItem>
            {availableCategories.map((category) => (
              <MenuItem key={category.value} value={category.value}>
                {formatMessage({
                  id: `categories.${category.value}`,
                  defaultMessage: category.label,
                })}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Show filtered sum only when category is selected and not in grid view */}
        {selectedCategory !== 'all' && viewType === ViewType.List && (
          <Box
            sx={{
              mt: 1,
              p: 2,
              bgcolor: 'background.paper',
              borderRadius: 1,
              border: 1,
              borderColor: 'divider',
            }}
          >
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {formatMessage({
                id: 'filters.filteredSum',
                defaultMessage: 'Sum for selected category:',
              })}
            </Typography>
            <Typography
              variant="body1"
              color={filteredSum >= 0 ? 'success.main' : 'error.main'}
              sx={{ fontWeight: 'bold' }}
            >
              {filteredSum >= 0 ? '+' : ''}
              {filteredSum.toFixed(2)}{' '}
              {CURRENCY_SYMBOL_MAP[settings.defaultCurrency]}
            </Typography>
          </Box>
        )}
      </Stack>

      {isLoading && <CircularProgress sx={{ my: 5 }} />}

      {!transactions.length && !isLoading && (
        <Typography variant="h5" component="p" gutterBottom mt={4}>
          {formatMessage({
            id: 'transactions.noRecords',
            defaultMessage: 'No records for selected period',
          })}
        </Typography>
      )}

      {!isLoading && !!transactions.length && (
        <>
          <Box
            sx={{
              my: 1,
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <AdditionalBalanceInfo
              income={income}
              expense={expense}
              sx={{ marginLeft: { xs: 0, md: 9, lg: 18 } }}
            />
            <ToggleButtonGroup
              exclusive
              size="small"
              color="primary"
              value={viewType}
              sx={{ ml: 'auto', height: 'fit-content' }}
              onChange={handleTypeChange}
            >
              <ToggleButton value={ViewType.List}>
                <ViewListIcon />
              </ToggleButton>
              <ToggleButton value={ViewType.Grid}>
                <TableViewIcon />
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {viewType === ViewType.Grid ? (
            <TransactionsDataGrid
              rows={transactions}
              handleEdit={handleEditTransaction}
              handleCopy={handleCopyTransaction}
              handleDelete={handleDeleteTransaction}
            />
          ) : (
            <List>
              {transactions?.map((transaction: Transaction) => (
                <TransactionItem
                  key={transaction.id}
                  transaction={transaction}
                  handleEdit={handleEditTransaction}
                  handleDelete={handleDeleteTransaction}
                />
              ))}
            </List>
          )}
        </>
      )}
    </>
  );
};

export default TransactionList;

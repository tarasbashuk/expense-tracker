'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from '@/lib/toast';
import { Transaction } from '@/lib/tags';
import {
  Box,
  List,
  Typography,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import ViewListIcon from '@mui/icons-material/ViewList';
import TableViewIcon from '@mui/icons-material/TableView';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import FilterListIcon from '@mui/icons-material/FilterList';
import { filterTransactions } from '@/lib/filterTransactions';

import TransactionSkeleton, {
  LoadingPlaceholder,
} from './history/TransactionSkeleton';
import { visuallyHidden } from '@mui/utils';
import TransactionRows from './TransactionRows';
import HistoryFiltersSheet from './history/HistoryFiltersSheet';
import DesktopHistoryFilters from './history/DesktopHistoryFilters';
import PeriodBalance from './history/PeriodBalance';
import HistoryHeaderActions from './history/HistoryHeaderActions';
import { historyColors, pageStyles, pageHeaderStyles } from './history/tokens';
import getTransactions from '@/app/actions/getTransactions';
import deleteTransaction from '@/app/actions/deleteTransaction';
import { useTransactions } from '@/context/TranasctionsContext';
import { useSettings } from '@/context/SettingsContexts';
import DatePeriodFilter from './shared/DatePeriodFilter';
import TransactionsDataGrid from './TransactionsDataGrid';
import { TransactionCategory, ViewType } from '@/constants/types';
import getIncomeExpense from '@/app/actions/getIncomeExpense';
import { useIntl } from 'react-intl';
import {
  CURRENCY_SYMBOL_MAP,
  isCreditCardCategory,
} from '@/constants/constants';
import { TransactionType } from '@prisma/client';
import {
  Button,
  IconButton,
  InputAdornment,
  TextField,
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

const getDefaultPeriod = () => {
  const anchorDate = dateKeyFromLocalDate(new Date());
  const range = getPeriodRange('month', anchorDate, {
    start: anchorDate,
    end: anchorDate,
  });

  return { anchorDate, range, customRange: { ...range, end: anchorDate } };
};

const TransactionList = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const {
    transactions,
    setTransactions,
    setTransactionId,
    setTransactionDraft,
    setIsCopyTransactionFlow,
    setIsTransactionModalOpen,
    transactionsRefreshKey,
    requestTransactionsRefresh,
  } = useTransactions();

  const [error, setError] = useState<{ key: string; message: string } | null>(
    null,
  );
  const [loadedKey, setLoadedKey] = useState('');
  const [retry, setRetry] = useState(0);
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
  const [anchorDate, setAnchorDate] = useState(
    () => getDefaultPeriod().anchorDate,
  );
  const [customRange, setCustomRange] = useState<DateRangeValue>(
    () => getDefaultPeriod().customRange,
  );
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [viewType, setViewType] = useState(ViewType.List);
  const [isLoading, setIsloading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<
    TransactionCategory | 'all'
  >('all');
  const [selectedTransactionType, setSelectedTransactionType] = useState<
    TransactionType | 'all'
  >('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput), 300);

    return () => window.clearTimeout(timer);
  }, [searchInput]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [recurringOnly, setRecurringOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => {
    if (!isMobile) setFiltersOpen(false);
  }, [isMobile]);

  const visibleTransactions = useMemo(
    () =>
      filterTransactions(
        transactions,
        search,
        selectedCategory,
        selectedTransactionType,
        recurringOnly,
        tagIds,
      ),
    [
      transactions,
      search,
      selectedCategory,
      selectedTransactionType,
      recurringOnly,
      tagIds,
    ],
  );
  const filteredSum = visibleTransactions.reduce(
    (sum, transaction) =>
      sum +
      (transaction.type === TransactionType.Income ? 1 : -1) *
        transaction.amountDefaultCurrency,
    0,
  );

  const { formatMessage } = useIntl();
  const { settings } = useSettings();
  const selectedRange = useMemo(
    () => getPeriodRange(periodMode, anchorDate, customRange),
    [anchorDate, customRange, periodMode],
  );

  const queryKey = `${selectedRange.start}/${selectedRange.end}`;
  const hasCurrentData = loadedKey === queryKey;
  const currentError = error?.key === queryKey ? error.message : '';
  const pending = isLoading || (!hasCurrentData && !currentError);
  const showSkeleton = !hasCurrentData && !currentError;

  const defaultPeriod = getDefaultPeriod();
  const isPeriodFiltered =
    periodMode !== 'month' ||
    selectedRange.start !== defaultPeriod.range.start ||
    selectedRange.end !== defaultPeriod.range.end;
  const activeFilterCount =
    Number(isPeriodFiltered) +
    Number(selectedCategory !== 'all') +
    Number(selectedTransactionType !== 'all') +
    Number(Boolean(search.trim())) +
    Number(recurringOnly) +
    Number(tagIds.length > 0);
  const hasFilters = activeFilterCount > 0;

  const resetFilters = () => {
    setSearchInput('');
    setSearch('');
    setTagIds([]);
    setRecurringOnly(false);
    setSelectedCategory('all');
    setSelectedTransactionType('all');
  };

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

  const creditCardTrackingEnabled =
    settings?.creditCardTrackingEnabled ?? false;

  useEffect(() => {
    if (!creditCardTrackingEnabled && isCreditCardCategory(selectedCategory)) {
      setSelectedCategory('all');
    }
  }, [creditCardTrackingEnabled, selectedCategory]);

  const handleEditTransaction = useCallback(
    (transactionId: string) => {
      setTransactionId(transactionId);
      setTransactionDraft(null);
      setIsCopyTransactionFlow(false);
      setIsTransactionModalOpen(true);
    },
    [
      setTransactionId,
      setTransactionDraft,
      setIsCopyTransactionFlow,
      setIsTransactionModalOpen,
    ],
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

        return;
      }

      toast.success(message);
      requestTransactionsRefresh();
      setTransactions((prevTrans: Transaction[]) => {
        const updatedTransactions = prevTrans.filter(
          (trans) => trans.id !== transactionId,
        );

        return updatedTransactions;
      });
    },
    [setTransactions, formatMessage, requestTransactionsRefresh],
  );

  const handleTypeChange = useCallback(
    (_event: React.MouseEvent<HTMLElement>, newType: ViewType) => {
      // If a user click on already selected type button, the newType cames as null
      if (!newType) return;

      setViewType(newType);
    },
    [],
  );

  useEffect(() => {
    let isCurrentRequest = true;

    const fetchTrans = async () => {
      try {
        const [transactionsResponse, incomeExpenseResponse] = await Promise.all(
          [
            getTransactions(selectedRange.start, selectedRange.end, true),
            getIncomeExpense(selectedRange.start, selectedRange.end),
          ],
        );

        if (!isCurrentRequest) return;

        if (transactionsResponse.error || incomeExpenseResponse.error) {
          throw new Error('history.loadError');
        }

        setTransactions(transactionsResponse.transactions || []);
        setIncome(incomeExpenseResponse.income ?? 0);
        setExpense(incomeExpenseResponse.expense ?? 0);
        setLoadedKey(queryKey);
      } catch {
        if (isCurrentRequest) {
          setError({ key: queryKey, message: 'history.loadError' });
        }
      } finally {
        if (isCurrentRequest) setIsloading(false);
      }
    };

    setError(null);
    setIsloading(true);
    void fetchTrans();

    return () => {
      isCurrentRequest = false;
    };
  }, [
    selectedRange.end,
    selectedRange.start,
    setTransactions,
    transactionsRefreshKey,
    queryKey,
    retry,
  ]);

  return (
    <Box
      sx={{
        ...pageStyles,
        maxWidth: { xs: pageStyles.maxWidth, sm: '1034px' },
      }}
    >
      <Box sx={pageHeaderStyles}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 600,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: { xs: 24, sm: 34 },
          }}
        >
          {formatMessage({
            id: 'transactions.title',
            defaultMessage: 'History',
          })}
        </Typography>
        <HistoryHeaderActions />
      </Box>
      <Stack direction="column" spacing={2} sx={{ width: '100%', minWidth: 0 }}>
        <Box
          sx={
            isMobile
              ? { display: 'flex', flexDirection: 'column', gap: 2 }
              : {
                  display: 'grid',
                  gridTemplateColumns: 'minmax(300px, 40%) minmax(0, 1fr)',
                  gap: 2,
                  alignItems: 'center',
                  minWidth: 0,
                }
          }
        >
          <DatePeriodFilter
            toolbarGrid={!isMobile}
            compact
            horizontal
            mode={periodMode}
            range={selectedRange}
            onModeChange={handlePeriodModeChange}
            onPrevious={() => shiftSelectedPeriod(-1)}
            onNext={() => shiftSelectedPeriod(1)}
            onCustomRangeChange={setCustomRange}
          />

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 2,
              alignItems: 'center',
              flexWrap: isMobile ? 'wrap' : 'nowrap',
              minWidth: 0,
              ...(!isMobile && { gridColumn: 2, gridRow: 2 }),
            }}
          >
            {!isMobile && (
              <TextField
                placeholder={formatMessage({ id: 'history.search' })}
                inputProps={{
                  'aria-label': formatMessage({ id: 'history.search' }),
                }}
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                size="small"
                sx={{
                  flex: '1 1 0',
                  minWidth: 0,
                  bgcolor: 'background.paper',
                  borderRadius: '16px',
                  '& .MuiInputBase-root': { height: 44 },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: searchInput ? (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={formatMessage({
                          id: 'history.clearSearch',
                        })}
                        onClick={() => {
                          setSearchInput('');
                          setSearch('');
                        }}
                      >
                        <CloseIcon />
                      </IconButton>
                    </InputAdornment>
                  ) : undefined,
                }}
              />
            )}
            {isMobile && (
              <Button
                variant="outlined"
                startIcon={<FilterListIcon />}
                onClick={() => setFiltersOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={filtersOpen}
              >
                {formatMessage(
                  { id: 'history.filters' },
                  { count: activeFilterCount },
                )}
              </Button>
            )}
            <ToggleButtonGroup
              exclusive
              size="small"
              color="primary"
              sx={
                !isMobile
                  ? {
                      flexShrink: 0,
                      height: 44,
                      width: 88,
                      '& > button': { width: 44 },
                    }
                  : undefined
              }
              value={viewType}
              onChange={handleTypeChange}
            >
              <ToggleButton
                value={ViewType.List}
                aria-label={formatMessage({ id: 'history.listView' })}
              >
                <ViewListIcon />
              </ToggleButton>
              <ToggleButton
                value={ViewType.Grid}
                aria-label={formatMessage({ id: 'history.tableView' })}
              >
                <TableViewIcon />
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
          {!isMobile && (
            <DesktopHistoryFilters
              toolbarGrid
              value={{
                type: selectedTransactionType,
                category: selectedCategory,
                tagIds,
                recurringOnly,
                search,
              }}
              creditCardTrackingEnabled={creditCardTrackingEnabled}
              onChange={(filters) => {
                setSelectedTransactionType(filters.type);
                setSelectedCategory(filters.category);
                setTagIds(filters.tagIds || []);
                setRecurringOnly(filters.recurringOnly);
              }}
            />
          )}
        </Box>
        {!isMobile &&
          (searchInput.trim() ||
            selectedCategory !== 'all' ||
            selectedTransactionType !== 'all' ||
            recurringOnly ||
            tagIds.length > 0) && (
            <Button onClick={resetFilters} sx={{ alignSelf: 'flex-start' }}>
              {formatMessage({ id: 'history.resetFilters' })}
            </Button>
          )}
        <PeriodBalance
          income={hasCurrentData ? income : null}
          expense={hasCurrentData ? expense : null}
          loading={showSkeleton}
        />
        {filtersOpen && isMobile && (
          <HistoryFiltersSheet
            desktop={!isMobile}
            value={{
              type: selectedTransactionType,
              category: selectedCategory,
              recurringOnly,
              tagIds,
              search,
            }}
            creditCardTrackingEnabled={creditCardTrackingEnabled}
            onClose={() => setFiltersOpen(false)}
            onApply={(filters) => {
              setSelectedTransactionType(filters.type);
              setSelectedCategory(filters.category);
              setRecurringOnly(filters.recurringOnly);
              setTagIds(filters.tagIds || []);

              if (isMobile) {
                setSearchInput(filters.search);
                setSearch(filters.search);
              }

              setFiltersOpen(false);
            }}
          />
        )}
        {hasFilters && (
          <Box
            sx={{
              mt: 1,
              p: 0,
              display: 'flex',
              alignItems: 'baseline',
              gap: 1,
              flexWrap: 'wrap',
              bgcolor: 'transparent',
              borderRadius: 1,
              border: 0,
              borderColor: 'divider',
            }}
          >
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {formatMessage({
                id: isMobile
                  ? 'history.filteredCompact'
                  : 'history.filteredSum',
                defaultMessage: 'Net total for matching transactions:',
              })}
            </Typography>
            {showSkeleton ? (
              <LoadingPlaceholder width={130} height={20} />
            ) : !hasCurrentData ? (
              <Typography>—</Typography>
            ) : (
              <Typography
                variant="body1"
                color={
                  filteredSum >= 0
                    ? historyColors.income
                    : historyColors.negativeBalance
                }
                sx={{ fontWeight: 'bold' }}
              >
                {filteredSum >= 0 ? '+' : ''}
                {filteredSum.toFixed(2)}{' '}
                {CURRENCY_SYMBOL_MAP[settings.defaultCurrency]}
              </Typography>
            )}
          </Box>
        )}
      </Stack>

      <Box role="status" sx={visuallyHidden}>
        {pending
          ? formatMessage({
              id: hasCurrentData ? 'history.refreshing' : 'history.loading',
            })
          : ''}
      </Box>
      <Box
        aria-busy={pending}
        aria-label={formatMessage({ id: 'transactions.title' })}
      >
        {currentError && (
          <Alert
            severity="error"
            sx={{ my: 2 }}
            action={
              <Button
                color="inherit"
                onClick={() => setRetry((value) => value + 1)}
              >
                {formatMessage({ id: 'history.retry' })}
              </Button>
            }
          >
            {formatMessage({
              id: hasCurrentData ? 'history.refreshError' : 'history.loadError',
            })}
          </Alert>
        )}

        {showSkeleton && <TransactionSkeleton />}

        {hasCurrentData && !visibleTransactions.length && (
          <Typography variant="h5" component="p" gutterBottom mt={4}>
            {formatMessage({
              id: hasFilters ? 'history.noMatches' : 'transactions.noRecords',
              defaultMessage: hasFilters
                ? 'No matching transactions in this period'
                : 'No records for selected period',
            })}
          </Typography>
        )}

        {hasCurrentData && !!visibleTransactions.length && (
          <>
            {viewType === ViewType.Grid ? (
              <TransactionsDataGrid
                rows={visibleTransactions}
                isLoading={false}
                handleEdit={handleEditTransaction}
                handleCopy={handleCopyTransaction}
                handleDelete={handleDeleteTransaction}
              />
            ) : (
              <List>
                <TransactionRows
                  stickyDates
                  transactions={visibleTransactions}
                  handleEdit={handleEditTransaction}
                  handleCopy={handleCopyTransaction}
                  handleDelete={handleDeleteTransaction}
                />
              </List>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default TransactionList;

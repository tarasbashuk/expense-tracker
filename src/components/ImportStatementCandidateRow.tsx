'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import { DatePicker } from '@mui/x-date-pickers';
import { Currency, TransactionType } from '@prisma/client';
import { format, parseISO } from 'date-fns';
import { useIntl } from 'react-intl';

import type { ScreenshotImportCandidate } from '@/app/actions/analyzeStatementScreenshots';
import {
  CURRENCY_SYMBOL_MAP,
  DATE_FORMATS,
  EXPENSE_CATEGORIES_LIST,
  INCOME_CATEGORIES_LIST,
} from '@/constants/constants';
import { TransactionCategory } from '@/constants/types';
import { useSettings } from '@/context/SettingsContexts';
import { useCategoryI18n } from '@/lib/useCategoryI18n';

export type ImportRow = Omit<ScreenshotImportCandidate, 'status'> & {
  id: string;
  status: ScreenshotImportCandidate['status'] | 'saved';
  isCreditTransaction: boolean;
};

type ImportStatementCandidateRowProps = {
  row: ImportRow;
  isSaving: boolean;
  onTextChange: (_text: string) => void;
  onDateChange: (_date: string) => void;
  onCurrencyChange: (_currency: Currency) => void;
  onCategoryChange: (_category: string) => void;
  onIsCreditTransactionChange: (_isCreditTransaction: boolean) => void;
  onAmountDefaultCurrencyChange: (_amount: number | null) => void;
  onSave: () => void;
};

const statusColorMap = {
  new: 'success',
  alreadyExists: 'default',
  possibleDuplicate: 'warning',
  needsReview: 'info',
  ignored: 'default',
  saved: 'success',
} as const;

const getCategoryOptions = (type: TransactionType | null) => {
  if (type === TransactionType.Income) return INCOME_CATEGORIES_LIST;
  if (type === TransactionType.Expense) return EXPENSE_CATEGORIES_LIST;

  return [...EXPENSE_CATEGORIES_LIST, ...INCOME_CATEGORIES_LIST];
};

export default function ImportStatementCandidateRow({
  row,
  isSaving,
  onTextChange,
  onDateChange,
  onCurrencyChange,
  onCategoryChange,
  onIsCreditTransactionChange,
  onAmountDefaultCurrencyChange,
  onSave,
}: ImportStatementCandidateRowProps) {
  const { formatMessage } = useIntl();
  const [isConfirmingDuplicateSave, setIsConfirmingDuplicateSave] =
    useState(false);
  const { getLabel } = useCategoryI18n();
  const {
    settings: { defaultCurrency },
  } = useSettings();
  const categoryOptions = getCategoryOptions(row.type);
  const isBaseAmountShown = Boolean(
    row.currency && row.currency !== defaultCurrency,
  );
  const statusLabel = formatMessage({
    id: `importStatement.status.${row.status}`,
    defaultMessage: row.status,
  });
  const typeLabel = row.type
    ? formatMessage({
        id: `transactionType.${row.type.toLowerCase()}`,
        defaultMessage: row.type,
      })
    : '';
  const saveButtonLabel =
    row.status === 'saved'
      ? formatMessage({
          id: 'importStatement.savedStatus',
          defaultMessage: 'Saved',
        })
      : isConfirmingDuplicateSave
        ? formatMessage({
            id: 'common.save',
            defaultMessage: 'Save',
          })
        : row.status === 'possibleDuplicate'
          ? formatMessage({
              id: 'importStatement.saveDuplicateAnyway',
              defaultMessage: 'Save anyway',
            })
          : formatMessage({
              id: 'common.save',
              defaultMessage: 'Save',
            });

  useEffect(() => {
    setIsConfirmingDuplicateSave(false);
  }, [row.text, row.amount, row.currency, row.category, row.date]);

  const handleSaveClick = () => {
    if (row.status === 'possibleDuplicate' && !isConfirmingDuplicateSave) {
      setIsConfirmingDuplicateSave(true);

      return;
    }

    onSave();
  };

  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        p: 1.5,
      }}
    >
      <Stack spacing={1.25}>
        <Stack
          direction="row"
          spacing={1}
          rowGap={1}
          alignItems="center"
          flexWrap="wrap"
          sx={{ mb: 0.5 }}
        >
          <Chip
            size="small"
            label={statusLabel}
            color={statusColorMap[row.status]}
            sx={{
              flexBasis: { xs: '100%', sm: 'auto' },
              justifyContent: { xs: 'center', sm: 'flex-start' },
              width: { xs: '100%', sm: 'auto' },
            }}
          />
          <Chip
            size="small"
            variant="outlined"
            label={`${Math.round(row.confidence * 100)}%`}
          />
          {row.type && (
            <Chip size="small" variant="outlined" label={typeLabel} />
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Button
            size="small"
            variant="contained"
            disabled={
              row.status === 'ignored' ||
              row.status === 'saved' ||
              row.status === 'alreadyExists' ||
              !row.date ||
              isSaving
            }
            onClick={handleSaveClick}
          >
            {saveButtonLabel}
          </Button>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            size="small"
            label={formatMessage({
              id: 'grid.description',
              defaultMessage: 'Description',
            })}
            value={row.text}
            onChange={(event) => onTextChange(event.target.value)}
          />
          <DatePicker
            label={formatMessage({
              id: 'grid.date',
              defaultMessage: 'Date',
            })}
            value={row.date ? parseISO(row.date) : null}
            onChange={(date) =>
              onDateChange(
                date ? format(date, DATE_FORMATS.YYYY_MM_DD) : '',
              )
            }
            format={DATE_FORMATS.YYYY_MM_DD}
            slotProps={{
              textField: {
                size: 'small',
                sx: { minWidth: { sm: 140 } },
              },
            }}
          />
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            size="small"
            label={formatMessage({
              id: 'grid.amount',
              defaultMessage: 'Amount',
            })}
            value={row.amount == null ? '-' : row.amount.toFixed(2)}
            InputProps={{ readOnly: true }}
            sx={{ minWidth: { sm: 140 } }}
          />
          <FormControl size="small" sx={{ minWidth: { sm: 120 } }}>
            <InputLabel>
              {formatMessage({
                id: 'settings.defaultCurrency',
                defaultMessage: 'Currency',
              })}
            </InputLabel>
            <Select
              label={formatMessage({
                id: 'settings.defaultCurrency',
                defaultMessage: 'Currency',
              })}
              value={row.currency || ''}
              onChange={(event) => onCurrencyChange(event.target.value as Currency)}
            >
              {Object.values(Currency).map((currency) => (
                <MenuItem key={currency} value={currency}>
                  {currency}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {isBaseAmountShown && (
            <TextField
              size="small"
              type="number"
              label={formatMessage(
                {
                  id: 'grid.amountDefaultCurrency',
                  defaultMessage: 'Amount, {currency}',
                },
                { currency: CURRENCY_SYMBOL_MAP[defaultCurrency] },
              )}
              value={row.amountDefaultCurrency ?? ''}
              onChange={(event) =>
                onAmountDefaultCurrencyChange(
                  event.target.value === '' ? null : Number(event.target.value),
                )
              }
              sx={{ minWidth: { sm: 180 } }}
            />
          )}
          <FormControl fullWidth size="small">
            <InputLabel>
              {formatMessage({
                id: 'grid.category',
                defaultMessage: 'Category',
              })}
            </InputLabel>
            <Select
              label={formatMessage({
                id: 'grid.category',
                defaultMessage: 'Category',
              })}
              value={row.category}
              onChange={(event) => onCategoryChange(event.target.value)}
            >
              {categoryOptions.map(({ value }, index) => (
                <MenuItem key={`${value}-${index}`} value={value}>
                  {getLabel(value as TransactionCategory)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {(row.rawDescription || row.matchReason) && (
          <Typography variant="body2" color="text.secondary">
            {row.matchReason || row.rawDescription}
          </Typography>
        )}

        {row.type === TransactionType.Expense && (
          <FormControlLabel
            control={
              <Checkbox
                checked={row.isCreditTransaction}
                disabled={
                  row.status === 'ignored' ||
                  row.status === 'saved' ||
                  row.status === 'alreadyExists'
                }
                onChange={(event) =>
                  onIsCreditTransactionChange(event.target.checked)
                }
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CreditCardIcon
                  sx={{ fontSize: '1.2rem', color: 'primary.main' }}
                />
                {formatMessage({
                  id: 'addTransaction.paidByCC',
                  defaultMessage: 'Paid by credit card',
                })}
              </Box>
            }
          />
        )}

        {row.warnings.map((warning, index) => (
          <Alert key={`${index}-${warning}`} severity="warning">
            {warning}
          </Alert>
        ))}
      </Stack>
    </Box>
  );
}

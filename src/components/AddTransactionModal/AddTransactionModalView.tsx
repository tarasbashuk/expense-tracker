'use client';
import ResponsiveDialog, { FormTitle } from '../shared/ResponsiveDialog';
import TagsAndRecurrence from './TagsAndRecurrence';
import TagPicker from '../tags/TagPicker';
import {
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  OutlinedInput,
  InputAdornment,
  TextField,
  DialogContent,
  Divider,
  DialogActions,
  Box,
  Grid,
  SelectChangeEvent,
  FormControlLabel,
  Checkbox,
  Switch,
} from '@mui/material';
import CreditCardIcon from '@mui/icons-material/CreditCard';

import {
  CURRENCY_SYMBOL_MAP,
  DATE_FORMATS,
  EXPENSE_CATEGORIES_LIST,
  getExpenseCategoriesList,
  getIncomeCategoriesList,
  INCOME_CATEGORIES_LIST,
} from '@/constants/constants';
import { Currency, TransactionType } from '@prisma/client';
import { TransactionCategory } from '@/constants/types';
import { getIconByName } from '@/lib/getCategoryIcon';
import { DatePicker } from '@mui/x-date-pickers';
import CurrencySelect from '../CurrencySelect';
import TransactionTypeButtonGroup from '../shared/TransactionTypeButtonGroup';
import { FormattedMessage, useIntl } from 'react-intl';
import { useCategoryI18n } from '@/lib/useCategoryI18n';

interface Props {
  tagIds?: string[];
  onTagsChange?: (_ids: string[]) => void;
  date: Date;
  text?: string;
  amount?: number;
  category: string;
  currency: Currency;
  isEditMode: boolean;
  isCopyMode?: boolean;
  isSubmitDisabled: boolean;
  isBaseAmountShown: boolean;
  isCreditTransaction: boolean;
  creditCardTrackingEnabled: boolean;
  isRecurring?: boolean;
  recurringEndDate?: Date;
  amountDefaultCurrency?: number;
  transactionType: TransactionType;
  handleClose: () => void;
  onSubmit: () => void;
  /* eslint-disable no-unused-vars*/
  handleTypeChange: (newType: TransactionType) => void;
  handleDateChange: (date: Date | null) => void;
  handleAmountChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleCurrencyChange: (event: SelectChangeEvent) => void;
  handleTextChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleCategoryChange: (event: SelectChangeEvent) => void;
  handleIsCreditChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleIsRecurringChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleRecurringEndDateChange: (date: Date | null) => void;
  handleAmountDefaultCurrencyChange: (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  /* eslint-enable */
}

const AddTransactionModalView: React.FC<Props> = ({
  tagIds = [],
  onTagsChange,
  date,
  text,
  amount,
  category,
  currency,
  isEditMode,
  isCopyMode = false,
  transactionType,
  isSubmitDisabled,
  isBaseAmountShown,
  isCreditTransaction,
  creditCardTrackingEnabled,
  isRecurring,
  recurringEndDate,
  amountDefaultCurrency,
  onSubmit,
  handleClose,
  handleTypeChange,
  handleDateChange,
  handleAmountChange,
  handleCurrencyChange,
  handleTextChange,
  handleCategoryChange,
  handleIsCreditChange,
  handleIsRecurringChange,
  handleRecurringEndDateChange,
  handleAmountDefaultCurrencyChange,
}) => {
  const activeCategories =
    transactionType === TransactionType.Income
      ? getIncomeCategoriesList(creditCardTrackingEnabled)
      : getExpenseCategoriesList(creditCardTrackingEnabled);
  const allCategories =
    transactionType === TransactionType.Income
      ? INCOME_CATEGORIES_LIST
      : EXPENSE_CATEGORIES_LIST;
  const selectedLegacyCategory = allCategories.find(
    ({ value }) => value === category,
  );
  const categories =
    selectedLegacyCategory &&
    !activeCategories.some(({ value }) => value === category)
      ? [...activeCategories, selectedLegacyCategory]
      : activeCategories;

  const { formatMessage } = useIntl();
  const { getLabel } = useCategoryI18n();

  return (
    <ResponsiveDialog
      mobileFullHeight
      open
      maxWidth="sm"
      onClose={(_, reason) => {
        if (reason !== 'backdropClick' && !isSubmitDisabled) handleClose();
      }}
    >
      <FormTitle onClose={handleClose} disabled={isSubmitDisabled}>
        {formatMessage({
          id: isCopyMode
            ? 'home.repeatTransaction'
            : isEditMode
              ? 'addTransaction.editTitle'
              : 'addTransaction.title',
        })}
      </FormTitle>
      <DialogContent>
        <form
          id="transaction-form"
          onSubmit={(event) => {
            event.preventDefault();

            if (!isSubmitDisabled) onSubmit();
          }}
        >
          <Grid container spacing={2} justifyContent="space-between">
            <Grid item xs={12} sm={8}>
              <TransactionTypeButtonGroup
                transactionType={transactionType}
                setTranasctionType={handleTypeChange}
                buttonsSx={{
                  paddingTop: '13.875px',
                  paddingBottom: '13.875px',
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <DatePicker
                label={formatMessage({
                  id: 'addTransaction.date',
                  defaultMessage: 'Date',
                })}
                name="date"
                value={date}
                onChange={handleDateChange}
                format={DATE_FORMATS.YYYY_MM_DD}
                slotProps={{
                  textField: {
                    fullWidth: true,
                  },
                }}
              />
            </Grid>

            <Grid item xs={8}>
              <FormControl required fullWidth variant="outlined">
                <InputLabel htmlFor="amount">
                  <FormattedMessage
                    id="addTransaction.amount"
                    defaultMessage="Amount"
                  />
                </InputLabel>
                <OutlinedInput
                  label={formatMessage({ id: 'addTransaction.amount' })}
                  id="amount"
                  name="amount"
                  type="number"
                  inputProps={{ min: 0, step: '0.01' }}
                  value={amount ?? ''}
                  onChange={handleAmountChange}
                  startAdornment={
                    <InputAdornment position="start">
                      {CURRENCY_SYMBOL_MAP[currency]}
                    </InputAdornment>
                  }
                />
              </FormControl>
            </Grid>

            <Grid item xs={4}>
              <CurrencySelect
                value={currency}
                onChange={handleCurrencyChange}
              />
            </Grid>

            {isBaseAmountShown && (
              <>
                <Grid item xs={8}>
                  <FormControl required fullWidth variant="outlined">
                    <InputLabel htmlFor="amountDefaultCurrency">
                      <FormattedMessage
                        id="addTransaction.amountBase"
                        defaultMessage="Amount in base currency"
                      />
                    </InputLabel>
                    <OutlinedInput
                      id="amountDefaultCurrency"
                      label={formatMessage({ id: 'addTransaction.amountBase' })}
                      name="amountDefaultCurrency"
                      type="number"
                      inputProps={{ min: 0, step: '0.01' }}
                      value={amountDefaultCurrency ?? ''}
                      onChange={handleAmountDefaultCurrencyChange}
                      startAdornment={
                        <InputAdornment position="start">
                          {CURRENCY_SYMBOL_MAP.EUR}
                        </InputAdornment>
                      }
                    />
                  </FormControl>
                </Grid>

                <Grid item xs={4}>
                  <FormControl variant="outlined" fullWidth>
                    <InputLabel>
                      <FormattedMessage
                        id="addTransaction.baseCurrency"
                        defaultMessage="Base currency"
                      />
                    </InputLabel>
                    <Select
                      label={formatMessage({
                        id: 'addTransaction.baseCurrency',
                      })}
                      disabled
                      value={CURRENCY_SYMBOL_MAP.EUR}
                    >
                      <MenuItem value={CURRENCY_SYMBOL_MAP.EUR}>
                        {CURRENCY_SYMBOL_MAP.EUR}
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>
                  <FormattedMessage
                    id="addTransaction.category"
                    defaultMessage="Category"
                  />
                </InputLabel>
                <Select
                  label={formatMessage({ id: 'addTransaction.category' })}
                  name="category"
                  value={category as string}
                  onChange={handleCategoryChange}
                >
                  {categories.map(({ value }) => {
                    const IconComponent = getIconByName(
                      value as TransactionCategory,
                    );

                    return (
                      <MenuItem key={value} value={value}>
                        <Stack direction="row" alignItems="center">
                          <IconComponent sx={{ marginRight: '8px' }} />
                          {getLabel(value as TransactionCategory)}
                        </Stack>
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label={formatMessage({
                  id: 'addTransaction.text',
                  defaultMessage: 'Text',
                })}
                name="text"
                type="text"
                variant="outlined"
                value={text ?? ''}
                onChange={handleTextChange}
              />
            </Grid>

            {creditCardTrackingEnabled && (
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isCreditTransaction}
                      onChange={handleIsCreditChange}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CreditCardIcon
                        sx={{ fontSize: '1.2rem', color: 'primary.main' }}
                      />
                      <FormattedMessage
                        id="addTransaction.paidByCC"
                        defaultMessage="Paid by credit card"
                      />
                    </Box>
                  }
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <TagsAndRecurrence
                isEditMode={isEditMode}
                tagCount={tagIds.length}
                recurring={Boolean(isRecurring)}
              >
                <Grid container spacing={2}>
                  {onTagsChange && (
                    <Grid item xs={12}>
                      <TagPicker
                        value={tagIds}
                        onChange={onTagsChange}
                        disabled={isSubmitDisabled}
                      />
                    </Grid>
                  )}

                  <Grid item xs={12}>
                    {onTagsChange && <Divider sx={{ mb: 1 }} />}
                    <FormControlLabel
                      labelPlacement="start"
                      sx={{
                        width: '100%',
                        mx: 0,
                        justifyContent: 'space-between',
                      }}
                      control={
                        <Switch
                          checked={isRecurring || false}
                          onChange={handleIsRecurringChange}
                          inputProps={{ role: 'switch' }}
                        />
                      }
                      label={
                        <FormattedMessage
                          id="addTransaction.recurring"
                          defaultMessage="Recurring (monthly)"
                        />
                      }
                    />
                  </Grid>

                  {isRecurring && (
                    <Grid item xs={12}>
                      <DatePicker
                        label={formatMessage({
                          id: 'addTransaction.endDate',
                          defaultMessage: 'End date',
                        })}
                        name="recurringEndDate"
                        value={recurringEndDate || null}
                        onChange={handleRecurringEndDateChange}
                        format={DATE_FORMATS.YYYY_MM_DD}
                        slotProps={{
                          textField: {
                            helperText: formatMessage({
                              id: 'addTransaction.recurringHint',
                              defaultMessage:
                                'Leave empty if you want the transaction to repeat indefinitely',
                            }),
                          },
                        }}
                      />
                    </Grid>
                  )}
                </Grid>
              </TagsAndRecurrence>
            </Grid>
          </Grid>
        </form>
      </DialogContent>
      <DialogActions>
        <Button
          fullWidth
          type="submit"
          form="transaction-form"
          variant="contained"
          disabled={isSubmitDisabled}
        >
          {formatMessage({
            id: isEditMode ? 'addTransaction.save' : 'addTransaction.add',
          })}
        </Button>
      </DialogActions>
    </ResponsiveDialog>
  );
};

export default AddTransactionModalView;

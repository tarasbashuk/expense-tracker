'use client';
import {
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Input,
  InputAdornment,
  TextField,
  Typography,
  Modal,
  Box,
  Grid,
  IconButton,
  SelectChangeEvent,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RepeatIcon from '@mui/icons-material/Repeat';
import CreditCardIcon from '@mui/icons-material/CreditCard';

import {
  CURRENCY_SYMBOL_MAP,
  DATE_FORMATS,
  EXPENSE_CATEGORIES_LIST,
  INCOME_CATEGORIES_LIST,
} from '@/constants/constants';
import { Currency, TransactionType } from '@prisma/client';
import { TransactionCategory } from '@/constants/types';
import { getIconByName } from '@/lib/getCategoryIcon';
import { DatePicker } from '@mui/x-date-pickers';
import CurrencySelect from '../CurrencySelect';
import TransactionTypeButtonGroup from '../shared/TransactionTypeButtonGroup';
import { FormattedMessage, useIntl } from 'react-intl';

const style = {
  position: 'absolute',
  top: { xs: '7%', sm: '50%' },
  left: '50%',
  transform: { xs: 'translate(-50%, 0%)', sm: 'translate(-50%, -50%)' },
  width: { xs: '90%', sm: 550 },
  bgcolor: 'background.paper',
  border: 'none',
  borderRadius: 4,
  boxShadow: 24,
  p: { xs: '18px', sm: 4 },
};

interface Props {
  date: Date;
  text?: string;
  amount?: number;
  category: string;
  currency: Currency;
  isEditMode: boolean;
  isSubmitDisabled: boolean;
  isBaseAmountShown: boolean;
  isCreditTransaction: boolean;
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
  date,
  text,
  amount,
  category,
  currency,
  isEditMode,
  transactionType,
  isSubmitDisabled,
  isBaseAmountShown,
  isCreditTransaction,
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
  const categories =
    transactionType === TransactionType.Income
      ? INCOME_CATEGORIES_LIST
      : EXPENSE_CATEGORIES_LIST;

  const { formatMessage } = useIntl();

  return (
    <Modal
      open
      onClose={handleClose}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Box sx={style}>
        <Stack direction="row" alignItems="center" spacing={2} marginBottom={3}>
          <Typography variant="h4" component="h3" flexGrow={1}>
            {isEditMode ? (
              <FormattedMessage
                id="addTransaction.editTitle"
                defaultMessage="Edit transaction"
              />
            ) : (
              <FormattedMessage
                id="addTransaction.title"
                defaultMessage="Add transaction"
              />
            )}
          </Typography>
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{ position: 'absolute', top: 8, right: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </Stack>
        <form>
          <Grid container spacing={2} justifyContent="space-between">
            <Grid item xs={4} sm={8}>
              <TransactionTypeButtonGroup
                transactionType={transactionType}
                setTranasctionType={handleTypeChange}
                buttonsSx={{
                  paddingTop: '13.875px',
                  paddingBottom: '13.875px',
                }}
              />
            </Grid>
            <Grid item xs={5} sm={4}>
              <DatePicker
                label={formatMessage({
                  id: 'addTransaction.date',
                  defaultMessage: 'Date',
                })}
                name="date"
                value={date}
                onChange={handleDateChange}
                format={DATE_FORMATS.YYYY_MM_DD}
              />
            </Grid>

            <Grid item xs={8}>
              <FormControl required fullWidth variant="standard">
                <InputLabel htmlFor="amount">
                  <FormattedMessage
                    id="addTransaction.amount"
                    defaultMessage="Amount"
                  />
                </InputLabel>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  inputProps={{ min: 0, step: '0.01' }}
                  value={amount}
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
                  <FormControl required fullWidth variant="standard">
                    <InputLabel htmlFor="amountDefaultCurrency">
                      <FormattedMessage
                        id="addTransaction.amountBase"
                        defaultMessage="Amount in base currency"
                      />
                    </InputLabel>
                    <Input
                      name="amountDefaultCurrency"
                      type="number"
                      inputProps={{ min: 0, step: '0.01' }}
                      value={amountDefaultCurrency}
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
                  <FormControl variant="standard" fullWidth>
                    <InputLabel>
                      <FormattedMessage
                        id="addTransaction.baseCurrency"
                        defaultMessage="Base currency"
                      />
                    </InputLabel>
                    <Select disabled value={CURRENCY_SYMBOL_MAP.EUR}>
                      <MenuItem value={CURRENCY_SYMBOL_MAP.EUR}>
                        {CURRENCY_SYMBOL_MAP.EUR}
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <FormControl fullWidth variant="standard">
                <InputLabel>
                  <FormattedMessage
                    id="addTransaction.category"
                    defaultMessage="Category"
                  />
                </InputLabel>
                <Select
                  name="category"
                  value={category as string}
                  onChange={handleCategoryChange}
                >
                  {categories.map(({ value, label }) => {
                    const IconComponent = getIconByName(
                      value as TransactionCategory,
                    );

                    return (
                      <MenuItem key={value} value={value}>
                        <Stack direction="row" alignItems="center">
                          <IconComponent sx={{ marginRight: '8px' }} />
                          {label}
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
                variant="standard"
                value={text}
                onChange={handleTextChange}
              />
            </Grid>

            {/* TODO: add tooltip with explanation */}
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
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isRecurring || false}
                    onChange={handleIsRecurringChange}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <RepeatIcon
                      sx={{ fontSize: '1.2rem', color: 'success.main' }}
                    />
                    <FormattedMessage
                      id="addTransaction.recurring"
                      defaultMessage="Recurring (monthly)"
                    />
                  </Box>
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

            <Grid item xs={12} sm={5} marginTop={2} sx={{ marginLeft: 'auto' }}>
              <Button
                fullWidth
                type="submit"
                variant="contained"
                onClick={onSubmit}
                disabled={isSubmitDisabled}
              >
                {isEditMode ? (
                  <FormattedMessage
                    id="addTransaction.save"
                    defaultMessage="Save"
                  />
                ) : (
                  <FormattedMessage
                    id="addTransaction.add"
                    defaultMessage="Add transaction"
                  />
                )}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Box>
    </Modal>
  );
};

export default AddTransactionModalView;

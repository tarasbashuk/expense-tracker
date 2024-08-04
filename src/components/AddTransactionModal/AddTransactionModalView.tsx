'use client';
import {
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  Input,
  InputAdornment,
  TextField,
  Typography,
  Modal,
  Box,
  Grid,
  IconButton,
  SelectChangeEvent,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

import {
  CURRENCY_SYMBOL_MAP,
  DATE_FORMATS,
  EXPENSE_CATEGORIES_LIST,
  INCOME_CATEGORIES_LIST,
} from '@/constants/constants';
import { Currency, TransactionType } from '@prisma/client';
import { TranactionCategory } from '@/constants/types';
import { getIconByName } from '@/lib/getCategoryIcon';
import { DatePicker } from '@mui/x-date-pickers';

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
  isBaseAmmountShown: boolean;
  amountDefaultCurrency?: number;
  transactionType: TransactionType;
  handleClose: () => void;
  onSubmit: () => void;
  handleTypeChange: (
    event: React.MouseEvent<HTMLElement>,
    newType: TransactionType,
  ) => void;
  handleDateChange: (date: Date | null) => void;
  handleAmountChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleCurrencyChange: (event: SelectChangeEvent) => void;
  handleTextChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleCategoryChange: (event: SelectChangeEvent) => void;
  handleAmountDefaultCurrencyChange: (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => void;
}

const AddTransactionModalView: React.FC<Props> = ({
  date,
  text,
  amount,
  category,
  currency,
  isEditMode,
  transactionType,
  isBaseAmmountShown,
  amountDefaultCurrency,
  onSubmit,
  handleClose,
  handleTypeChange,
  handleDateChange,
  handleAmountChange,
  handleCurrencyChange,
  handleTextChange,
  handleCategoryChange,
  handleAmountDefaultCurrencyChange,
}) => {
  const categories =
    transactionType === TransactionType.Income
      ? INCOME_CATEGORIES_LIST
      : EXPENSE_CATEGORIES_LIST;

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
            {isEditMode ? 'Edit transaction' : 'Add transaction'}
          </Typography>
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{ position: 'absolute', top: 8, right: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </Stack>
        <form action={onSubmit}>
          <Grid container spacing={2} justifyContent="space-between">
            <Grid item xs={4} sm={8}>
              <ToggleButtonGroup
                exclusive
                fullWidth
                size="large"
                color="primary"
                value={transactionType}
                onChange={handleTypeChange}
              >
                <ToggleButton
                  sx={{ paddingTop: '13.875px', paddingBottom: '13.875px' }}
                  value={TransactionType.Expense}
                >
                  Expense
                </ToggleButton>
                <ToggleButton
                  sx={{ paddingTop: '13.875px', paddingBottom: '13.875px' }}
                  value={TransactionType.Income}
                >
                  Income
                </ToggleButton>
              </ToggleButtonGroup>
            </Grid>
            <Grid item xs={5} sm={4}>
              <DatePicker
                label="Date"
                name="date"
                value={date}
                onChange={handleDateChange}
                format={DATE_FORMATS.YYYY_MM_DD}
              />
            </Grid>

            <Grid item xs={8}>
              <FormControl required fullWidth variant="standard">
                <InputLabel htmlFor="amount">Amount</InputLabel>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  inputProps={{
                    min: 0,
                    step: '0.01',
                  }}
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
              <FormControl variant="standard" fullWidth>
                <InputLabel>Currency</InputLabel>
                <Select
                  name="currency"
                  value={currency as string}
                  onChange={handleCurrencyChange}
                >
                  {Object.values(Currency).map((value) => {
                    return (
                      <MenuItem key={value} value={value}>
                        {value}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Grid>

            {isBaseAmmountShown && (
              <>
                <Grid item xs={8}>
                  <FormControl required fullWidth variant="standard">
                    <InputLabel htmlFor="amount">
                      Amount in base currency
                    </InputLabel>
                    <Input
                      name="amountDefaultCurrency"
                      type="number"
                      inputProps={{
                        min: 0,
                        step: '0.01',
                      }}
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
                    <InputLabel>Base currency</InputLabel>
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
                <InputLabel>Category</InputLabel>
                <Select
                  name="category"
                  value={category as string}
                  onChange={handleCategoryChange}
                >
                  {categories.map(({ value, label }) => {
                    const IconComponent = getIconByName(
                      value as TranactionCategory,
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
                label="Text"
                name="text"
                type="text"
                variant="standard"
                value={text}
                onChange={handleTextChange}
              />
            </Grid>

            <Grid item xs={12} sm={5} marginTop={2} sx={{ marginLeft: 'auto' }}>
              <Button fullWidth variant="contained" type="submit">
                {isEditMode ? 'Save' : 'Add transaction'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Box>
    </Modal>
  );
};

export default AddTransactionModalView;

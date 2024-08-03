'use client';
import { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import {
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  SelectChangeEvent,
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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

import addTransaction from '@/app/actions/addTransaction';
import {
  CURRENCY_SYMBOL_MAP,
  DATE_FORMATS,
  EXPENSE_CATEGORIES_LIST,
  INCOME_CATEGORIES_LIST,
} from '@/constants/constants';
import { Currency, TransactionType } from '@prisma/client';
import { TranactionCategory } from '@/constants/types';
import { useSettings } from '@/context/SettingsContexts';
import { getIconByName } from '@/lib/getCategoryIcon';
import { useTransactions } from '@/context/TranasctionsContext';
import { DatePicker } from '@mui/x-date-pickers';

interface Props {
  handleClose: () => void;
}

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

const AddTransactionModal: React.FC<Props> = ({ handleClose }) => {
  const router = useRouter();
  const {
    settings: { defaultCurrency },
  } = useSettings();
  const { setTransactions } = useTransactions();
  const [category, setCategory] = useState<TranactionCategory | ''>('');
  const [transactionType, setTranasctionType] = useState<TransactionType>(
    TransactionType.Expense,
  );
  const [currency, setcCurrency] = useState<Currency>(defaultCurrency);
  const isBaseAmmountShown = currency !== defaultCurrency;

  const handleTypeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newType: TransactionType,
  ) => {
    setTranasctionType(newType);
    setCategory('');
  };

  const handleCurrencyChange = (event: SelectChangeEvent) => {
    setcCurrency(event.target.value as Currency);
  };

  const handleCategoryChange = (event: SelectChangeEvent) => {
    setCategory(event.target.value as TranactionCategory);
  };

  const categories =
    transactionType === TransactionType.Income
      ? INCOME_CATEGORIES_LIST
      : EXPENSE_CATEGORIES_LIST;

  const formRef = useRef<HTMLFormElement>(null);
  // This is a legacy implementaions from Brad Traversy cource,
  // TODO: rework to react-hook-form
  const clientAction = async (formData: FormData) => {
    const { data, error } = await addTransaction(
      formData,
      transactionType,
      isBaseAmmountShown,
    );

    if (error) {
      toast.error(error);
    } else if (data) {
      toast.success('Added!');
      formRef.current?.reset();
      router.refresh();
      setTransactions((transactions) => [data, ...transactions]);
      handleClose();
    }
  };

  return (
    <>
      <Modal
        open
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            marginBottom={3}
          >
            <Typography variant="h4" component="h3" flexGrow={1}>
              Add transaction
            </Typography>
            <IconButton
              aria-label="close"
              onClick={handleClose}
              sx={{ position: 'absolute', top: 8, right: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
          <form ref={formRef} action={clientAction}>
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
                  defaultValue={new Date()}
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
                />
              </Grid>

              <Grid item xs={12} sm={5} marginTop={2}>
                <Button fullWidth variant="contained" type="submit">
                  Add transaction
                </Button>
              </Grid>
            </Grid>
          </form>
        </Box>
      </Modal>
    </>
  );
};

export default AddTransactionModal;

'use client';
import { toast } from 'react-toastify';
import addTransaction from '@/app/actions/addTransaction';
import { useRef, useState } from 'react';
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
} from '@mui/material';
// TODO: check bundle size with alternative import
import * as Icons from '@mui/icons-material';
import {
  EXPENSE_CATEGORIES_LIST,
  INCOME_CATEGORIES_LIST,
} from '@/constants/constants';
import { Currency, TransactionType } from '@prisma/client';
import { TranactionCategory } from '@/constants/types';

const AddTransaction = () => {
  const [category, setCategory] = useState<TranactionCategory | ''>('');
  const [transactionType, setTranasctionType] = useState<TransactionType>(
    TransactionType.Expense,
  );
  const [currency, setcCurrency] = useState<Currency>(Currency.EUR);

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
  const clientAction = async (formData: FormData) => {
    const { error, data } = await addTransaction(formData, transactionType);
    console.log('data', data);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Added!');
      formRef.current?.reset();
    }
  };

  return (
    <>
      <h3 className="transaction-header">Add Transaction</h3>
      <form ref={formRef} action={clientAction}>
        <ToggleButtonGroup
          exclusive
          size="small"
          color="primary"
          value={transactionType}
          onChange={handleTypeChange}
        >
          <ToggleButton value={TransactionType.Expense}>Expense</ToggleButton>
          <ToggleButton value={TransactionType.Income}>Income</ToggleButton>
        </ToggleButtonGroup>

        <FormControl variant="standard" fullWidth sx={{ minWidth: 150 }}>
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

        <FormControl variant="standard" fullWidth sx={{ minWidth: 250 }}>
          <InputLabel>Category</InputLabel>
          <Select
            name="category"
            value={category as string}
            onChange={handleCategoryChange}
          >
            {categories.map(({ value, label, icon }) => {
              const IconComponent = Icons[icon as keyof typeof Icons];

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

        <FormControl fullWidth variant="standard">
          <InputLabel htmlFor="amount">Amount</InputLabel>
          <Input
            id="amount"
            name="amount"
            type="number"
            startAdornment={<InputAdornment position="start">$</InputAdornment>}
          />
        </FormControl>

        <TextField
          fullWidth
          label="Text"
          name="text"
          type="text"
          variant="standard"
        />
        <Button fullWidth variant="contained" type="submit">
          Add transaction
        </Button>
      </form>
    </>
  );
};

export default AddTransaction;

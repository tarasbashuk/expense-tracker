'use client';
import { toast } from 'react-toastify';
import addTransaction from '@/app/actions/addTransaction';
import { useRef, useState } from 'react';
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  SelectChangeEvent,
  ToggleButtonGroup,
  ToggleButton,
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
  const [category, setCategory] = useState<TranactionCategory | null>(null);
  const [transactionType, setTranasctionType] = useState<TransactionType>(
    TransactionType.Expense,
  );
  const [currency, setcCurrency] = useState<Currency>(Currency.EUR);

  const handleTypeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newType: TransactionType,
  ) => {
    setTranasctionType(newType);
    setCategory(null);
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
    const categoryValue = formData.get('category');
    console.log('categoryValue', categoryValue);
    const { error } = await addTransaction(formData);

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
          color="primary"
          value={transactionType}
          onChange={handleTypeChange}
        >
          <ToggleButton value={TransactionType.Expense}>Expense</ToggleButton>
          <ToggleButton value={TransactionType.Income}>Income</ToggleButton>
        </ToggleButtonGroup>

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
        {/* <div className="from-control">
          <label htmlFor="text">Text</label>
          <input
            type="text"
            id="text"
            name="text"
            placeholder="Enter text..."
          />
        </div>

        <div className="from-control">
          <label htmlFor="amount">Amount</label>
          <input
            type="number"
            id="amount"
            name="amount"
            placeholder="Enter amount..."
            step="0.01"
          />
        </div> */}
        <button className="btn">Add transaction</button>
      </form>
    </>
  );
};

export default AddTransaction;

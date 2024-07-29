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
import * as Icons from '@mui/icons-material';
import {
  EXPENSE_CATEGORIES_LIST,
  INCOME_CATEGORIES_LIST,
} from '@/constants/constants';
import { TrasactionType } from '@/constants/types';

const AddTransaction = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedType, setSelectedType] = useState<TrasactionType>(
    TrasactionType.Expense,
  );

  const handleTypeChange = (
    event: React.MouseEvent<HTMLElement>,
    newType: TrasactionType,
  ) => {
    setSelectedType(newType);
  };

  const handleCategoryChange = (event: SelectChangeEvent) => {
    setSelectedCategory(event.target.value as string);
  };

  const categories =
    selectedType === TrasactionType.Income
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
          color="primary"
          value={selectedType}
          exclusive
          onChange={handleTypeChange}
        >
          <ToggleButton value={TrasactionType.Expense}>Expense</ToggleButton>
          <ToggleButton value={TrasactionType.Income}>Income</ToggleButton>
        </ToggleButtonGroup>

        <FormControl variant="standard" fullWidth sx={{ minWidth: 250 }}>
          <InputLabel>Category</InputLabel>
          <Select
            name="category"
            value={selectedCategory}
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

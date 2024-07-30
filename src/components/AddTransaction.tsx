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
  Typography,
  Modal,
  Box,
  Grid,
} from '@mui/material';
// TODO: check bundle size with alternative import
import * as Icons from '@mui/icons-material';
import {
  CURRENCY_SYMBOL_MAP,
  EXPENSE_CATEGORIES_LIST,
  INCOME_CATEGORIES_LIST,
} from '@/constants/constants';
import { Currency, TransactionType } from '@prisma/client';
import { TranactionCategory } from '@/constants/types';
import { useSettings } from '@/context/SettingsContexts';

interface Props {
  isOpen: boolean;
  handleClose: () => void;
}

const style = {
  position: 'absolute',
  top: { xs: '10%', sm: '50%' },
  left: '50%',
  transform: { xs: 'translate(-50%, 0%)', sm: 'translate(-50%, -50%)' },
  width: { xs: '90%', sm: 550 },
  bgcolor: 'background.paper',
  border: 'none',
  borderRadius: 4,
  boxShadow: 24,
  p: { xs: 3, sm: 4 },
};

const AddTransaction: React.FC<Props> = ({ isOpen, handleClose }) => {
  const { settings } = useSettings();
  const [category, setCategory] = useState<TranactionCategory | ''>('');
  const [transactionType, setTranasctionType] = useState<TransactionType>(
    TransactionType.Expense,
  );
  const [currency, setcCurrency] = useState<Currency>(settings.defaultCurrency);

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
    const { error } = await addTransaction(formData, transactionType);

    if (error) {
      toast.error(error);
    } else {
      toast.success('Added!');
      formRef.current?.reset();
    }
  };

  return (
    <>
      <Modal
        open={isOpen}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <Typography variant="h4" component="h3" marginBottom={3}>
            Add transaction
          </Typography>
          <form ref={formRef} action={clientAction}>
            <Grid container spacing={2} justifyContent="flex-end">
              <Grid marginTop={2} paddingLeft={2} xs={12}>
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  size="small"
                  color="primary"
                  value={transactionType}
                  onChange={handleTypeChange}
                >
                  <ToggleButton value={TransactionType.Expense}>
                    Expense
                  </ToggleButton>
                  <ToggleButton value={TransactionType.Income}>
                    Income
                  </ToggleButton>
                </ToggleButtonGroup>
              </Grid>

              <Grid item xs={8}>
                <FormControl fullWidth variant="standard">
                  <InputLabel htmlFor="amount">Amount</InputLabel>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
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
              <Grid item xs={12}>
                <FormControl fullWidth variant="standard">
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
              </Grid>
              <Grid item xs={12}>
                <TextField
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

export default AddTransaction;

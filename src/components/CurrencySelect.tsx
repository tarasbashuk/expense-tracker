import { FC } from 'react';
import { Currency } from '@prisma/client';
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
} from '@mui/material';

interface Props {
  value: Currency;
  label?: string;
  onChange: (event: SelectChangeEvent) => void;
}

const CurrencySelect: FC<Props> = ({ value, onChange, label = 'Currency' }) => {
  return (
    <FormControl variant="standard" fullWidth>
      <InputLabel>{label}</InputLabel>
      <Select name="currency" value={value as string} onChange={onChange}>
        {Object.values(Currency).map((currency) => {
          return (
            <MenuItem key={currency} value={currency}>
              {currency}
            </MenuItem>
          );
        })}
      </Select>
    </FormControl>
  );
};

export default CurrencySelect;

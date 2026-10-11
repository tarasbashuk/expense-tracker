import { FC, useId } from 'react';
import { Currency } from '@prisma/client';
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
} from '@mui/material';
import { useIntl } from 'react-intl';

interface Props {
  value: Currency;
  label?: string;
  /* eslint-disable-next-line no-unused-vars*/
  onChange: (event: SelectChangeEvent) => void;
}

const CurrencySelect: FC<Props> = ({ value, onChange, label }) => {
  const { formatMessage } = useIntl();
  const labelId = useId();
  const defaultLabel = formatMessage({
    id: 'addTransaction.currency',
    defaultMessage: 'Currency',
  });

  return (
    <FormControl variant="outlined" fullWidth>
      <InputLabel id={labelId}>{label || defaultLabel}</InputLabel>
      <Select
        labelId={labelId}
        label={label || defaultLabel}
        name="currency"
        value={value as string}
        onChange={onChange}
      >
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

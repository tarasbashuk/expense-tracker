import { FC } from 'react';
import {
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  SxProps,
} from '@mui/material';

import { DECEMBER, JANUARY, MONTH_LIST } from '@/constants/constants';
import { ArrowBack, ArrowForward } from '@mui/icons-material';

interface Props {
  month: string;
  sx?: SxProps;
  /* eslint-disable-next-line no-unused-vars*/
  setMonth: (value: string) => void;
}

const MonthSelect: FC<Props> = ({ sx, month, setMonth }) => {
  const handleMonthChange = (event: SelectChangeEvent) => {
    setMonth(event.target.value);
  };

  const goToPrevMonth = () => {
    if (month === JANUARY) {
      setMonth(DECEMBER);
    } else {
      const prevMonth = Number(month) - 1;
      setMonth(prevMonth.toString());
    }
  };

  const goToNextMonth = () => {
    if (month === DECEMBER) {
      setMonth(JANUARY);
    } else {
      const nextMonth = Number(month) + 1;
      setMonth(nextMonth.toString());
    }
  };

  return (
    <Stack direction="row" alignItems="center" sx={sx}>
      <IconButton
        aria-label="previous"
        onClick={goToPrevMonth}
        sx={{ marginRight: 2 }}
      >
        <ArrowBack />
      </IconButton>
      <FormControl variant="standard" size="small" sx={{ minWidth: 150 }}>
        <InputLabel id="month-select-label">Month</InputLabel>
        <Select
          labelId="month-select-label"
          id="month-select"
          value={month}
          onChange={handleMonthChange}
          label="Month"
        >
          {MONTH_LIST.map((m) => (
            <MenuItem key={m.value} value={m.value}>
              {m.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <IconButton
        aria-label="next"
        onClick={goToNextMonth}
        sx={{ marginLeft: 2 }}
      >
        <ArrowForward />
      </IconButton>
    </Stack>
  );
};

export default MonthSelect;

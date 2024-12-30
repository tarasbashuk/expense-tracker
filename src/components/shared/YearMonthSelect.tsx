import { FC, useCallback } from 'react';
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

import {
  DECEMBER,
  JANUARY,
  MAX_YEAR,
  MIN_YEAR,
  MONTH_LIST,
  YEAR_LIST,
} from '@/constants/constants';
import { ArrowBack, ArrowForward } from '@mui/icons-material';

interface Props {
  month: string;
  year: string;
  sx?: SxProps;
  /* eslint-disable no-unused-vars*/
  setMonth: (value: string) => void;
  setYear: (value: string) => void;
  /* eslint-enable */
}

const YearMonthSelect: FC<Props> = ({ sx, year, month, setMonth, setYear }) => {
  const handleMonthChange = (event: SelectChangeEvent) => {
    setMonth(event.target.value);
  };
  const handleYearChange = (event: SelectChangeEvent) => {
    setYear(event.target.value);
  };

  const goToPrevMonth = useCallback(() => {
    if (month === JANUARY) {
      setMonth(DECEMBER);
      setYear((Number(year) - 1).toString());
    } else {
      const prevMonth = Number(month) - 1;

      setMonth(prevMonth.toString());
    }
  }, [month, setMonth, year, setYear]);

  const goToNextMonth = useCallback(() => {
    if (month === DECEMBER) {
      setMonth(JANUARY);
      setYear((Number(year) + 1).toString());
    } else {
      const nextMonth = Number(month) + 1;

      setMonth(nextMonth.toString());
    }
  }, [month, setMonth, year, setYear]);

  const isPrevDisabled = month === JANUARY && year === MIN_YEAR;
  const isNextDisabled = month === DECEMBER && year === MAX_YEAR;

  return (
    <Stack direction="row" alignItems="center" sx={sx}>
      <IconButton
        aria-label="previous"
        onClick={goToPrevMonth}
        sx={{ marginRight: 2 }}
        disabled={isPrevDisabled}
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

      <FormControl variant="standard" size="small" sx={{ minWidth: 100 }}>
        <InputLabel id="year-select-label">Year</InputLabel>
        <Select
          labelId="year-select-label"
          id="year-select"
          value={year}
          onChange={handleYearChange}
          label="Year"
        >
          {YEAR_LIST.map((y) => (
            <MenuItem key={y} value={y}>
              {y}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <IconButton
        aria-label="next"
        onClick={goToNextMonth}
        sx={{ marginLeft: 2 }}
        disabled={isNextDisabled}
      >
        <ArrowForward />
      </IconButton>
    </Stack>
  );
};

export default YearMonthSelect;

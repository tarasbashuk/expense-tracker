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
import { useIntl } from 'react-intl';
import { useSettings } from '@/context/SettingsContexts';

interface Props {
  month: string;
  year: string;
  sx?: SxProps;
  /* eslint-disable no-unused-vars*/
  setMonth: (value: string) => void;
  setYear: (value: string) => void;
  /* eslint-enable */
}

const capitalize = (s: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

const YearMonthSelect: FC<Props> = ({ sx, year, month, setMonth, setYear }) => {
  const { formatMessage } = useIntl();
  const { locale } = useSettings();
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
        sx={{ xs: { marginRight: 0 }, sm: { marginRight: 2 } }}
        disabled={isPrevDisabled}
      >
        <ArrowBack />
      </IconButton>
      <FormControl variant="standard" size="small" sx={{ minWidth: 150 }}>
        <InputLabel id="month-select-label">
          {formatMessage({ id: 'filters.month', defaultMessage: 'Month' })}
        </InputLabel>
        <Select
          labelId="month-select-label"
          id="month-select"
          value={month}
          onChange={handleMonthChange}
          label={formatMessage({
            id: 'filters.month',
            defaultMessage: 'Month',
          })}
        >
          {MONTH_LIST.map((m) => (
            <MenuItem key={m.value} value={m.value}>
              {capitalize(
                new Intl.DateTimeFormat(locale, { month: 'long' }).format(
                  new Date(2000, Number(m.value), 1),
                ),
              )}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl variant="standard" size="small" sx={{ minWidth: 100 }}>
        <InputLabel id="year-select-label">
          {formatMessage({ id: 'filters.year', defaultMessage: 'Year' })}
        </InputLabel>
        <Select
          labelId="year-select-label"
          id="year-select"
          value={year}
          onChange={handleYearChange}
          label={formatMessage({ id: 'filters.year', defaultMessage: 'Year' })}
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
        sx={{ xs: { marginLeft: 0 }, sm: { marginLeft: 2 } }}
        disabled={isNextDisabled}
      >
        <ArrowForward />
      </IconButton>
    </Stack>
  );
};

export default YearMonthSelect;

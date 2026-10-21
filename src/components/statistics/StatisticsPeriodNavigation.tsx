'use client';

import { useState } from 'react';
import { Button, DialogActions, DialogContent } from '@mui/material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { enUS, uk } from 'date-fns/locale';
import { enUS as enUSPickers, ukUA } from '@mui/x-date-pickers/locales';
import { useIntl } from 'react-intl';
import { MIN_YEAR, MAX_YEAR } from '@/constants/constants';
import PeriodNavigation, { periodCellStyles } from '../shared/PeriodNavigation';
import ResponsiveDialog, { FormTitle } from '../shared/ResponsiveDialog';

const minDate = new Date(Number(MIN_YEAR), 0, 1);
const maxDate = new Date(Number(MAX_YEAR), 11, 31);

export default function StatisticsPeriodNavigation({
  year,
  month,
  onChange,
}: {
  year: number;
  month: number;
  onChange: (_date: Date) => void;
}) {
  const { formatMessage, locale } = useIntl();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date | null>(null);
  const label = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month, 1));

  return (
    <>
      <PeriodNavigation
        styled
        onPrevious={() => onChange(new Date(year, month - 1, 1))}
        onNext={() => onChange(new Date(year, month + 1, 1))}
        previousDisabled={year === Number(MIN_YEAR) && month === 0}
        nextDisabled={year === Number(MAX_YEAR) && month === 11}
      >
        <Button
          onClick={() => {
            setDraft(new Date(year, month, 1));
            setOpen(true);
          }}
          aria-label={formatMessage(
            { id: 'stats.chooseMonth' },
            { period: label },
          )}
          sx={{
            ...periodCellStyles,
            minWidth: 0,
            minHeight: 44,
            px: 1,
            textTransform: 'none',
            fontSize: 16,
          }}
        >
          {label}
        </Button>
      </PeriodNavigation>
      <ResponsiveDialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="xs"
      >
        <FormTitle onClose={() => setOpen(false)}>
          {formatMessage({ id: 'stats.monthAndYear' })}
        </FormTitle>
        <DialogContent sx={{ px: 1 }}>
          <LocalizationProvider
            dateAdapter={AdapterDateFns}
            adapterLocale={locale === 'uk-UA' ? uk : enUS}
            localeText={
              (locale === 'uk-UA' ? ukUA : enUSPickers).components
                .MuiLocalizationProvider.defaultProps.localeText
            }
          >
            <DateCalendar
              value={draft}
              onChange={setDraft}
              views={['year', 'month']}
              openTo="month"
              minDate={minDate}
              maxDate={maxDate}
              sx={{ width: '100%', maxWidth: 320 }}
            />
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>
            {formatMessage({ id: 'common.cancel' })}
          </Button>
          <Button
            variant="contained"
            disabled={!draft}
            onClick={() => {
              if (draft) {
                onChange(draft);
                setOpen(false);
              }
            }}
          >
            {formatMessage({ id: 'common.apply' })}
          </Button>
        </DialogActions>
      </ResponsiveDialog>
    </>
  );
}

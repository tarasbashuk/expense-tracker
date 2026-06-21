'use client';

import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  ArrowBackIosNew,
  ArrowForwardIos,
  CalendarMonth,
} from '@mui/icons-material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { enUS as enUSDateFns, uk } from 'date-fns/locale';
import {
  enUS as enUSPickers,
  ukUA as ukUAPickers,
} from '@mui/x-date-pickers/locales';
import { useIntl } from 'react-intl';

import { useSettings } from '@/context/SettingsContexts';
import {
  DateRangeValue,
  localDateFromKey,
  dateKeyFromLocalDate,
  PeriodMode,
} from '@/lib/dateRange';

interface Props {
  mode: PeriodMode;
  range: DateRangeValue;
  onModeChange: (_mode: PeriodMode) => void;
  onPrevious: () => void;
  onNext: () => void;
  onCustomRangeChange: (_range: DateRangeValue) => void;
}

const modes: PeriodMode[] = ['month', 'quarter', 'year', 'custom'];

const formatDateRange = (start: Date, end: Date, locale: 'en-US' | 'uk-UA') => {
  const dateLocale = locale === 'uk-UA' ? uk : enUSDateFns;
  const options = { locale: dateLocale };
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  if (locale === 'uk-UA') {
    if (sameMonth) {
      return `${format(start, 'd', options)}–${format(end, 'd MMMM yyyy', options)} р.`;
    }

    if (sameYear) {
      return `${format(start, 'd MMMM', options)} – ${format(end, 'd MMMM yyyy', options)} р.`;
    }

    return `${format(start, 'd MMMM yyyy', options)} р. – ${format(end, 'd MMMM yyyy', options)} р.`;
  }

  if (sameMonth) {
    return `${format(start, 'MMMM d', options)}–${format(end, 'd, yyyy', options)}`;
  }

  if (sameYear) {
    return `${format(start, 'MMMM d', options)} – ${format(end, 'MMMM d, yyyy', options)}`;
  }

  return `${format(start, 'MMMM d, yyyy', options)} – ${format(end, 'MMMM d, yyyy', options)}`;
};

const DatePeriodFilter = ({
  mode,
  range,
  onModeChange,
  onPrevious,
  onNext,
  onCustomRangeChange,
}: Props) => {
  const { formatMessage } = useIntl();
  const { locale } = useSettings();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);

  const formattedRange = useMemo(() => {
    const start = localDateFromKey(range.start);
    const end = localDateFromKey(range.end);

    return formatDateRange(start, end, locale);
  }, [locale, range.end, range.start]);

  const openPicker = () => {
    setDraftStart(localDateFromKey(range.start));
    setDraftEnd(localDateFromKey(range.end));
    setIsPickerOpen(true);
  };

  const isDraftInvalid =
    !draftStart || !draftEnd || draftStart.getTime() > draftEnd.getTime();

  const applyCustomRange = () => {
    if (!draftStart || !draftEnd || isDraftInvalid) return;

    onCustomRangeChange({
      start: dateKeyFromLocalDate(draftStart),
      end: dateKeyFromLocalDate(draftEnd),
    });
    setIsPickerOpen(false);
  };

  return (
    <LocalizationProvider
      dateAdapter={AdapterDateFns}
      adapterLocale={locale === 'uk-UA' ? uk : enUSDateFns}
      localeText={
        (locale === 'uk-UA' ? ukUAPickers : enUSPickers).components
          .MuiLocalizationProvider.defaultProps.localeText
      }
    >
      <Stack spacing={1.25} sx={{ width: '100%', maxWidth: 620 }}>
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          color="primary"
          value={mode}
          onChange={(_event, nextMode: PeriodMode | null) => {
            if (nextMode) onModeChange(nextMode);
          }}
          aria-label={formatMessage({
            id: 'filters.periodMode',
            defaultMessage: 'Period type',
          })}
        >
          {modes.map((periodMode) => (
            <ToggleButton
              key={periodMode}
              value={periodMode}
              sx={{
                minHeight: 44,
                px: { xs: 0.5, sm: 2 },
                fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                whiteSpace: 'nowrap',
              }}
            >
              {formatMessage({
                id: `filters.period.${periodMode}`,
                defaultMessage: periodMode,
              })}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '44px minmax(0, 1fr) 44px',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <IconButton
            aria-label={formatMessage({
              id: 'filters.previousPeriod',
              defaultMessage: 'Previous period',
            })}
            onClick={onPrevious}
            sx={{ width: 44, height: 44 }}
          >
            <ArrowBackIosNew fontSize="small" />
          </IconButton>

          {mode === 'custom' ? (
            <Button
              color="inherit"
              onClick={openPicker}
              endIcon={<CalendarMonth />}
              aria-label={formatMessage(
                {
                  id: 'filters.openDateRange',
                  defaultMessage: 'Choose date range: {range}',
                },
                { range: formattedRange },
              )}
              sx={{
                minWidth: 0,
                minHeight: 44,
                px: 0.5,
                textTransform: 'none',
              }}
            >
              <Typography
                component="span"
                variant="body1"
                noWrap
                sx={{ fontWeight: 500 }}
              >
                {formattedRange}
              </Typography>
            </Button>
          ) : (
            <Typography
              variant="body1"
              align="center"
              noWrap
              sx={{ px: 0.5, fontWeight: 500 }}
            >
              {formattedRange}
            </Typography>
          )}

          <IconButton
            aria-label={formatMessage({
              id: 'filters.nextPeriod',
              defaultMessage: 'Next period',
            })}
            onClick={onNext}
            sx={{ width: 44, height: 44 }}
          >
            <ArrowForwardIos fontSize="small" />
          </IconButton>
        </Box>
      </Stack>

      <Dialog
        open={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {formatMessage({
            id: 'filters.customRangeTitle',
            defaultMessage: 'Choose date range',
          })}
        </DialogTitle>
        <DialogContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} pt={1}>
            <DatePicker
              label={formatMessage({
                id: 'filters.startDate',
                defaultMessage: 'Start date',
              })}
              value={draftStart}
              onChange={setDraftStart}
              slotProps={{ textField: { fullWidth: true } }}
            />
            <DatePicker
              label={formatMessage({
                id: 'filters.endDate',
                defaultMessage: 'End date',
              })}
              value={draftEnd}
              minDate={draftStart || undefined}
              onChange={setDraftEnd}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Stack>
          {isDraftInvalid && draftStart && draftEnd && (
            <Typography color="error" variant="caption" mt={1} component="p">
              {formatMessage({
                id: 'filters.invalidDateRange',
                defaultMessage: 'The end date cannot be before the start date.',
              })}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIsPickerOpen(false)}>
            {formatMessage({ id: 'common.cancel', defaultMessage: 'Cancel' })}
          </Button>
          <Button
            variant="contained"
            disabled={isDraftInvalid}
            onClick={applyCustomRange}
          >
            {formatMessage({ id: 'common.apply', defaultMessage: 'Apply' })}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default DatePeriodFilter;

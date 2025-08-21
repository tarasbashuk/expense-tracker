'use client';
import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  InputAdornment,
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { Currency, Language } from '@prisma/client';
import { toast } from 'react-toastify';
import { FormattedMessage, useIntl } from 'react-intl';

import { useSettings } from '@/context/SettingsContexts';
import CurrencySelect from '@/components/CurrencySelect';
import LanguageSelect from '@/components/LanguageSelect';
import { CURRENCY_SYMBOL_MAP } from '@/constants/constants';
import updateSettings from '@/app/actions/updateSettings';

const SettingsPage = () => {
  const { settings, setLocale } = useSettings();
  const { formatMessage } = useIntl();
  const [isSaving, setIsSaving] = useState(false);

  const [language, setLanguage] = useState<Language>(Language.ENG);
  const [currency, setCurrency] = useState<Currency>(Currency.EUR);
  const [initialAmount, setInitialAmount] = useState<number | undefined>();

  useEffect(() => {
    if (settings) {
      setLanguage(settings.language);
      setCurrency(settings.defaultCurrency);
      setInitialAmount(settings.initialAmount || undefined);
    }
  }, [settings]);

  const handleLanguageChange = (event: SelectChangeEvent) => {
    const newLanguage = event.target.value as Language;
    setLanguage(newLanguage);
    setLocale(newLanguage === Language.ENG ? 'en-US' : 'uk-UA');
  };

  const handleCurrencyChange = (event: SelectChangeEvent) => {
    setCurrency(event.target.value as Currency);
  };

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value) || undefined;
    setInitialAmount(value);
  };

  const handleSubmit = async () => {
    setIsSaving(true);

    const { settings: updatedSettings, error } = await updateSettings({
      defaultCurrency: currency,
      initialAmount: initialAmount as number,
      language,
    });

    if (error) {
      toast.error(error);
    } else if (updatedSettings) {
      toast.success(
        formatMessage({
          id: 'settings.settingsSaved',
          defaultMessage: 'Settings saved successfully',
        }),
      );
    }
    setIsSaving(false);
  };

  const isSubmitDisabled = isSaving;

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 600, mx: 'auto', width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        <FormattedMessage id="settings.title" defaultMessage="Settings" />
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <FormattedMessage
              id="settings.generalSettings"
              defaultMessage="General settings"
            />
          </Typography>

          <Stack spacing={3}>
            <LanguageSelect
              value={language}
              label={formatMessage({
                id: 'settings.language',
                defaultMessage: 'Language',
              })}
              onChange={handleLanguageChange}
              fullWidth
            />

            <CurrencySelect
              value={currency}
              label={formatMessage({
                id: 'settings.defaultCurrency',
                defaultMessage: 'Default Currency',
              })}
              onChange={handleCurrencyChange}
            />

            <TextField
              fullWidth
              variant="standard"
              label={formatMessage({
                id: 'settings.initialAmount',
                defaultMessage: 'Initial Amount',
              })}
              type="number"
              value={initialAmount || ''}
              onChange={handleAmountChange}
              inputProps={{
                min: 0,
                step: '0.01',
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {CURRENCY_SYMBOL_MAP[currency]}
                  </InputAdornment>
                ),
              }}
            />
          </Stack>
        </CardContent>
      </Card>

      <Alert severity="warning" sx={{ mb: 3 }}>
        <FormattedMessage
          id="settings.currencyWarning"
          defaultMessage="Please be aware that if you change the default currency, all your existing transactions won't be recalculated automatically and will need to be updated manually."
        />
      </Alert>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
        >
          <FormattedMessage
            id="settings.saveSettings"
            defaultMessage="Save Settings"
          />
        </Button>
      </Box>
    </Box>
  );
};

export default SettingsPage;

'use client';
import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControlLabel,
  InputAdornment,
  Stack,
  Switch,
  TextField,
  Typography,
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
  const { settings, setLocale, setSettings } = useSettings();
  const { formatMessage } = useIntl();
  const [isSaving, setIsSaving] = useState(false);

  const [language, setLanguage] = useState<Language>(Language.ENG);
  const [currency, setCurrency] = useState<Currency>(Currency.EUR);
  const [initialAmount, setInitialAmount] = useState<number>();
  const [encryptData, setEncryptData] = useState<boolean>(false);

  useEffect(() => {
    if (settings) {
      setLanguage(settings.language);
      setCurrency(settings.defaultCurrency);
      setInitialAmount(settings.initialAmount || 0);
      setEncryptData(Boolean(settings.encryptData));
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
    const value = event.target.value === '' ? 0 : Number(event.target.value);
    setInitialAmount(value);
  };

  const handleSubmit = async () => {
    setIsSaving(true);

    const { settings: updatedSettings, error } = await updateSettings({
      defaultCurrency: currency,
      initialAmount: initialAmount as number,
      language,
      encryptData,
    });

    if (error) {
      toast.error(error);
    } else if (updatedSettings) {
      setSettings(updatedSettings);
      toast.success(
        formatMessage({
          id: 'settings.settingsSaved',
          defaultMessage: 'Settings saved successfully',
        }),
      );
    }
    setIsSaving(false);
  };

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        pb: { xs: 8, sm: 3 },
        maxWidth: 600,
        mx: 'auto',
        width: '100%',
      }}
    >
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
              value={initialAmount}
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

            <FormControlLabel
              control={<Switch disabled checked={encryptData} />}
              label={
                <Box>
                  <Typography variant="body2">
                    <FormattedMessage
                      id="settings.encryptData"
                      defaultMessage="Encrypt data"
                    />
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    <FormattedMessage
                      id="settings.encryptDataDescription"
                      defaultMessage="This setting cannot be changed after initial setup"
                    />
                  </Typography>
                </Box>
              }
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
        <Button variant="contained" onClick={handleSubmit} disabled={isSaving}>
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

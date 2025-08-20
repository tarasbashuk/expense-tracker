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

import { useSettings } from '@/context/SettingsContexts';
import CurrencySelect from '@/components/CurrencySelect';
import LanguageSelect from '@/components/LanguageSelect';
import { CURRENCY_SYMBOL_MAP } from '@/constants/constants';
import updateSettings from '@/app/actions/updateSettings';

const SettingsPage = () => {
  const { settings } = useSettings();
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
    setLanguage(event.target.value as Language);
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
      toast.success('Settings saved successfully');
    }
    setIsSaving(false);
  };

  const isSubmitDisabled = isSaving;

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 600, mx: 'auto', width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            General Settings
          </Typography>

          <Stack spacing={3}>
            <LanguageSelect
              value={language}
              label="Language"
              onChange={handleLanguageChange}
              fullWidth
            />

            <CurrencySelect
              value={currency}
              label="Default Currency"
              onChange={handleCurrencyChange}
            />

            <TextField
              fullWidth
              variant="standard"
              label="Initial Amount"
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
        Please be aware that if you change the default currency, all your
        existing transactions won&apos;t be recalculated automatically and will
        need to be updated manually.
      </Alert>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
        >
          Save Settings
        </Button>
      </Box>
    </Box>
  );
};

export default SettingsPage;

'use client';
import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
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
import TagManager from '@/components/tags/TagManager';
import HistoryHeaderActions from '@/components/history/HistoryHeaderActions';
import {
  cardStyles,
  pageStyles,
  pageHeaderStyles,
} from '@/components/history/tokens';
import updateSettings from '@/app/actions/updateSettings';

const SettingsPage = () => {
  const { settings, setLocale, setSettings } = useSettings();
  const { formatMessage } = useIntl();
  const [isSaving, setIsSaving] = useState(false);

  const [language, setLanguage] = useState<Language>(settings.language);
  const [currency, setCurrency] = useState<Currency>(settings.defaultCurrency);
  const [initialAmount, setInitialAmount] = useState<number | undefined>(
    settings?.initialAmount || 0,
  );
  const encryptData = Boolean(settings.encryptData);
  const [creditCardTrackingEnabled, setCreditCardTrackingEnabled] = useState(
    settings.creditCardTrackingEnabled,
  );

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
      creditCardTrackingEnabled,
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
    <Box component="section" sx={pageStyles}>
      <Box sx={pageHeaderStyles}>
        <Typography
          variant="h4"
          component="h1"
          sx={{ minWidth: 0, fontSize: { xs: 22, sm: 34 }, fontWeight: 600 }}
        >
          <FormattedMessage id="settings.title" />
        </Typography>
        <HistoryHeaderActions />
      </Box>

      <Stack spacing={2}>
        <Card sx={cardStyles}>
          <CardContent
            sx={{
              p: { xs: 2, sm: 3 },
              '&:last-child': { pb: { xs: 2, sm: 3 } },
            }}
          >
            <Typography
              variant="h6"
              component="h2"
              fontWeight={600}
              sx={{ mb: 3 }}
            >
              <FormattedMessage id="settings.generalSettings" />
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gap: 3,
                gridTemplateColumns: {
                  xs: 'minmax(0, 1fr)',
                  sm: 'repeat(2, minmax(0, 1fr))',
                },
              }}
            >
              <LanguageSelect
                value={language}
                label={formatMessage({ id: 'settings.language' })}
                onChange={handleLanguageChange}
              />
              <Box sx={{ minWidth: 0 }}>
                <CurrencySelect
                  value={currency}
                  label={formatMessage({ id: 'settings.defaultCurrency' })}
                  onChange={handleCurrencyChange}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 1 }}
                >
                  <FormattedMessage id="settings.currencyHint" />
                </Typography>
              </Box>
              <TextField
                fullWidth
                variant="outlined"
                label={formatMessage({ id: 'settings.initialAmount' })}
                type="number"
                value={initialAmount ?? ''}
                onChange={handleAmountChange}
                inputProps={{ min: 0, step: '0.01' }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      {CURRENCY_SYMBOL_MAP[currency]}
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            {currency !== settings.defaultCurrency && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <FormattedMessage id="settings.currencyWarning" />
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card sx={cardStyles}>
          <CardContent
            sx={{
              p: { xs: 2, sm: 3 },
              '&:last-child': { pb: { xs: 2, sm: 3 } },
            }}
          >
            <TagManager settingsPreview />
          </CardContent>
        </Card>

        <Card sx={cardStyles}>
          <CardContent
            sx={{
              p: { xs: 2, sm: 3 },
              '&:last-child': { pb: { xs: 2, sm: 3 } },
            }}
          >
            <Typography
              variant="h6"
              component="h2"
              fontWeight={600}
              sx={{ mb: 2 }}
            >
              <FormattedMessage id="settings.accountingAndData" />
            </Typography>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              gap={2}
            >
              <Box>
                <Typography id="credit-card-label">
                  <FormattedMessage id="settings.creditCardTracking" />
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  id="credit-card-hint"
                >
                  <FormattedMessage id="settings.creditCardTrackingDescription" />
                </Typography>
              </Box>
              <Switch
                checked={creditCardTrackingEnabled}
                onChange={(event) =>
                  setCreditCardTrackingEnabled(event.target.checked)
                }
                inputProps={{
                  'aria-labelledby': 'credit-card-label',
                  'aria-describedby': 'credit-card-hint',
                  role: 'switch',
                }}
              />
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Stack direction="row" justifyContent="space-between" gap={2}>
              <Box>
                <Typography>
                  <FormattedMessage id="settings.encryptData" />
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <FormattedMessage id="settings.encryptionSetupHint" />
                </Typography>
              </Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ flexShrink: 0 }}
              >
                <FormattedMessage
                  id={encryptData ? 'settings.enabled' : 'settings.disabled'}
                />
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={isSaving}
            sx={{ width: { xs: '100%', sm: 'auto' }, minHeight: 44 }}
          >
            <FormattedMessage id="settings.saveSettings" />
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};

export default SettingsPage;

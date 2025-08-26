'use client';
import { useSettings } from '@/context/SettingsContexts';
import { useClerk } from '@clerk/nextjs';
import {
  Alert,
  Box,
  Button,
  FormControl,
  Grid,
  Input,
  InputAdornment,
  InputLabel,
  Modal,
  SelectChangeEvent,
  Stack,
  Typography,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { useEffect, useState } from 'react';
import CurrencySelect from '../CurrencySelect';
import LanguageSelect from '../LanguageSelect';
import { Currency, Language } from '@prisma/client';
import { CURRENCY_SYMBOL_MAP } from '@/constants/constants';
import { useMediaQueries } from '@/lib/useMediaQueries';
import updateSettings from '@/app/actions/updateSettings';
import { toast } from 'react-toastify';
import { FormattedMessage, useIntl } from 'react-intl';

const style = {
  position: 'absolute',
  top: { xs: '0', sm: '50%' },
  left: { xs: '0', sm: '50%' },
  transform: { xs: 'none', sm: 'translate(-50%, -50%)' },
  width: { xs: '100%', sm: 550 },
  height: { xs: '100%', sm: 'auto' },
  bgcolor: 'background.paper',
  border: 'none',
  borderRadius: 4,
  boxShadow: 24,
  p: { xs: '18px', sm: 4 },
};

const WelcomeModal = () => {
  const { settings, setSettings } = useSettings();
  const { user } = useClerk();
  const { isSmall } = useMediaQueries();
  const { formatMessage } = useIntl();

  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [currency, setCurrency] = useState<Currency>(Currency.EUR);
  const [initialAmount, setInitialAmount] = useState(0);
  const [language, setLanguage] = useState<Language>(Language.ENG);
  const [encryptData, setEncryptData] = useState(false);

  useEffect(() => {
    if (settings.initialAmount === null && user?.id) {
      setIsModalOpen(true);
    }
  }, [settings.initialAmount, user?.id]);

  const isSubmitDisabled = isSaving;

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value === '' ? 0 : Number(event.target.value);
    setInitialAmount(value);
  };
  const handleCurrencyChange = (event: SelectChangeEvent) => {
    setCurrency(event.target.value as Currency);
  };

  const handleLanguageChange = (event: SelectChangeEvent) => {
    setLanguage(event.target.value as Language);
  };

  const handleSubmit = async () => {
    setIsSaving(true);

    const { settings, error } = await updateSettings({
      defaultCurrency: currency,
      language,
      encryptData,
      initialAmount,
    });

    if (error) {
      toast.error(error);
    } else if (settings) {
      setSettings(settings);
      toast.success('Changes were saved');
      setIsModalOpen(false);
    }
    setIsSaving(false);
  };

  return (
    <Modal
      disableEscapeKeyDown
      open={isModalOpen}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Box sx={style}>
        <Stack spacing={2} marginBottom={3} direction="column">
          <Typography variant="h4">
            <FormattedMessage
              id="welcome.title"
              defaultMessage="Welcome to the Expense Tracker App!"
            />
          </Typography>

          <Typography variant="h6">
            <FormattedMessage
              id="welcome.subtitle"
              defaultMessage="Please set your language, base currency and initial amount:"
            />
          </Typography>

          <LanguageSelect
            label={formatMessage({
              id: 'settings.language',
              defaultMessage: 'Language',
            })}
            value={language}
            onChange={handleLanguageChange}
          />

          <Grid container justifyContent="space-between" marginTop={4}>
            <Grid item xs={3} mr={1}>
              <CurrencySelect
                value={currency}
                label={formatMessage({
                  id: 'welcome.baseCurrency',
                  defaultMessage: 'Base currency',
                })}
                onChange={handleCurrencyChange}
              />
            </Grid>

            <Grid item xs={8}>
              <FormControl required fullWidth variant="standard">
                <InputLabel htmlFor="amount">
                  <FormattedMessage
                    id="welcome.startAmount"
                    defaultMessage="Start amount"
                  />
                </InputLabel>
                <Input
                  name="amountDefaultCurrency"
                  type="number"
                  inputProps={{
                    min: 0,
                    step: '0.01',
                  }}
                  value={initialAmount}
                  onChange={handleAmountChange}
                  startAdornment={
                    <InputAdornment position="start">
                      {CURRENCY_SYMBOL_MAP[currency]}
                    </InputAdornment>
                  }
                />
              </FormControl>
            </Grid>
          </Grid>

          <FormControlLabel
            control={
              <Switch
                checked={encryptData}
                onChange={(_, v) => setEncryptData(v)}
              />
            }
            label={
              <FormattedMessage
                id="settings.encryptData"
                defaultMessage="Encrypt data"
              />
            }
          />

          {encryptData && (
            <Alert severity="warning">
              <Typography variant="body2">
                <FormattedMessage
                  id="welcome.encryptWarning"
                  defaultMessage="Important: Data encryption setting cannot be changed later. Once enabled, your financial data will remain encrypted and this setting cannot be disabled."
                />
              </Typography>
            </Alert>
          )}

          <Typography variant="body1">
            <FormattedMessage
              id="welcome.balanceInfo"
              defaultMessage="The balance, regardless of the actual transaction's currency, will be shown in the base currency."
            />
          </Typography>
          <Alert severity="warning">
            <FormattedMessage
              id="settings.currencyWarning"
              defaultMessage="Please be aware that if you change the base currency later, all your existing transactions won't be recalculated automatically and will need to be updated manually."
            />
          </Alert>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              fullWidth={isSmall}
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
            >
              <FormattedMessage id="welcome.saveButton" defaultMessage="Save" />
            </Button>
          </Box>
        </Stack>
      </Box>
    </Modal>
  );
};

export default WelcomeModal;

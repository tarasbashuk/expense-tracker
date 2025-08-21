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
} from '@mui/material';
import { useEffect, useState } from 'react';
import CurrencySelect from '../CurrencySelect';
import LanguageSelect from '../LanguageSelect';
import { Currency, Language } from '@prisma/client';
import { CURRENCY_SYMBOL_MAP } from '@/constants/constants';
import { useMediaQueries } from '@/lib/useMediaQueries';
import updateSettings from '@/app/actions/updateSettings';
import { toast } from 'react-toastify';

const style = {
  position: 'absolute',
  top: { xs: '7%', sm: '50%' },
  left: '50%',
  transform: { xs: 'translate(-50%, 0%)', sm: 'translate(-50%, -50%)' },
  width: { xs: '90%', sm: 550 },
  bgcolor: 'background.paper',
  border: 'none',
  borderRadius: 4,
  boxShadow: 24,
  p: { xs: '18px', sm: 4 },
};

const WelcomeModal = () => {
  const { settings } = useSettings();
  const { user } = useClerk();
  const { isSmall } = useMediaQueries();

  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [currency, setCurrency] = useState<Currency>(Currency.EUR);
  const [initialAmount, setInititialAmount] = useState<number | undefined>();
  const [language, setLanguage] = useState<Language>(Language.ENG);

  useEffect(() => {
    if (settings.initialAmount === null && user?.id) {
      setIsModalOpen(true);
    }
  }, [settings.initialAmount, user?.id]);

  const isSubmitDisabled = isSaving || !initialAmount;

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // to prevent passing 0 value if the event.target.value is an empty string
    const value = Number(event.target.value) || undefined;
    setInititialAmount(value);
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
      initialAmount: initialAmount as number,
      language,
    });

    if (error) {
      toast.error(error);
    } else if (settings) {
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
            Welcome to the Expense Tracker App!
          </Typography>

          <Typography variant="h6">
            Please set your language, base currency and initial amount:
          </Typography>

          <LanguageSelect
            label="Language"
            value={language}
            onChange={handleLanguageChange}
          />

          <Grid container justifyContent="space-between" marginTop={4}>
            <Grid item xs={3} mr={1}>
              <CurrencySelect
                value={currency}
                label="Base currency"
                onChange={handleCurrencyChange}
              />
            </Grid>

            <Grid item xs={8}>
              <FormControl required fullWidth variant="standard">
                <InputLabel htmlFor="amount">Start amount</InputLabel>
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

          <Typography variant="body1">
            The balance, regardless of the actual transaction&apos;s currency,
            will be shown in the base currency.
          </Typography>
          <Alert severity="warning">
            Please be aware that if you change the base currency later, all your
            existing transactions won&apos;t be recalculated automatically and
            will need to be updated manually.
          </Alert>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              fullWidth={isSmall}
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
            >
              Save
            </Button>
          </Box>
        </Stack>
      </Box>
    </Modal>
  );
};

export default WelcomeModal;

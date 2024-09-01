'use client';
import { FC, useState } from 'react';
import {
  Box,
  Divider,
  FormControlLabel,
  Switch,
  SxProps,
  Typography,
} from '@mui/material';
import { useSettings } from '@/context/SettingsContexts';
import { CURRENCY_SYMBOL_MAP } from '@/constants/constants';

interface Props {
  income: number;
  expense: number;
  sx?: SxProps;
}

const getAmountColor = (num: number) =>
  num >= 0 ? 'success.main' : 'error.main';

const AdditionalBalanceInfo: FC<Props> = ({ sx, income, expense }) => {
  const {
    settings: { defaultCurrency },
  } = useSettings();
  const [isInfoShown, setIsInfoShown] = useState(false);

  const currencyLabel = CURRENCY_SYMBOL_MAP[defaultCurrency];
  const balanceNum = income - expense;

  const balance = `${balanceNum?.toFixed(2)} ${currencyLabel}`;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsInfoShown(event.target.checked);
  };

  return (
    <Box
      display="flex"
      sx={{
        ...sx,
        flexDirection: { xs: 'column', md: 'row' },
      }}
    >
      <FormControlLabel
        control={<Switch checked={isInfoShown} onChange={handleChange} />}
        label="Show balance info"
      />
      {isInfoShown && (
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          sx={{ marginTop: { xs: 2, sm: 1, md: 0 } }}
        >
          <Box
            width="100%"
            display="flex"
            justifyContent="start"
            flexWrap="nowrap"
          >
            <Typography variant="body1" component="div">
              Income:
            </Typography>
            <Typography
              ml={1}
              variant="body1"
              component="div"
              sx={{ color: 'success.main' }}
            >
              {income}
            </Typography>
          </Box>
          <Divider flexItem orientation="vertical" sx={{ margin: '8px' }} />
          <Box
            width="100%"
            display="flex"
            alignItems="center"
            justifyContent="start"
          >
            <Typography variant="body1" component="div">
              Expense:
            </Typography>
            <Typography
              ml={1}
              variant="body1"
              component="div"
              sx={{ color: 'error.main' }}
            >
              {expense}
            </Typography>
          </Box>

          <Divider flexItem orientation="vertical" sx={{ margin: '8px' }} />

          <Box
            width="100%"
            display="flex"
            alignItems="center"
            justifyContent="start"
          >
            <Typography fontWeight={600} variant="body1" component="div">
              Balance:
            </Typography>
            <Typography
              ml={1}
              variant="body1"
              component="div"
              sx={{ color: getAmountColor(balanceNum), textWrap: 'nowrap' }}
            >
              {balance}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default AdditionalBalanceInfo;

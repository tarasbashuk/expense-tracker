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
import { formatCurrency } from '@/lib/formatCurrency';
import { useIntl } from 'react-intl';

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
  const { formatMessage } = useIntl();

  const balanceNum = income - expense;

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
        label={formatMessage({
          id: 'balance.showInfo',
          defaultMessage: 'Show balance info',
        })}
      />
      {isInfoShown && (
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          sx={{
            marginTop: { xs: 2, sm: 1, md: 0 },
            flexDirection: { xs: 'column', sm: 'row' },
          }}
        >
          <Box
            width="100%"
            display="flex"
            justifyContent="start"
            flexWrap="nowrap"
          >
            <Typography variant="body1" component="div">
              {formatMessage({
                id: 'incomeExpense.income',
                defaultMessage: 'Income',
              })}
              :
            </Typography>
            <Typography
              ml={1}
              variant="body1"
              component="div"
              sx={{ color: 'success.main', textWrap: 'nowrap' }}
            >
              {formatCurrency(income)}
            </Typography>
          </Box>

          <Divider
            flexItem
            orientation="vertical"
            sx={{ margin: '8px', display: { xs: 'none', sm: 'block' } }}
          />

          <Box
            width="100%"
            display="flex"
            alignItems="center"
            justifyContent="start"
          >
            <Typography variant="body1" component="div">
              {formatMessage({
                id: 'incomeExpense.expense',
                defaultMessage: 'Expense',
              })}
              :
            </Typography>
            <Typography
              ml={1}
              variant="body1"
              component="div"
              sx={{ color: 'error.main', textWrap: 'nowrap' }}
            >
              {formatCurrency(expense)}
            </Typography>
          </Box>

          <Divider
            flexItem
            orientation="vertical"
            sx={{ margin: '8px', display: { xs: 'none', sm: 'block' } }}
          />

          <Box
            width="100%"
            display="flex"
            alignItems="center"
            justifyContent="start"
            sx={{ mt: { xs: 1, sm: 0 } }}
          >
            <Typography fontWeight={600} variant="body1" component="div">
              {formatMessage({
                id: 'balance.label',
                defaultMessage: 'Balance',
              })}
              :
            </Typography>
            <Typography
              ml={1}
              variant="body1"
              component="div"
              sx={{ color: getAmountColor(balanceNum), textWrap: 'nowrap' }}
            >
              {formatCurrency(balanceNum, defaultCurrency)}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default AdditionalBalanceInfo;

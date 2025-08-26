'use client';
import React, { useEffect, useState } from 'react';
import { PieChart } from '@mui/x-charts/PieChart';
import { BarChart } from '@mui/x-charts/BarChart';
import { PieValueType } from '@mui/x-charts';
import { TransactionType } from '@prisma/client';
import {
  Avatar,
  Box,
  CircularProgress,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import PieChartIcon from '@mui/icons-material/PieChart';
import BarChartIcon from '@mui/icons-material/BarChart';
import { blue, green } from '@mui/material/colors';

import YearMonthSelect from './shared/YearMonthSelect';
import TransactionTypeButtonGroup from './shared/TransactionTypeButtonGroup';
import { useMediaQueries } from '@/lib/useMediaQueries';
import getStats from '@/app/actions/getStats';
import AdditionalBalanceInfo from './AdditionalBalanceInfo';
import getIncomeExpense from '@/app/actions/getIncomeExpense';
import MobileWarning from './shared/MobileWarning';
import { getIconByName } from '@/lib/getCategoryIcon';
import { ChartType, TransactionCategory } from '@/constants/types';
import { useIntl, FormattedMessage } from 'react-intl';
import { useCategoryI18n } from '@/lib/useCategoryI18n';
import {
  CURRENCY_SYMBOL_MAP,
  EXPENSE_CATEGORIES_LIST,
  INCOME_CATEGORIES_LIST,
} from '@/constants/constants';
import { useSettings } from '@/context/SettingsContexts';
import { COLOR_MAP } from '@/lib/getCategoryColor';

const today = new Date();
const currentMonth = today.getMonth().toString();
const currentYear = today.getFullYear().toString();

const getChartDims = ({
  isExtraSmall,
  isSmall,
  isMedium,
}: Record<string, boolean>) => {
  if (isExtraSmall) {
    return {
      width: 320,
      height: 350,
      innerRadius: 10,
      outerRadius: 150,
    };
  }

  if (isSmall) {
    return {
      width: 420,
      height: 420,
      innerRadius: 15,
      outerRadius: 180,
    };
  }

  if (isMedium) {
    return {
      cx: '20%',
      cy: '50%',
      width: 800,
      height: 450,
      innerRadius: 20,
      outerRadius: 140,
    };
  }

  return {
    cx: '25%',
    cy: '50%',
    width: 950,
    height: 450,
    innerRadius: 30,
    outerRadius: 200,
  };
};

const Stats = () => {
  const { settings } = useSettings();
  const { isExtraSmall, isSmall, isMedium } = useMediaQueries();
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [activeDataIndex, setActiveDataIndex] = useState<number | null>(null);

  const [error, setError] = useState<string>('');
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [isLoading, setIsloading] = useState(true);
  const [expenseChartData, setExpenseChartData] = useState<PieValueType[]>([]);
  const [incomeChartData, setIncomeChartData] = useState<PieValueType[]>([]);
  const [transactionType, setTranasctionType] = useState<TransactionType>(
    TransactionType.Expense,
  );
  const [chartType, setChartType] = useState<ChartType>('pie');

  const { formatMessage } = useIntl();
  const { getLabel } = useCategoryI18n();

  const handleTranasctionTypeChange = (type: TransactionType) => {
    setActiveDataIndex(null);
    setTranasctionType(type);
  };

  const handleChartTypeChange = (_e: any, newChartType: ChartType) => {
    if (newChartType) {
      setChartType(newChartType);
    }
  };

  const handleItemClick = (_e: any, d: { dataIndex: number } | null) => {
    if (d?.dataIndex !== undefined) {
      setActiveDataIndex(d.dataIndex);
    }
  };

  const { cx, cy, width, height, innerRadius, outerRadius } = getChartDims({
    isExtraSmall,
    isSmall,
    isMedium,
  });

  useEffect(() => {
    const fetchTrans = async () => {
      const { expenseChartData, incomeChartData, error } = await getStats(
        Number(year),
        Number(month),
      );
      const { income, expense } = await getIncomeExpense(
        Number(year),
        Number(month),
      );
      setIncome(income || 0);
      setExpense(expense || 0);
      setExpenseChartData(expenseChartData || []);
      setIncomeChartData(incomeChartData || []);
      setError(error || '');
      setIsloading(false);
    };

    setIsloading(true);
    fetchTrans();
  }, [year, month]);

  const expenseType = transactionType === TransactionType.Expense;

  const rawChartData = expenseType ? expenseChartData : incomeChartData;

  // Translate category keys to localized labels
  const chartData = rawChartData.map((item) => ({
    ...item,
    label: getLabel(item.label as TransactionCategory),
  }));

  const activeData = chartData[activeDataIndex as number];
  const activeRawData = rawChartData[activeDataIndex as number];

  //  Use the category key from raw data instead of searching by label
  const activeCategory = activeRawData?.label;

  const IconComponent = getIconByName(activeCategory as TransactionCategory);
  const labelColor = COLOR_MAP[activeCategory as TransactionCategory];

  if (error) {
    return (
      <Typography variant="h5" component="p" color="error" my="4">
        {error}
      </Typography>
    );
  }

  return (
    <Stack direction="column" alignItems="center">
      <MobileWarning />
      <Box sx={{ width: 'fit-content', marginBottom: 2 }}>
        <YearMonthSelect
          year={year}
          month={month}
          setYear={setYear}
          setMonth={setMonth}
          sx={{ marginBottom: 3 }}
        />
        <Stack direction="row" spacing={2} alignItems="center">
          <TransactionTypeButtonGroup
            size="medium"
            transactionType={transactionType}
            setTranasctionType={handleTranasctionTypeChange}
          />
          <ToggleButtonGroup
            value={chartType}
            exclusive
            onChange={handleChartTypeChange}
            size="medium"
          >
            <ToggleButton value="pie">
              <PieChartIcon />
            </ToggleButton>
            <ToggleButton value="bar">
              <BarChartIcon />
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Box>

      {isLoading && <CircularProgress sx={{ my: 5 }} />}

      {!isLoading && !!chartData.length ? (
        <Box>
          {activeData ? (
            <Box>
              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: labelColor }}>
                    {IconComponent && <IconComponent />}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  sx={{ flex: '0 1 auto' }}
                  primary={activeData?.label as string}
                />
                <ListItemText
                  sx={{
                    marginLeft: 1,
                  }}
                  primary={`${Math.abs(activeData.value)} ${CURRENCY_SYMBOL_MAP[settings.defaultCurrency]}`}
                />
              </ListItem>
            </Box>
          ) : (
            <ListItem sx={{ minHeight: 56 }}>
              <ListItemAvatar>
                <Avatar>
                  <QuestionMarkIcon />
                </Avatar>
              </ListItemAvatar>
              <FormattedMessage
                id="stats.clickToSeeInfo"
                defaultMessage="Click on chart to see the info"
              />
            </ListItem>
          )}
          <AdditionalBalanceInfo
            income={income}
            expense={expense}
            sx={{ paddingLeft: 2 }}
          />
          {chartType === 'pie' ? (
            <PieChart
              margin={{ right: 3 }}
              slotProps={{
                legend: {
                  hidden: isExtraSmall || isSmall,
                  direction: 'column',
                  position: {
                    vertical: 'top',
                    horizontal: 'right',
                  },
                },
              }}
              series={[
                {
                  cx,
                  cy,
                  innerRadius,
                  outerRadius,
                  data: chartData,
                  paddingAngle: 1,
                  cornerRadius: 5,
                },
              ]}
              width={width}
              height={height}
              onItemClick={handleItemClick}
            />
          ) : (
            <BarChart
              margin={{ top: 20, right: 50, left: 40, bottom: 130 }}
              series={[
                {
                  data: chartData.map((item) => item.value),
                  color:
                    transactionType === TransactionType.Income
                      ? green[500]
                      : blue[500],
                },
              ]}
              xAxis={[
                {
                  data: chartData.map((item) => item.label),
                  scaleType: 'band',
                  tickLabelStyle: {
                    angle: 45,
                    textAnchor: 'start',
                  },
                },
              ]}
              width={width}
              height={height}
              onAxisClick={handleItemClick}
            />
          )}
        </Box>
      ) : (
        !isLoading && (
          <Typography variant="h6" color="textSecondary">
            {formatMessage({
              id: 'stats.noDataForMonth',
              defaultMessage:
                'No transactions available for the selected month.',
            })}
          </Typography>
        )
      )}
    </Stack>
  );
};

export default Stats;

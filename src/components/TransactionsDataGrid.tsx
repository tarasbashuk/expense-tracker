'use client';
import { FC, useMemo, useState, MouseEvent } from 'react';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Tooltip,
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  gridDateComparator,
  GridFooter,
  gridPaginatedVisibleSortedGridRowEntriesSelector,
  useGridApiContext,
} from '@mui/x-data-grid';
import { Transaction, TransactionType } from '@prisma/client';
import { format } from 'date-fns';
import MenuIcon from '@mui/icons-material/Menu';
import RepeatIcon from '@mui/icons-material/Repeat';
import { useIntl } from 'react-intl';

import { CURRENCY_SYMBOL_MAP } from '@/constants/constants';
import { TransactionCategory } from '@/constants/types';
import { getTransactionSign, formatDate } from '@/lib/utils';
import { useSettings } from '@/context/SettingsContexts';
import { Locale } from '@/locales';
import MobileWarning from './shared/MobileWarning';
import { useCategoryI18n } from '@/lib/useCategoryI18n';

interface TransactionsDataGridProps {
  rows: Transaction[];
  /* eslint-disable no-unused-vars*/
  handleCopy: (id: string) => void;
  handleEdit: (id: string) => void;
  handleDelete: (id: string) => void;
  /* eslint-enable */
}

interface ActionMenuProps {
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const CurrentSum = () => {
  let income = 0;
  let expense = 0;
  const apiRef = useGridApiContext();
  const { settings } = useSettings();
  const { formatMessage } = useIntl();
  const currentRows = gridPaginatedVisibleSortedGridRowEntriesSelector(apiRef);
  const currencySymbol = CURRENCY_SYMBOL_MAP[settings?.defaultCurrency];

  currentRows.forEach(({ model }) => {
    if (model.type === TransactionType.Income) {
      income += model.amountDefaultCurrency;
    } else {
      expense += model.amountDefaultCurrency;
    }
  });

  return (
    <Box
      sx={{
        position: 'absolute',
        top: '0.25rem',
        left: '0.5rem',
      }}
    >
      <Typography variant="body1" sx={{ fontWeight: 600 }}>
        {formatMessage({
          id: 'incomeExpense.income',
          defaultMessage: 'Income',
        })}
        : {income.toFixed(2)} {currencySymbol}
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: 600 }}>
        {formatMessage({
          id: 'incomeExpense.expense',
          defaultMessage: 'Expense',
        })}
        : {expense.toFixed(2)} {currencySymbol}
      </Typography>
    </Box>
  );
};

const DefaultCurrencyHeader = () => {
  const { settings } = useSettings();

  return `Amount, ${CURRENCY_SYMBOL_MAP[settings?.defaultCurrency]}`;
};

const ActionMenu: FC<ActionMenuProps> = ({ onCopy, onEdit, onDelete }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { formatMessage } = useIntl();

  const isOpen = Boolean(anchorEl);
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: '5px',
      }}
    >
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={isOpen}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'basic-button',
        }}
      >
        <MenuItem
          onClick={() => {
            onEdit();
            handleClose();
          }}
        >
          {formatMessage({ id: 'common.edit', defaultMessage: 'Edit' })}
        </MenuItem>
        <MenuItem
          onClick={() => {
            onCopy();
            handleClose();
          }}
        >
          {formatMessage({ id: 'common.copy', defaultMessage: 'Copy' })}
        </MenuItem>
        <MenuItem
          onClick={() => {
            onDelete();
            handleClose();
          }}
        >
          {formatMessage({ id: 'common.delete', defaultMessage: 'Delete' })}
        </MenuItem>
      </Menu>
      <IconButton
        color="inherit"
        aria-label="open drawer"
        onClick={handleClick}
      >
        <MenuIcon />
      </IconButton>
    </Box>
  );
};

const TransactionsDataGrid: FC<TransactionsDataGridProps> = ({
  rows,
  handleCopy,
  handleEdit,
  handleDelete,
}) => {
  const { formatMessage, locale } = useIntl();
  const { getLabel } = useCategoryI18n();
  const columns: GridColDef<Transaction>[] = useMemo(
    () => [
      {
        field: 'date',
        headerName: formatMessage({ id: 'grid.date', defaultMessage: 'Date' }),
        width: 130,
        sortComparator: (_v1, _v2, cellParams1, cellParams2) => {
          const row1 = cellParams1.api.getRow(cellParams1.id);
          const row2 = cellParams2.api.getRow(cellParams2.id);
          const val1 = row1.date;
          const val2 = row2.date;

          return gridDateComparator(val1, val2, cellParams1, cellParams2);
        },
        valueGetter: (date: string) => formatDate(date, locale as Locale),
      },
      {
        field: 'category',
        headerName: formatMessage({
          id: 'grid.category',
          defaultMessage: 'Category',
        }),
        width: 200,
        valueGetter: (category: TransactionCategory) => getLabel(category),
        // editable: true,
      },
      {
        field: 'text',
        headerName: formatMessage({
          id: 'grid.description',
          defaultMessage: 'Description',
        }),
        width: 260,
        // editable: true,
      },
      {
        field: 'isRecurring',
        headerName: formatMessage({
          id: 'grid.recurring',
          defaultMessage: 'Recurring',
        }),
        width: 80,
        align: 'center',
        headerAlign: 'center',
        sortable: false,
        renderCell: ({ row }) => {
          if (!row.isRecurring) return null;

          const recurringEndDateFormatted = row.recurringEndDate
            ? formatDate(new Date(row.recurringEndDate), locale as Locale)
            : null;
          const tooltip =
            formatMessage({
              id: 'grid.recurringTooltip',
              defaultMessage: 'Recurring transaction',
            }) +
            (recurringEndDateFormatted
              ? ` ${formatMessage({ id: 'grid.until', defaultMessage: 'until' })} ${recurringEndDateFormatted}`
              : ` (${formatMessage({ id: 'grid.infinite', defaultMessage: 'infinite' })})`);

          return (
            <Tooltip title={tooltip} arrow>
              <RepeatIcon
                sx={{
                  color: 'success.main',
                  fontSize: '1.2rem',
                  cursor: 'help',
                }}
              />
            </Tooltip>
          );
        },
      },
      {
        field: 'amount',
        headerName: formatMessage({
          id: 'grid.amount',
          defaultMessage: 'Amount',
        }),
        type: 'number',
        width: 100,
        align: 'left',
        sortable: false,
        headerAlign: 'left',
        valueGetter: (amount, row) => {
          const sign = getTransactionSign(row.type);

          return `${sign} ${Math.abs(amount)} ${CURRENCY_SYMBOL_MAP[row.currency]}`;
        },
        // editable: true,
      },
      {
        field: 'amountDefaultCurrency',
        renderHeader: () => <DefaultCurrencyHeader />,
        width: 100,
        sortComparator: (_v1, _v2, cellParams1, cellParams2) => {
          const row1 = cellParams1.api.getRow(cellParams1.id);
          const row2 = cellParams2.api.getRow(cellParams2.id);
          const val1 = row1.amountDefaultCurrency;
          const val2 = row2.amountDefaultCurrency;

          return val2 - val1;
        },
        valueGetter: (amount, row) => {
          const sign = getTransactionSign(row.type);

          return `${sign} ${Math.abs(amount!)}`;
        },
      },
      {
        field: 'type',
        headerName: formatMessage({ id: 'grid.type', defaultMessage: 'Type' }),
        width: 80,
        valueGetter: (type) => {
          return type;
        },
      },
      {
        field: 'Action menu',
        sortable: false,
        filterable: false,
        renderHeader: () => null,
        width: 40,
        align: 'center',
        renderCell: ({ row }) => {
          return (
            <ActionMenu
              onEdit={() => handleEdit(row.id)}
              onCopy={() => handleCopy(row.id)}
              onDelete={() => handleDelete(row.id)}
            />
          );
        },
      },
    ],
    [formatMessage, getLabel, handleEdit, handleCopy, handleDelete],
  );

  return (
    <>
      <MobileWarning />
      <Box
        sx={{
          height: 570,
          width: '100%',
          backgroundColor: 'background.paper',
          marginTop: 2,
        }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 10,
              },
            },
          }}
          pageSizeOptions={[10, 20, 50, 100]}
          disableRowSelectionOnClick
          slots={{
            footer: () => (
              <Box position="relative">
                <CurrentSum />
                <GridFooter />
              </Box>
            ),
          }}
        />
      </Box>
    </>
  );
};

export default TransactionsDataGrid;

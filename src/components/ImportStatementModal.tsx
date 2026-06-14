'use client';

import { useEffect, useMemo, useState } from 'react';
import { isSameMonth, isSameYear } from 'date-fns';
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  IconButton,
  LinearProgress,
  Modal,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { Currency } from '@prisma/client';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useIntl } from 'react-intl';
import { toast } from 'react-toastify';

import analyzeStatementScreenshots from '@/app/actions/analyzeStatementScreenshots';
import saveImportedTransaction from '@/app/actions/saveImportedTransaction';
import ImportStatementCandidateRow, {
  type ImportRow,
} from '@/components/ImportStatementCandidateRow';
import { useCurrencies } from '@/context/CurrenciesContext';
import { useSettings } from '@/context/SettingsContexts';
import { useTransactions } from '@/context/TranasctionsContext';
import { convertAmountToDefaultCurrency } from '@/lib/currency/convertAmountToDefaultCurrency';
import { compressImageFile } from '@/lib/image/compressImageFile';

const modalStyle = {
  position: 'absolute',
  top: { xs: 0, sm: '50%' },
  left: { xs: 0, sm: '50%' },
  transform: { xs: 'none', sm: 'translate(-50%, -50%)' },
  width: { xs: '100%', sm: '90%' },
  maxWidth: { xs: '100%', sm: 1200 },
  height: { xs: '100%', sm: 'auto' },
  maxHeight: { xs: '100%', sm: '88vh' },
  overflowY: 'auto',
  bgcolor: 'background.paper',
  border: 'none',
  borderRadius: { xs: 0, sm: 2 },
  boxShadow: 24,
  p: { xs: 2, sm: 3 },
};

type ImportStatementModalProps = {
  onClose: () => void;
};

type SelectedScreenshot = {
  id: string;
  file: File;
  previewUrl: string;
};

export default function ImportStatementModal({
  onClose,
}: ImportStatementModalProps) {
  const { formatMessage } = useIntl();
  const {
    settings: { defaultCurrency },
  } = useSettings();
  const { currencies } = useCurrencies();
  const { transactions, setTransactions } = useTransactions();
  const [screenshots, setScreenshots] = useState<SelectedScreenshot[]>([]);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [savingRowIndex, setSavingRowIndex] = useState<number | null>(null);
  const [showIgnoredRows, setShowIgnoredRows] = useState(false);

  const referenceDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const visibleRows = useMemo(
    () =>
      rows
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => showIgnoredRows || row.status !== 'ignored'),
    [rows, showIgnoredRows],
  );
  const ignoredRowsCount = useMemo(
    () => rows.filter((row) => row.status === 'ignored').length,
    [rows],
  );

  useEffect(
    () => () => {
      screenshots.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
    },
    [screenshots],
  );

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files || []);
    const compressedFiles = await Promise.all(files.map(compressImageFile));
    const nextScreenshots = compressedFiles.map((file) => ({
      id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setScreenshots((current) => [...current, ...nextScreenshots]);
    setRows([]);
    setWarnings([]);
    setError('');
    event.target.value = '';
  };

  const handleRemoveScreenshot = (id: string) => {
    setScreenshots((current) => {
      const screenshot = current.find((item) => item.id === id);

      if (screenshot) {
        URL.revokeObjectURL(screenshot.previewUrl);
      }

      return current.filter((item) => item.id !== id);
    });
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError('');
    setWarnings([]);
    setRows([]);

    try {
      const formData = new FormData();
      formData.set('referenceDate', referenceDate);
      screenshots.forEach(({ file }) => {
        formData.append('screenshots', file);
      });

      const result = await analyzeStatementScreenshots(formData);

      if (result.error) {
        setError(result.error);
      } else {
        setRows(
          (result.rows || []).map((row, index) => ({
            ...row,
            amountDefaultCurrency: calculateAmountDefaultCurrency(
              row.amount,
              row.currency,
            ),
            id: `${row.sourceImageIndex}-${row.date || 'no-date'}-${row.amount || 'no-amount'}-${index}`,
            isCreditTransaction: false,
          })),
        );
        setWarnings(result.warnings || []);
      }
    } catch (error) {
      console.error('Smart import analyze failed:', error);
      setError(
        formatMessage({
          id: 'importStatement.analyzeFailed',
          defaultMessage:
            'Unable to analyze these images. Try fewer or smaller screenshots.',
        }),
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateRow = (
    id: string,
    updater: (_row: ImportRow) => ImportRow,
  ) => {
    setRows((current) =>
      current.map((row) => (row.id === id ? updater(row) : row)),
    );
  };

  const calculateAmountDefaultCurrency = (
    amount: number | null,
    currency: Currency | null,
  ) => {
    if (!amount || !currency) return null;

    return (
      convertAmountToDefaultCurrency({
        amount,
        fromCurrency: currency,
        defaultCurrency,
        currenciesMap: currencies,
      }) || null
    );
  };

  const handleRowTextChange = (id: string, text: string) => {
    updateRow(id, (row) => ({ ...row, text }));
  };

  const handleRowCurrencyChange = (id: string, currency: Currency) => {
    updateRow(id, (row) => ({
      ...row,
      currency,
      amountDefaultCurrency: calculateAmountDefaultCurrency(
        row.amount,
        currency,
      ),
    }));
  };

  const handleRowCategoryChange = (id: string, category: string) => {
    updateRow(id, (row) => ({ ...row, category }));
  };

  const handleRowIsCreditTransactionChange = (
    id: string,
    isCreditTransaction: boolean,
  ) => {
    updateRow(id, (row) => ({ ...row, isCreditTransaction }));
  };

  const handleRowAmountDefaultCurrencyChange = (
    id: string,
    amountDefaultCurrency: number | null,
  ) => {
    updateRow(id, (row) => ({ ...row, amountDefaultCurrency }));
  };

  const handleSaveRow = async (index: number) => {
    const row = rows[index];

    setSavingRowIndex(index);
    const result = await saveImportedTransaction({
      date: row.date,
      text: row.text,
      amount: row.amount,
      amountDefaultCurrency: row.amountDefaultCurrency,
      currency: row.currency,
      type: row.type,
      category: row.category,
      isCreditTransaction: row.isCreditTransaction,
    });

    if (result.error) {
      toast.error(result.error);
    } else if (result.data) {
      toast.success(
        formatMessage({
          id: 'importStatement.saved',
          defaultMessage: 'Imported transaction saved',
        }),
      );
      setRows((current) =>
        current.map((currentRow, rowIndex) =>
          rowIndex === index ? { ...currentRow, status: 'saved' } : currentRow,
        ),
      );

      const firstTransactionDate = transactions[0]?.date;
      const isCurrentListTransaction =
        !firstTransactionDate ||
        (isSameMonth(result.data.date, firstTransactionDate) &&
          isSameYear(result.data.date, firstTransactionDate));

      if (isCurrentListTransaction) {
        setTransactions((currentTransactions) => {
          const existingIndex = currentTransactions.findIndex(
            (transaction) => transaction.id === result.data?.id,
          );
          const updatedTransactions =
            existingIndex === -1
              ? [result.data!, ...currentTransactions]
              : [
                  ...currentTransactions.slice(0, existingIndex),
                  result.data!,
                  ...currentTransactions.slice(existingIndex + 1),
                ];

          return updatedTransactions.sort(
            (left, right) =>
              new Date(right.date).getTime() - new Date(left.date).getTime(),
          );
        });
      }
    }

    setSavingRowIndex(null);
  };

  return (
    <Modal
      open
      onClose={(_, reason) => {
        if (reason === 'backdropClick') {
          return;
        }

        onClose();
      }}
    >
      <Box sx={modalStyle}>
        <Stack direction="row" alignItems="center" spacing={2} mb={2}>
          <Typography variant="h4" component="h3" flexGrow={1}>
            {formatMessage({
              id: 'importStatement.title',
              defaultMessage: 'Smart import',
            })}
          </Typography>
          <IconButton aria-label="close" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>

        <Stack spacing={2}>
          <Alert severity="info">
            {formatMessage({
              id: 'importStatement.previewOnly',
              defaultMessage:
                'Analyze screenshots, review suggested rows, then save the transactions you want to keep.',
            })}
          </Alert>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button
              component="label"
              variant="contained"
              startIcon={<UploadFileIcon />}
              disabled={isAnalyzing}
            >
              {formatMessage({
                id: 'importStatement.chooseScreenshots',
                defaultMessage: 'Choose screenshots',
              })}
              <input
                hidden
                multiple
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleFileChange}
              />
            </Button>
            <Button
              variant="outlined"
              startIcon={<ImageSearchIcon />}
              disabled={!screenshots.length || isAnalyzing}
              onClick={handleAnalyze}
            >
              {formatMessage({
                id: 'importStatement.analyze',
                defaultMessage: 'Analyze',
              })}
            </Button>
          </Stack>

          {!!screenshots.length && (
            <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>
              {screenshots.map(({ id, previewUrl, file }, index) => (
                <Box
                  key={id}
                  sx={{
                    position: 'relative',
                    flex: '0 0 96px',
                    width: 96,
                    height: 128,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    overflow: 'hidden',
                    bgcolor: 'background.default',
                  }}
                >
                  <Box
                    component="img"
                    src={previewUrl}
                    alt={`${file.name} ${index + 1}`}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                  <IconButton
                    size="small"
                    aria-label="remove screenshot"
                    onClick={() => handleRemoveScreenshot(id)}
                    disabled={isAnalyzing}
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      bgcolor: 'background.paper',
                      '&:hover': { bgcolor: 'background.paper' },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          )}

          {isAnalyzing && <LinearProgress />}

          {error && <Alert severity="error">{error}</Alert>}

          {warnings.map((warning) => (
            <Alert key={warning} severity="warning">
              {warning}
            </Alert>
          ))}

          {!!rows.length && (
            <Stack spacing={1.5}>
              <Typography variant="h6">
                {formatMessage(
                  {
                    id: 'importStatement.results',
                    defaultMessage: 'Review results ({count})',
                  },
                  { count: visibleRows.length },
                )}
              </Typography>
              {!!ignoredRowsCount && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={showIgnoredRows}
                      onChange={(event) =>
                        setShowIgnoredRows(event.target.checked)
                      }
                    />
                  }
                  label={formatMessage(
                    {
                      id: 'importStatement.showIgnored',
                      defaultMessage: 'Show ignored rows ({count})',
                    },
                    { count: ignoredRowsCount },
                  )}
                />
              )}

              {visibleRows.map(({ row, index }) => (
                <ImportStatementCandidateRow
                  key={row.id}
                  row={row}
                  isSaving={savingRowIndex === index}
                  onTextChange={(text) => handleRowTextChange(row.id, text)}
                  onCurrencyChange={(currency) =>
                    handleRowCurrencyChange(row.id, currency)
                  }
                  onCategoryChange={(category) =>
                    handleRowCategoryChange(row.id, category)
                  }
                  onIsCreditTransactionChange={(isCreditTransaction) =>
                    handleRowIsCreditTransactionChange(
                      row.id,
                      isCreditTransaction,
                    )
                  }
                  onAmountDefaultCurrencyChange={(amountDefaultCurrency) =>
                    handleRowAmountDefaultCurrencyChange(
                      row.id,
                      amountDefaultCurrency,
                    )
                  }
                  onSave={() => handleSaveRow(index)}
                />
              ))}
            </Stack>
          )}
        </Stack>
      </Box>
    </Modal>
  );
}

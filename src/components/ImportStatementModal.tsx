'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
import DocumentScannerIcon from '@mui/icons-material/DocumentScanner';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
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

type SelectedImportFile = {
  id: string;
  file: File;
  previewUrl: string | null;
};

export default function ImportStatementModal({
  onClose,
}: ImportStatementModalProps) {
  const { formatMessage } = useIntl();
  const {
    settings: { defaultCurrency },
  } = useSettings();
  const { currencies } = useCurrencies();
  const { transactions, setTransactions, requestTransactionsRefresh } =
    useTransactions();
  const [selectedFiles, setSelectedFiles] = useState<SelectedImportFile[]>([]);
  const selectedFilesRef = useRef<SelectedImportFile[]>([]);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [savingRowIndex, setSavingRowIndex] = useState<number | null>(null);
  const [showIgnoredRows, setShowIgnoredRows] = useState(false);

  const referenceDate = useMemo(
    () => new Date().toISOString().slice(0, 10),
    [],
  );
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

  useEffect(() => {
    selectedFilesRef.current = selectedFiles;
  }, [selectedFiles]);

  useEffect(
    () => () => {
      selectedFilesRef.current.forEach(({ previewUrl }) => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
      });
    },
    [],
  );

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files || []);
    const preparedFiles = await Promise.all(files.map(compressImageFile));
    const nextFiles = preparedFiles.map((file) => ({
      id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
      file,
      previewUrl: file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : null,
    }));

    setSelectedFiles((current) => [...current, ...nextFiles]);
    setRows([]);
    setWarnings([]);
    setError('');
    event.target.value = '';
  };

  const handleRemoveFile = (id: string) => {
    setSelectedFiles((current) => {
      const selectedFile = current.find((item) => item.id === id);

      if (selectedFile?.previewUrl) {
        URL.revokeObjectURL(selectedFile.previewUrl);
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
      selectedFiles.forEach(({ file }) => {
        formData.append('files', file);
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
            id: `${row.sourceFileIndex}-${row.date || 'no-date'}-${row.amount || 'no-amount'}-${index}`,
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
            'Unable to analyze these files. Try fewer or smaller files.',
        }),
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateRow = (id: string, updater: (_row: ImportRow) => ImportRow) => {
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

  const handleRowDateChange = (id: string, date: string) => {
    updateRow(id, (row) => ({ ...row, date: date || null }));
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
    try {
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
            rowIndex === index
              ? { ...currentRow, status: 'saved' }
              : currentRow,
          ),
        );

        const savedTransaction = result.data;
        const firstTransactionDate = transactions[0]?.date;
        const isCurrentListTransaction =
          !firstTransactionDate ||
          (isSameMonth(savedTransaction.date, firstTransactionDate) &&
            isSameYear(savedTransaction.date, firstTransactionDate));

        if (isCurrentListTransaction) {
          setTransactions((currentTransactions) => {
            const existingIndex = currentTransactions.findIndex(
              (transaction) => transaction.id === savedTransaction.id,
            );
            const updatedTransactions =
              existingIndex === -1
                ? [savedTransaction, ...currentTransactions]
                : [
                    ...currentTransactions.slice(0, existingIndex),
                    savedTransaction,
                    ...currentTransactions.slice(existingIndex + 1),
                  ];

            return updatedTransactions.sort(
              (left, right) =>
                new Date(right.date).getTime() - new Date(left.date).getTime(),
            );
          });
        }
        requestTransactionsRefresh();
      }
    } catch (error) {
      console.error('Smart import save failed:', error);
      toast.error(
        formatMessage({
          id: 'importStatement.saveFailed',
          defaultMessage: 'Unable to save this transaction. Please try again.',
        }),
      );
    } finally {
      setSavingRowIndex(null);
    }
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
                'Analyze bank statements, screenshots, or receipts, review suggested rows, then save the transactions you want to keep.',
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
                id: 'importStatement.chooseFiles',
                defaultMessage: 'Choose files',
              })}
              <input
                hidden
                multiple
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                onChange={handleFileChange}
              />
            </Button>
            <Button
              variant="outlined"
              startIcon={<DocumentScannerIcon />}
              disabled={!selectedFiles.length || isAnalyzing}
              onClick={handleAnalyze}
            >
              {formatMessage({
                id: 'importStatement.analyze',
                defaultMessage: 'Analyze',
              })}
            </Button>
          </Stack>

          {!!selectedFiles.length && (
            <Stack
              direction="row"
              spacing={1}
              sx={{ overflowX: 'auto', pb: 1 }}
            >
              {selectedFiles.map(({ id, previewUrl, file }, index) => (
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
                  {previewUrl ? (
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
                  ) : (
                    <Stack
                      alignItems="center"
                      justifyContent="center"
                      spacing={0.5}
                      sx={{ width: '100%', height: '100%', px: 1 }}
                    >
                      <PictureAsPdfIcon color="error" sx={{ fontSize: 40 }} />
                      <Typography
                        variant="caption"
                        textAlign="center"
                        sx={{
                          width: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {file.name}
                      </Typography>
                    </Stack>
                  )}
                  <IconButton
                    size="small"
                    aria-label="remove file"
                    onClick={() => handleRemoveFile(id)}
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

          {warnings.map((warning, index) => (
            <Alert key={`${index}-${warning}`} severity="warning">
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
                  onDateChange={(date) => handleRowDateChange(row.id, date)}
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

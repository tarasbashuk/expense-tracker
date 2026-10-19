'use client';
import { AddIcon, AutoAwesomeIcon } from '@/components/shared/icons';

import { useState } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Button, Box, Stack } from '@mui/material';
import { useIntl } from 'react-intl';
import { useTransactions } from '@/context/TranasctionsContext';
import ImportStatementModal from '../ImportStatementModal';

export default function HistoryHeaderActions() {
  const [importOpen, setImportOpen] = useState(false);
  const { formatMessage } = useIntl();
  const {
    setTransactionId,
    setTransactionDraft,
    setIsCopyTransactionFlow,
    setIsTransactionModalOpen,
  } = useTransactions();

  const addTransaction = () => {
    setTransactionId(null);
    setTransactionDraft(null);
    setIsCopyTransactionFlow(false);
    setIsTransactionModalOpen(true);
  };

  return (
    <>
      <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
        <Button
          aria-label={formatMessage({ id: 'navigation.import' })}
          onClick={() => setImportOpen(true)}
          sx={{
            minWidth: 44,
            px: { xs: 0, sm: 2 },
            gap: 1,
            whiteSpace: 'nowrap',
            height: 44,
            borderRadius: '12px',
            bgcolor: '#EEE8FF',
            color: '#7526C8',
          }}
        >
          <AutoAwesomeIcon />
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
            Smart import
          </Box>
        </Button>
        <Button
          aria-label={formatMessage({ id: 'addTransaction.title' })}
          onClick={addTransaction}
          sx={{
            minWidth: 44,
            px: { xs: 0, sm: 2 },
            gap: 1,
            whiteSpace: 'nowrap',
            height: 44,
            borderRadius: '12px',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': { bgcolor: 'primary.dark' },
          }}
        >
          <AddIcon />
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
            {formatMessage({ id: 'home.newTransaction' })}
          </Box>
        </Button>
      </Stack>
      {importOpen && (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <ImportStatementModal onClose={() => setImportOpen(false)} />
        </LocalizationProvider>
      )}
    </>
  );
}

'use client';

import { useState } from 'react';
import { IconButton, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
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
      <Stack direction="row" spacing={1}>
        <IconButton
          aria-label={formatMessage({ id: 'navigation.import' })}
          onClick={() => setImportOpen(true)}
          sx={{
            width: 44,
            height: 44,
            borderRadius: '12px',
            bgcolor: '#EEE8FF',
            color: '#7526C8',
          }}
        >
          <AutoAwesomeIcon />
        </IconButton>
        <IconButton
          aria-label={formatMessage({ id: 'addTransaction.title' })}
          onClick={addTransaction}
          sx={{
            width: 44,
            height: 44,
            borderRadius: '12px',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': { bgcolor: 'primary.dark' },
          }}
        >
          <AddIcon />
        </IconButton>
      </Stack>
      {importOpen && (
        <ImportStatementModal onClose={() => setImportOpen(false)} />
      )}
    </>
  );
}

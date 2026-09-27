'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Transaction } from '@prisma/client';
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useIntl } from 'react-intl';
import { toast } from 'react-toastify';

import { saveQuickTransactionTemplate } from '@/app/actions/quickTransactionTemplates';
import { formatCurrency } from '@/lib/formatCurrency';

export default function SaveTransactionTemplate({
  transaction,
  onClose,
}: {
  transaction: Transaction;
  onClose: () => void;
}) {
  const { formatMessage } = useIntl();
  const router = useRouter();
  const [label, setLabel] = useState(transaction.text.slice(0, 40));
  const [text, setText] = useState(transaction.text);
  const [includeAmount, setIncludeAmount] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const title = formatMessage({
    id: 'template.fromTransaction',
    defaultMessage: 'Save as shortcut',
  });

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const result = await saveQuickTransactionTemplate({
        label,
        text,
        amount: includeAmount ? transaction.amount : undefined,
        category: transaction.category,
        currency: transaction.currency,
        type: transaction.type,
      });

      if (result.error || !result.template) {
        setError(
          result.error ||
            formatMessage({
              id: 'template.saveError',
              defaultMessage: 'Unable to save shortcut. Please try again.',
            }),
        );

        return;
      }

      toast.success(
        formatMessage({
          id: 'template.saved',
          defaultMessage: 'Shortcut added to your home screen',
        }),
      );
      onClose();
      router.refresh();
    } catch {
      setError(
        formatMessage({
          id: 'template.saveError',
          defaultMessage: 'Unable to save shortcut. Please try again.',
        }),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onClose={() => {
        if (!saving) onClose();
      }}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Typography variant="body2" color="text.secondary">
            {formatMessage({
              id: 'template.fromTransactionHint',
              defaultMessage:
                'The shortcut keeps this transaction’s category, currency and type. Dates and recurring payments are not copied.',
            })}
          </Typography>
          <TextField
            autoFocus
            required
            label={formatMessage({
              id: 'home.templateLabel',
              defaultMessage: 'Button name',
            })}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            inputProps={{ maxLength: 40 }}
            disabled={saving}
          />
          <TextField
            required
            label={formatMessage({
              id: 'addTransaction.text',
              defaultMessage: 'Text',
            })}
            value={text}
            onChange={(event) => setText(event.target.value)}
            inputProps={{ maxLength: 160 }}
            error={text.length > 160}
            helperText={
              text.length > 160
                ? formatMessage({
                    id: 'template.descriptionTooLong',
                    defaultMessage:
                      'Shorten the description to 160 characters.',
                  })
                : undefined
            }
            disabled={saving}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={includeAmount}
                onChange={(event) => setIncludeAmount(event.target.checked)}
                disabled={saving}
              />
            }
            label={formatMessage(
              {
                id: 'template.includeAmount',
                defaultMessage: 'Keep amount: {amount}',
              },
              {
                amount: formatCurrency(
                  transaction.amount,
                  transaction.currency,
                ),
              },
            )}
          />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose()} disabled={saving}>
          {formatMessage({ id: 'common.cancel', defaultMessage: 'Cancel' })}
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={
            saving || !label.trim() || !text.trim() || text.length > 160
          }
        >
          {formatMessage({ id: 'common.save', defaultMessage: 'Save' })}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

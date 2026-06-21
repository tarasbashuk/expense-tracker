'use client';

import { useEffect, useState } from 'react';
import {
  Currency,
  QuickTransactionTemplate,
  TransactionType,
} from '@prisma/client';
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SettingsIcon from '@mui/icons-material/Settings';
import { toast } from 'react-toastify';
import { useIntl } from 'react-intl';

import {
  deleteQuickTransactionTemplate,
  QuickTransactionTemplateInput,
  reorderQuickTransactionTemplates,
  saveQuickTransactionTemplate,
} from '@/app/actions/quickTransactionTemplates';
import {
  getExpenseCategoriesList,
  getIncomeCategoriesList,
} from '@/constants/constants';
import { TransactionCategory } from '@/constants/types';
import { useSettings } from '@/context/SettingsContexts';
import { useTransactions } from '@/context/TranasctionsContext';
import { formatCurrency } from '@/lib/formatCurrency';
import { getIconByName } from '@/lib/getCategoryIcon';
import { useCategoryI18n } from '@/lib/useCategoryI18n';
import CurrencySelect from '@/components/CurrencySelect';
import TransactionTypeButtonGroup from '@/components/shared/TransactionTypeButtonGroup';

type EditorProps = {
  open: boolean;
  template: QuickTransactionTemplate | null;
  onClose: () => void;
  onSaved: (_template: QuickTransactionTemplate) => void;
};

function TemplateEditorDialog({
  open,
  template,
  onClose,
  onSaved,
}: EditorProps) {
  const { formatMessage } = useIntl();
  const { getLabel } = useCategoryI18n();
  const {
    settings: { defaultCurrency, creditCardTrackingEnabled },
  } = useSettings();
  const [label, setLabel] = useState('');
  const [text, setText] = useState('');
  const [amount, setAmount] = useState<number | undefined>();
  const [category, setCategory] = useState('');
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [type, setType] = useState<TransactionType>(TransactionType.Expense);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLabel(template?.label || '');
    setText(template?.text || '');
    setAmount(template?.amount ?? undefined);
    setCategory(template?.category || '');
    setCurrency(template?.currency || defaultCurrency);
    setType(template?.type || TransactionType.Expense);
  }, [defaultCurrency, open, template]);

  const categories =
    type === TransactionType.Income
      ? getIncomeCategoriesList(creditCardTrackingEnabled)
      : getExpenseCategoriesList(creditCardTrackingEnabled);

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);
    setCategory('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    const input: QuickTransactionTemplateInput = {
      id: template?.id,
      label,
      text,
      amount,
      category,
      currency,
      type,
    };
    const result = await saveQuickTransactionTemplate(input);
    setIsSaving(false);

    if (result.error) {
      toast.error(result.error);

      return;
    }
    if (result.template) {
      onSaved(result.template);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        if (reason === 'backdropClick') return;

        onClose();
      }}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle sx={{ position: 'relative', pr: 6 }}>
        {formatMessage({
          id: template ? 'home.editQuickTemplate' : 'home.addQuickTemplate',
          defaultMessage: template
            ? 'Edit quick transaction'
            : 'Add quick transaction',
        })}
        <IconButton
          aria-label={formatMessage({
            id: 'common.close',
            defaultMessage: 'Close',
          })}
          onClick={onClose}
          disabled={isSaving}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} mt={1}>
          <TextField
            label={formatMessage({
              id: 'home.templateLabel',
              defaultMessage: 'Button name',
            })}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            inputProps={{ maxLength: 40 }}
            required
          />
          <TransactionTypeButtonGroup
            size="small"
            transactionType={type}
            setTranasctionType={handleTypeChange}
          />
          <FormControl fullWidth>
            <InputLabel>
              {formatMessage({
                id: 'addTransaction.category',
                defaultMessage: 'Category',
              })}
            </InputLabel>
            <Select
              value={category}
              label={formatMessage({
                id: 'addTransaction.category',
                defaultMessage: 'Category',
              })}
              onChange={(event) => setCategory(event.target.value)}
            >
              {categories.map(({ value }) => (
                <MenuItem key={value} value={value}>
                  {getLabel(value as TransactionCategory)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <CurrencySelect
            value={currency}
            onChange={(event: SelectChangeEvent) =>
              setCurrency(event.target.value as Currency)
            }
          />
          <TextField
            label={formatMessage({
              id: 'addTransaction.text',
              defaultMessage: 'Text',
            })}
            value={text}
            onChange={(event) => setText(event.target.value)}
            inputProps={{ maxLength: 160 }}
            required
          />
          <TextField
            label={formatMessage({
              id: 'home.optionalAmount',
              defaultMessage: 'Amount (optional)',
            })}
            type="number"
            value={amount ?? ''}
            onChange={(event) =>
              setAmount(
                event.target.value === ''
                  ? undefined
                  : Number(event.target.value),
              )
            }
            inputProps={{ min: 0.01, step: 0.01 }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={isSaving}>
          {formatMessage({ id: 'common.cancel', defaultMessage: 'Cancel' })}
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving || !label.trim() || !text.trim() || !category}
        >
          {formatMessage({ id: 'common.save', defaultMessage: 'Save' })}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function QuickTransactions({
  initialTemplates,
}: {
  initialTemplates: QuickTransactionTemplate[];
}) {
  const { formatMessage } = useIntl();
  const [templates, setTemplates] = useState(initialTemplates);
  const [managerOpen, setManagerOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<QuickTransactionTemplate | null>(null);
  const {
    setTransactionDraft,
    setTransactionId,
    setIsCopyTransactionFlow,
    setIsTransactionModalOpen,
  } = useTransactions();

  const openTransaction = (template?: QuickTransactionTemplate) => {
    setTransactionId(null);
    setIsCopyTransactionFlow(false);
    setTransactionDraft(
      template
        ? {
            text: template.text,
            amount: template.amount ?? undefined,
            category: template.category,
            currency: template.currency,
            type: template.type,
          }
        : null,
    );
    setIsTransactionModalOpen(true);
  };

  const openEditor = (template: QuickTransactionTemplate | null) => {
    setEditingTemplate(template);
    setEditorOpen(true);
  };

  const handleSaved = (savedTemplate: QuickTransactionTemplate) => {
    setTemplates((current) => {
      const index = current.findIndex(({ id }) => id === savedTemplate.id);
      if (index === -1) return [...current, savedTemplate];

      return current.map((template) =>
        template.id === savedTemplate.id ? savedTemplate : template,
      );
    });
  };

  const handleDelete = async (template: QuickTransactionTemplate) => {
    if (
      !window.confirm(
        formatMessage(
          {
            id: 'home.deleteTemplateConfirm',
            defaultMessage: 'Delete “{name}”?',
          },
          { name: template.label },
        ),
      )
    ) {
      return;
    }
    const result = await deleteQuickTransactionTemplate(template.id);
    if (result.error) {
      toast.error(result.error);

      return;
    }
    setTemplates((current) => current.filter(({ id }) => id !== template.id));
  };

  const moveTemplate = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= templates.length) return;
    const previous = templates;
    const reordered = [...templates];
    [reordered[index], reordered[targetIndex]] = [
      reordered[targetIndex],
      reordered[index],
    ];
    setTemplates(reordered);
    const result = await reorderQuickTransactionTemplates(
      reordered.map(({ id }) => id),
    );
    if (result.error) {
      setTemplates(previous);
      toast.error(result.error);
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h6">
            {formatMessage({
              id: 'home.quickTransactions',
              defaultMessage: 'Quick transactions',
            })}
          </Typography>
          <Tooltip
            title={formatMessage({
              id: 'home.manageQuickTransactions',
              defaultMessage: 'Manage quick transactions',
            })}
          >
            <IconButton
              aria-label={formatMessage({
                id: 'home.manageQuickTransactions',
                defaultMessage: 'Manage quick transactions',
              })}
              onClick={() => setManagerOpen(true)}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        <Stack direction="row" gap={1} flexWrap="wrap">
          {templates.map((template) => {
            const Icon = getIconByName(
              template.category as TransactionCategory,
            );

            return (
              <Button
                key={template.id}
                variant="outlined"
                startIcon={<Icon />}
                onClick={() => openTransaction(template)}
              >
                {template.label}
                {template.amount != null &&
                  ` · ${formatCurrency(template.amount, template.currency)}`}
              </Button>
            );
          })}
          <Button startIcon={<AddIcon />} onClick={() => openTransaction()}>
            {formatMessage({
              id: 'home.newTransaction',
              defaultMessage: 'New transaction',
            })}
          </Button>
          {!templates.length && (
            <Button variant="text" onClick={() => openEditor(null)}>
              {formatMessage({
                id: 'home.createFirstTemplate',
                defaultMessage: 'Create your first shortcut',
              })}
            </Button>
          )}
        </Stack>

        <Dialog
          open={managerOpen}
          onClose={(_, reason) => {
            if (reason === 'backdropClick') return;

            setManagerOpen(false);
          }}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle sx={{ position: 'relative', pr: 6 }}>
            {formatMessage({
              id: 'home.manageQuickTransactions',
              defaultMessage: 'Manage quick transactions',
            })}
            <IconButton
              aria-label={formatMessage({
                id: 'common.close',
                defaultMessage: 'Close',
              })}
              onClick={() => setManagerOpen(false)}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {!templates.length ? (
              <Typography color="text.secondary">
                {formatMessage({
                  id: 'home.noQuickTemplates',
                  defaultMessage: 'No shortcuts yet',
                })}
              </Typography>
            ) : (
              <List>
                {templates.map((template, index) => (
                  <ListItem
                    key={template.id}
                    disableGutters
                    sx={{
                      alignItems: { xs: 'stretch', sm: 'center' },
                      flexDirection: { xs: 'column', sm: 'row' },
                    }}
                  >
                    <ListItemText
                      primary={template.label}
                      secondary={template.text}
                      sx={{ minWidth: 0, mr: { sm: 1 } }}
                    />
                    <Stack direction="row" alignSelf="flex-end">
                      <IconButton
                        aria-label="Move up"
                        disabled={index === 0}
                        onClick={() => moveTemplate(index, -1)}
                      >
                        <ArrowUpwardIcon />
                      </IconButton>
                      <IconButton
                        aria-label="Move down"
                        disabled={index === templates.length - 1}
                        onClick={() => moveTemplate(index, 1)}
                      >
                        <ArrowDownwardIcon />
                      </IconButton>
                      <IconButton
                        aria-label="Edit"
                        onClick={() => openEditor(template)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        aria-label="Delete"
                        onClick={() => handleDelete(template)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </ListItem>
                ))}
              </List>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => openEditor(null)} startIcon={<AddIcon />}>
              {formatMessage({
                id: 'home.addQuickTemplate',
                defaultMessage: 'Add quick transaction',
              })}
            </Button>
            <Button onClick={() => setManagerOpen(false)}>
              {formatMessage({ id: 'common.close', defaultMessage: 'Close' })}
            </Button>
          </DialogActions>
        </Dialog>

        <TemplateEditorDialog
          open={editorOpen}
          template={editingTemplate}
          onClose={() => setEditorOpen(false)}
          onSaved={handleSaved}
        />
      </CardContent>
    </Card>
  );
}

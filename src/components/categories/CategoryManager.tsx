'use client';

import { useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  DialogActions,
  DialogContent,
  IconButton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { Archive, ArchiveRestore, Pencil, Plus } from 'lucide-react';
import { useIntl } from 'react-intl';
import { TransactionType } from '@prisma/client';
import {
  archiveCustomCategory,
  saveCustomCategory,
} from '@/app/actions/customCategories';
import {
  CATEGORY_ICON_KEYS,
  type CategoryRecord,
} from '@/lib/customCategories';
import { useCategoryCatalog } from './useCategoryCatalog';
import { getCustomCategoryIcon } from './categoryIcons';
import ResponsiveDialog, { FormTitle } from '../shared/ResponsiveDialog';
import TransactionTypeButtonGroup from '../shared/TransactionTypeButtonGroup';

function CategoryEditor({
  category,
  onClose,
}: {
  category?: CategoryRecord;
  onClose: () => void;
}) {
  const { formatMessage: t } = useIntl();
  const [name, setName] = useState(category?.name || '');
  const [type, setType] = useState<TransactionType>(
    category?.type || 'Expense',
  );
  const [icon, setIcon] = useState(category?.icon || 'tag');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);

  const save = async () => {
    if (pending.current) return;

    pending.current = true;
    setSaving(true);
    setError('');

    try {
      const result = await saveCustomCategory({
        id: category?.id,
        name,
        type,
        icon,
      });

      if (result.error) {
        setError(result.error);
      } else {
        window.dispatchEvent(new Event('categories-updated'));
        onClose();
      }
    } catch {
      setError('customCategories.saveError');
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };

  return (
    <ResponsiveDialog
      open
      maxWidth="sm"
      onClose={() => {
        if (!saving) onClose();
      }}
    >
      <FormTitle onClose={onClose} disabled={saving}>
        {t({ id: category ? 'customCategories.edit' : 'customCategories.add' })}
      </FormTitle>
      <DialogContent>
        <Stack
          spacing={2}
          component="form"
          id="category-form"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          {error && <Alert severity="error">{t({ id: error })}</Alert>}
          <TextField
            autoFocus
            required
            fullWidth
            label={t({ id: 'customCategories.name' })}
            value={name}
            onChange={(event) => setName(event.target.value)}
            inputProps={{ maxLength: 40 }}
            disabled={saving}
          />
          {category ? (
            <Typography color="text.secondary">
              {t({ id: `transactionType.${type.toLowerCase()}` })} ·{' '}
              {t({ id: 'customCategories.typeFixed' })}
            </Typography>
          ) : (
            <Box sx={{ pointerEvents: saving ? 'none' : undefined }}>
              <TransactionTypeButtonGroup
                transactionType={type}
                setTranasctionType={(value) => {
                  if (!saving) setType(value);
                }}
              />
            </Box>
          )}
          <Typography id="category-icon-label">
            {t({ id: 'customCategories.icon' })}
          </Typography>
          <ToggleButtonGroup
            exclusive
            value={icon}
            disabled={saving}
            aria-labelledby="category-icon-label"
            onChange={(_, value) => {
              if (value) setIcon(value);
            }}
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))',
              gap: 1,
              '& .MuiToggleButtonGroup-grouped': {
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '8px !important',
                m: 0,
                minHeight: 44,
              },
            }}
          >
            {CATEGORY_ICON_KEYS.map((key) => {
              const Icon = getCustomCategoryIcon(key);
              const label = t({ id: `customCategories.icons.${key}` });

              return (
                <ToggleButton
                  key={key}
                  value={key}
                  aria-label={label}
                  title={label}
                >
                  <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
                </ToggleButton>
              );
            })}
          </ToggleButtonGroup>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          fullWidth
          variant="contained"
          type="submit"
          form="category-form"
          disabled={saving || !name.trim()}
        >
          {t({ id: saving ? 'common.saving' : 'common.save' })}
        </Button>
      </DialogActions>
    </ResponsiveDialog>
  );
}

export default function CategoryManager() {
  const { formatMessage: t } = useIntl();
  const { categories, loading, error } = useCategoryCatalog();
  const [editor, setEditor] = useState<CategoryRecord | 'new' | null>(null);
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  const archive = async (category: CategoryRecord) => {
    if (pending.current) return;

    pending.current = true;
    setBusy(true);
    setActionError('');

    try {
      const result = await archiveCustomCategory(
        category.id,
        !category.archived,
      );

      if (result.error) setActionError(result.error);
      else window.dispatchEvent(new Event('categories-updated'));
    } catch {
      setActionError('customCategories.saveError');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        gap={1}
      >
        <Typography variant="h6" component="h2" fontWeight={600}>
          {t({ id: 'customCategories.title' })}
        </Typography>
        <Button
          startIcon={<Plus size={18} />}
          disabled={loading || Boolean(error)}
          onClick={() => setEditor('new')}
        >
          {t({ id: 'customCategories.add' })}
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {t({ id: 'customCategories.hint' })}
      </Typography>
      {(error || actionError) && (
        <Alert severity="error">{t({ id: error || actionError })}</Alert>
      )}
      {loading && (
        <Typography role="status">
          {t({ id: 'customCategories.loading' })}
        </Typography>
      )}
      {!loading && !error && !categories.length && (
        <Typography color="text.secondary">
          {t({ id: 'customCategories.empty' })}
        </Typography>
      )}
      {categories.map((category) => {
        const Icon = getCustomCategoryIcon(category.icon);
        const archiveLabel = t({
          id: category.archived
            ? 'customCategories.restore'
            : 'customCategories.archive',
        });
        const editLabel = t({ id: 'customCategories.edit' });

        return (
          <Stack
            key={category.id}
            direction="row"
            alignItems="center"
            spacing={1}
          >
            <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
            <Box sx={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
              <Typography>{category.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {t({ id: `transactionType.${category.type.toLowerCase()}` })}
              </Typography>
              {category.archived && (
                <Chip
                  size="small"
                  label={t({ id: 'customCategories.archived' })}
                  sx={{ ml: 1 }}
                />
              )}
            </Box>
            <Tooltip title={editLabel}>
              <span>
                <IconButton
                  aria-label={`${editLabel}: ${category.name}`}
                  disabled={busy}
                  onClick={() => setEditor(category)}
                >
                  <Pencil size={20} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={archiveLabel}>
              <span>
                <IconButton
                  aria-label={`${archiveLabel}: ${category.name}`}
                  disabled={busy}
                  onClick={() => void archive(category)}
                >
                  {category.archived ? (
                    <ArchiveRestore size={20} />
                  ) : (
                    <Archive size={20} />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        );
      })}
      {editor && (
        <CategoryEditor
          category={editor === 'new' ? undefined : editor}
          onClose={() => setEditor(null)}
        />
      )}
    </Stack>
  );
}

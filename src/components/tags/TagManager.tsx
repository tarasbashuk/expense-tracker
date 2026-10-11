'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Tag } from '@prisma/client';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useIntl } from 'react-intl';
import { deleteTag, saveTag } from '@/app/actions/tags';
import { MAX_TAG_NAME, TAG_COLORS } from '@/lib/tags';
import { useTransactions } from '@/context/TranasctionsContext';
import TagBadges from './TagBadges';
import { useTagCatalog } from './useTagCatalog';

export default function TagManager() {
  const { tags, error: loadError, loading } = useTagCatalog();
  const { formatMessage } = useIntl();
  const router = useRouter();
  const { requestTransactionsRefresh } = useTransactions();
  const [editor, setEditor] = useState<{
    id?: string;
    name: string;
    color: string;
  } | null>(null);
  const [deleting, setDeleting] = useState<Tag | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = () => {
    window.dispatchEvent(new Event('tags-updated'));
    requestTransactionsRefresh();
    router.refresh();
  };

  const save = async () => {
    if (!editor) return;

    setBusy(true);
    setError('');

    try {
      const result = await saveTag(editor);

      if (result.error) {
        setError(result.error);

        return;
      }

      setEditor(null);
      refresh();
    } catch {
      setError('tags.saveError');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;

    setBusy(true);
    setError('');

    try {
      const result = await deleteTag(deleting.id);

      if (result.error) {
        setError(result.error);

        return;
      }

      setDeleting(null);
      refresh();
    } catch {
      setError('tags.deleteError');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box component="section" sx={{ minWidth: 0 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h6" component="h2" fontWeight={600}>
          {formatMessage({ id: 'tags.title' })}
        </Typography>
        <Button
          startIcon={<Plus size={18} />}
          onClick={() => {
            setError('');
            setEditor({ name: '', color: 'blue' });
          }}
        >
          {formatMessage({ id: 'tags.create' })}
        </Button>
      </Stack>
      {loadError && (
        <Alert severity="error">{formatMessage({ id: loadError })}</Alert>
      )}
      {!loading && !loadError && !tags.length && (
        <Typography color="text.secondary" variant="body2">
          {formatMessage({ id: 'tags.empty' })}
        </Typography>
      )}
      <Stack spacing={0.5} sx={{ maxHeight: 240, overflowY: 'auto' }}>
        {tags.map((tag) => (
          <Stack key={tag.id} direction="row" alignItems="center" gap={0.5}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <TagBadges tags={[tag]} />
            </Box>
            <IconButton
              aria-label={formatMessage(
                { id: 'tags.editName' },
                { name: tag.name },
              )}
              onClick={() => {
                setError('');
                setEditor(tag);
              }}
              sx={{ width: 44, height: 44 }}
            >
              <Pencil size={18} />
            </IconButton>
            <IconButton
              aria-label={formatMessage(
                { id: 'tags.deleteName' },
                { name: tag.name },
              )}
              onClick={() => {
                setError('');
                setDeleting(tag);
              }}
              sx={{ width: 44, height: 44 }}
            >
              <Trash2 size={18} />
            </IconButton>
          </Stack>
        ))}
      </Stack>
      <Dialog
        open={!!editor}
        onClose={() => {
          if (!busy) setEditor(null);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ overflowWrap: 'anywhere' }}>
          {formatMessage({ id: editor?.id ? 'tags.edit' : 'tags.create' })}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              autoFocus
              label={formatMessage({ id: 'tags.name' })}
              value={editor?.name || ''}
              disabled={busy}
              inputProps={{ maxLength: MAX_TAG_NAME }}
              onChange={(event) =>
                setEditor(
                  (current) =>
                    current && { ...current, name: event.target.value },
                )
              }
            />
            <Typography>{formatMessage({ id: 'tags.color' })}</Typography>
            <ToggleButtonGroup
              exclusive
              value={editor?.color}
              disabled={busy}
              onChange={(_event, color) => {
                if (color)
                  setEditor((current) => current && { ...current, color });
              }}
              sx={{ flexWrap: 'wrap', gap: 0.5 }}
            >
              {Object.entries(TAG_COLORS).map(([color, palette]) => (
                <ToggleButton
                  key={color}
                  value={color}
                  aria-label={formatMessage({ id: `tags.color.${color}` })}
                  sx={{
                    minWidth: 44,
                    minHeight: 44,
                    '&.Mui-selected': {
                      outline: '2px solid',
                      outlineColor: 'text.primary',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      bgcolor: palette.background,
                      border: `2px solid ${palette.text}`,
                    }}
                  />
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            {error && (
              <Alert severity="error">{formatMessage({ id: error })}</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setEditor(null)}>
            {formatMessage({ id: 'common.cancel' })}
          </Button>
          <Button
            variant="contained"
            disabled={busy || !editor?.name.trim()}
            onClick={save}
          >
            {formatMessage({ id: 'common.save' })}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={!!deleting}
        onClose={() => {
          if (!busy) setDeleting(null);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ overflowWrap: 'anywhere' }}>
          {formatMessage({ id: 'tags.deleteName' }, { name: deleting?.name })}
        </DialogTitle>
        <DialogContent>
          <Typography>{formatMessage({ id: 'tags.deleteConfirm' })}</Typography>
          {error && (
            <Alert severity="error">{formatMessage({ id: error })}</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setDeleting(null)}>
            {formatMessage({ id: 'common.cancel' })}
          </Button>
          <Button color="error" disabled={busy} onClick={remove}>
            {formatMessage({ id: 'tags.delete' })}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Tag } from '@prisma/client';
import {
  Alert,
  Box,
  Button,
  DialogActions,
  DialogContent,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useIntl } from 'react-intl';
import { deleteTag } from '@/app/actions/tags';
import { useTransactions } from '@/context/TranasctionsContext';
import ResponsiveDialog, { FormTitle } from '../shared/ResponsiveDialog';
import TagBadges from './TagBadges';
import TagEditor from './TagEditor';
import TagPreview from './TagPreview';
import { useTagCatalog } from './useTagCatalog';

type Page =
  | { type: 'list' }
  | { type: 'edit'; tag?: Tag }
  | { type: 'delete'; tag: Tag };

export default function TagManager({
  settingsPreview = false,
}: {
  settingsPreview?: boolean;
}) {
  const { tags, error: loadError, loading } = useTagCatalog();
  const { formatMessage } = useIntl();
  const router = useRouter();
  const { requestTransactionsRefresh } = useTransactions();
  const [page, setPage] = useState<Page | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const close = () => {
    if (!busy) setPage(null);
  };

  const show = (next: Page) => {
    setError('');
    setPage(next);
  };

  const refresh = (reloadTags = true) => {
    if (reloadTags) window.dispatchEvent(new Event('tags-updated'));
    requestTransactionsRefresh();
    router.refresh();
  };

  const remove = async (id: string) => {
    setBusy(true);
    setError('');

    try {
      const result = await deleteTag(id);

      if (result.error) {
        setError(result.error);

        return;
      }

      setPage({ type: 'list' });
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
          {settingsPreview && !loading ? ` (${tags.length})` : ''}
        </Typography>
        <Button onClick={() => show({ type: 'list' })} sx={{ minHeight: 44 }}>
          {formatMessage({ id: 'tags.manage' })}
        </Button>
      </Stack>
      {loadError && (
        <Alert severity="error">{formatMessage({ id: loadError })}</Alert>
      )}
      {!loading && !loadError && !tags.length ? (
        <>
          <Typography color="text.secondary" variant="body2">
            {formatMessage({
              id: settingsPreview ? 'tags.emptySettings' : 'tags.empty',
            })}
          </Typography>
          <Button
            startIcon={<Plus size={18} />}
            onClick={() => show({ type: 'edit' })}
          >
            {formatMessage({ id: 'tags.create' })}
          </Button>
        </>
      ) : (
        <TagPreview
          tags={tags}
          onCreate={settingsPreview ? undefined : () => show({ type: 'edit' })}
          onManage={() => show({ type: 'list' })}
        />
      )}
      <ResponsiveDialog open={!!page} onClose={close} maxWidth="xs">
        {page?.type === 'edit' ? (
          <TagEditor
            key={page.tag?.id || 'new'}
            tag={page.tag}
            onClose={() => show({ type: 'list' })}
            onSaved={() => {
              show({ type: 'list' });
              refresh(false);
            }}
          />
        ) : page?.type === 'delete' ? (
          <>
            <FormTitle onClose={() => show({ type: 'list' })} disabled={busy}>
              {formatMessage(
                { id: 'tags.deleteName' },
                { name: page.tag.name },
              )}
            </FormTitle>
            <DialogContent>
              <Typography>
                {formatMessage({ id: 'tags.deleteConfirm' })}
              </Typography>
              {error && (
                <Alert severity="error">{formatMessage({ id: error })}</Alert>
              )}
            </DialogContent>
            <DialogActions>
              <Button disabled={busy} onClick={() => show({ type: 'list' })}>
                {formatMessage({ id: 'common.cancel' })}
              </Button>
              <Button
                variant="contained"
                color="error"
                disabled={busy}
                onClick={() => remove(page.tag.id)}
              >
                {formatMessage({ id: 'tags.delete' })}
              </Button>
            </DialogActions>
          </>
        ) : (
          <>
            <FormTitle onClose={close}>
              {formatMessage({ id: 'tags.manage' })}
            </FormTitle>
            <DialogContent>
              <Stack spacing={0.5}>
                {!tags.length && (
                  <Typography color="text.secondary">
                    {formatMessage({ id: 'tags.empty' })}
                  </Typography>
                )}
                {tags.map((tag) => (
                  <Stack
                    key={tag.id}
                    direction="row"
                    alignItems="center"
                    gap={0.5}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <TagBadges tags={[tag]} />
                    </Box>
                    <IconButton
                      aria-label={formatMessage(
                        { id: 'tags.editName' },
                        { name: tag.name },
                      )}
                      onClick={() => show({ type: 'edit', tag })}
                      sx={{ width: 44, height: 44 }}
                    >
                      <Pencil size={18} />
                    </IconButton>
                    <IconButton
                      aria-label={formatMessage(
                        { id: 'tags.deleteName' },
                        { name: tag.name },
                      )}
                      onClick={() => show({ type: 'delete', tag })}
                      sx={{ width: 44, height: 44 }}
                    >
                      <Trash2 size={18} />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button
                variant="contained"
                startIcon={<Plus size={18} />}
                onClick={() => show({ type: 'edit' })}
              >
                {formatMessage({ id: 'tags.create' })}
              </Button>
            </DialogActions>
          </>
        )}
      </ResponsiveDialog>
    </Box>
  );
}

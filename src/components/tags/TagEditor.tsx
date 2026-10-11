'use client';

import { useState } from 'react';
import type { Tag } from '@prisma/client';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  DialogActions,
  DialogContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Check } from 'lucide-react';
import { useIntl } from 'react-intl';
import { saveTag } from '@/app/actions/tags';
import { MAX_TAG_NAME, TAG_COLORS } from '@/lib/tags';
import { FormTitle, useDialogBusy } from '../shared/ResponsiveDialog';
import TagBadges from './TagBadges';

export default function TagEditor({
  tag,
  onClose,
  onSaved,
}: {
  tag?: Tag;
  onClose: () => void;
  onSaved: (_tag: Tag) => void;
}) {
  const { formatMessage } = useIntl();
  const [name, setName] = useState(tag?.name || '');
  const [color, setColor] = useState(tag?.color || 'blue');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useDialogBusy(busy);

  const save = async () => {
    setBusy(true);
    setError('');

    try {
      const result = await saveTag({ id: tag?.id, name, color });

      if (result.error || !result.tag) {
        setError(result.error || 'tags.saveError');

        return;
      }

      window.dispatchEvent(new Event('tags-updated'));
      onSaved(result.tag);
    } catch {
      setError('tags.saveError');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <FormTitle onClose={onClose} disabled={busy}>
        {formatMessage({ id: tag ? 'tags.edit' : 'tags.create' })}
      </FormTitle>
      <DialogContent>
        <Stack spacing={2}>
          <TextField
            autoFocus
            label={formatMessage({ id: 'tags.name' })}
            value={name}
            disabled={busy}
            inputProps={{ maxLength: MAX_TAG_NAME }}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && name.trim() && !busy) {
                event.preventDefault();
                void save();
              }
            }}
          />
          <Box>
            <Typography id="tag-palette-label">
              {formatMessage({ id: 'tags.color' })}
            </Typography>
            <Stack
              direction="row"
              role="group"
              aria-labelledby="tag-palette-label"
              spacing={0.5}
              sx={{ overflowX: 'auto', py: 1, px: 0.5 }}
            >
              {Object.entries(TAG_COLORS).map(([key, palette]) => (
                <ButtonBase
                  key={key}
                  disabled={busy}
                  aria-label={formatMessage({ id: `tags.color.${key}` })}
                  aria-pressed={color === key}
                  onClick={() => setColor(key)}
                  sx={{
                    width: 44,
                    height: 44,
                    flexShrink: 0,
                    borderRadius: '50%',
                    border: '2px solid',
                    borderColor: color === key ? palette.text : 'transparent',
                    '&.Mui-focusVisible': {
                      outline: '2px solid',
                      outlineColor: 'primary.main',
                      outlineOffset: 2,
                    },
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      display: 'grid',
                      placeItems: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: palette.background,
                      color: palette.text,
                    }}
                  >
                    {color === key && <Check size={18} aria-hidden />}
                  </Box>
                </ButtonBase>
              ))}
            </Stack>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {formatMessage({ id: 'tags.preview' })}
            </Typography>
            <TagBadges
              tags={[
                {
                  id: 'preview',
                  name: name.trim() || formatMessage({ id: 'tags.name' }),
                  color,
                },
              ]}
            />
          </Box>
          {error && (
            <Alert severity="error">{formatMessage({ id: error })}</Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={onClose}>
          {formatMessage({ id: 'common.cancel' })}
        </Button>
        <Button
          variant="contained"
          disabled={busy || !name.trim()}
          onClick={save}
        >
          {formatMessage({ id: tag ? 'common.save' : 'tags.create' })}
        </Button>
      </DialogActions>
    </>
  );
}

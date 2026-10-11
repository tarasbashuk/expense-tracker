'use client';

import {
  Alert,
  Checkbox,
  FormControlLabel,
  Stack,
  Typography,
} from '@mui/material';
import { useIntl } from 'react-intl';
import { MAX_TAGS } from '@/lib/tags';
import TagBadges from './TagBadges';
import { useTagCatalog } from './useTagCatalog';

export default function TagPicker({
  value,
  onChange,
  filter = false,
  disabled = false,
}: {
  value: string[];
  onChange: (_ids: string[]) => void;
  filter?: boolean;
  disabled?: boolean;
}) {
  const { tags, error, loading } = useTagCatalog();
  const { formatMessage } = useIntl();

  return (
    <Stack
      component="fieldset"
      spacing={1}
      sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}
    >
      <Typography component="legend">
        {formatMessage({ id: 'tags.title' })}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {formatMessage({ id: filter ? 'tags.filterHint' : 'tags.selectHint' })}
      </Typography>
      {error && <Alert severity="error">{formatMessage({ id: error })}</Alert>}
      {!loading && !error && !tags.length && (
        <Typography variant="body2" color="text.secondary">
          {formatMessage({ id: 'tags.pickerEmpty' })}
        </Typography>
      )}
      <Stack
        direction="row"
        useFlexGap
        flexWrap="wrap"
        gap={1}
        sx={{ maxHeight: 200, overflowY: 'auto' }}
      >
        {tags.map((tag) => (
          <FormControlLabel
            key={tag.id}
            sx={{
              m: 0,
              minWidth: 0,
              maxWidth: '100%',
              '& .MuiFormControlLabel-label': { minWidth: 0 },
            }}
            control={
              <Checkbox
                checked={value.includes(tag.id)}
                disabled={
                  disabled ||
                  (!filter &&
                    value.length >= MAX_TAGS &&
                    !value.includes(tag.id))
                }
                onChange={(_event, checked) =>
                  onChange(
                    checked
                      ? [...value, tag.id]
                      : value.filter((id) => id !== tag.id),
                  )
                }
              />
            }
            label={<TagBadges tags={[tag]} />}
          />
        ))}
      </Stack>
    </Stack>
  );
}

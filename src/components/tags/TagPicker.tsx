'use client';

import { useEffect, useRef, useState } from 'react';
import type { Tag } from '@prisma/client';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Stack,
  Typography,
} from '@mui/material';
import { Plus } from 'lucide-react';
import { useIntl } from 'react-intl';
import { MAX_TAGS, TAG_COLORS } from '@/lib/tags';
import { useDialogStep } from '../shared/ResponsiveDialog';
import TagEditor from './TagEditor';
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
  const setStep = useDialogStep();
  const [created, setCreated] = useState<Tag[]>([]);
  const strip = useRef<HTMLDivElement>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const element = strip.current;

    if (!element) return;

    const update = () =>
      setHasMore(
        element.scrollWidth - element.clientWidth - element.scrollLeft > 1,
      );
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    observer?.observe(element);
    element.addEventListener('scroll', update);
    update();

    return () => {
      observer?.disconnect();
      element.removeEventListener('scroll', update);
    };
  }, [tags, created]);

  useEffect(() => {
    setCreated((current) => {
      const remaining = current.filter(
        (tag) => !tags.some(({ id }) => id === tag.id),
      );

      return remaining.length === current.length ? current : remaining;
    });
  }, [tags]);

  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };
  const available = [
    ...tags,
    ...created.filter((tag) => !tags.some(({ id }) => id === tag.id)),
  ];
  const limitReached = !filter && value.length >= MAX_TAGS;

  const create = () =>
    setStep?.(
      <TagEditor
        onClose={() => setStep(null)}
        onSaved={(tag) => {
          setCreated((current) => [...current, tag]);
          const current = latest.current;

          if (current.value.length < MAX_TAGS)
            current.onChange([...current.value, tag.id]);

          setStep(null);
        }}
      />,
    );

  return (
    <Stack
      component="fieldset"
      spacing={1}
      sx={{ border: 0, p: 0, m: 0, minWidth: 0, maxWidth: '100%' }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography component="legend">
          {formatMessage({ id: 'tags.title' })}
        </Typography>
        {!filter && (
          <Typography variant="body2" color="text.secondary" aria-live="polite">
            {value.length}/{MAX_TAGS}
          </Typography>
        )}
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {formatMessage({ id: filter ? 'tags.filterHint' : 'tags.selectHint' })}
      </Typography>
      {error && <Alert severity="error">{formatMessage({ id: error })}</Alert>}
      {loading && (
        <Typography variant="body2" color="text.secondary" role="status">
          {formatMessage({ id: 'tags.loading' })}
        </Typography>
      )}
      {!loading && !error && !available.length && (
        <Typography variant="body2" color="text.secondary">
          {formatMessage({ id: 'tags.pickerEmpty' })}
        </Typography>
      )}
      <Stack
        ref={strip}
        direction="row"
        gap={1}
        sx={{
          overflowX: 'auto',
          overscrollBehaviorX: 'contain',
          flexWrap: { xs: 'nowrap', sm: 'wrap' },
          maxWidth: '100%',
          minWidth: 0,
          py: 0.5,
          pr: 3,
          scrollbarWidth: 'thin',
          maskImage: hasMore
            ? 'linear-gradient(to right, black calc(100% - 20px), transparent)'
            : undefined,
        }}
      >
        {available.map((tag) => {
          const selected = value.includes(tag.id);
          const palette =
            TAG_COLORS[tag.color as keyof typeof TAG_COLORS] ||
            TAG_COLORS.slate;

          return (
            <ButtonBase
              key={tag.id}
              role="checkbox"
              aria-checked={selected}
              aria-label={tag.name}
              title={tag.name}
              disabled={disabled || (limitReached && !selected)}
              onClick={() =>
                onChange(
                  selected
                    ? value.filter((id) => id !== tag.id)
                    : [...value, tag.id],
                )
              }
              sx={{
                flexShrink: 0,
                minHeight: 44,
                maxWidth: { xs: 'none', sm: '100%' },
                px: 1.5,
                gap: 0.75,
                borderRadius: '10px',
                border: '1px solid',
                borderColor: selected ? palette.text : 'divider',
                bgcolor: selected ? palette.background : 'background.paper',
                color: palette.text,
                '&.Mui-disabled': { opacity: 0.45 },
                '&.Mui-focusVisible': {
                  outline: '2px solid',
                  outlineColor: 'primary.main',
                  outlineOffset: 2,
                },
              }}
            >
              <Box
                component="span"
                data-label={tag.name}
                sx={{
                  display: 'grid',
                  '&::after': {
                    content: 'attr(data-label)',
                    fontWeight: 600,
                    visibility: 'hidden',
                    gridArea: '1 / 1',
                  },
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  fontSize: 14,
                  fontWeight: selected ? 600 : 400,
                }}
              >
                <Box
                  component="span"
                  sx={{
                    gridArea: '1 / 1',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {tag.name}
                </Box>
              </Box>
            </ButtonBase>
          );
        })}
      </Stack>
      {limitReached && (
        <Typography variant="caption" color="text.secondary" role="status">
          {formatMessage({ id: 'tags.limitHint' })}
        </Typography>
      )}
      {!filter && setStep && (
        <Button
          disabled={disabled}
          startIcon={<Plus size={18} />}
          onClick={create}
          sx={{ alignSelf: 'flex-start', minHeight: 44 }}
        >
          {formatMessage({ id: 'tags.create' })}
        </Button>
      )}
    </Stack>
  );
}

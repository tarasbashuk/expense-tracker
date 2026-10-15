'use client';

import { useId, useState, type ReactNode } from 'react';
import { Box, ButtonBase, Collapse, Stack, Typography } from '@mui/material';
import { ChevronDown } from 'lucide-react';
import { useIntl } from 'react-intl';

export default function TagsAndRecurrence({
  tagCount,
  recurring,
  isEditMode = false,
  children,
}: {
  tagCount: number;
  recurring: boolean;
  isEditMode?: boolean;
  children?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(
    () => isEditMode && (tagCount > 0 || recurring),
  );
  const id = useId();
  const { formatMessage } = useIntl();
  const summary = [
    formatMessage({ id: 'tags.count' }, { count: tagCount }),
    formatMessage({ id: recurring ? 'tags.monthly' : 'tags.noRepeat' }),
  ].join(' · ');

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <ButtonBase
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-controls={id}
        sx={{
          width: '100%',
          p: 1.5,
          textAlign: 'left',
          justifyContent: 'space-between',
          bgcolor: 'action.hover',
          gap: 1,
          '&.Mui-focusVisible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: -2,
          },
        }}
      >
        <Stack>
          <Typography fontWeight={600}>
            {formatMessage({ id: 'tags.andRecurrence' })}
          </Typography>
          {!expanded && (
            <Typography variant="body2" color="text.secondary">
              {summary}
            </Typography>
          )}
        </Stack>
        <ChevronDown
          size={20}
          style={{
            flexShrink: 0,
            transform: expanded ? 'rotate(180deg)' : undefined,
          }}
        />
      </ButtonBase>
      <Collapse in={expanded}>
        <Box id={id} sx={{ p: 1.5 }}>
          {children}
        </Box>
      </Collapse>
    </Box>
  );
}

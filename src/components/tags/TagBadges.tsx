'use client';

import { Box } from '@mui/material';
import type { Tag } from '@prisma/client';
import { TAG_COLORS } from '@/lib/tags';

export default function TagBadges({
  tags,
}: {
  tags?: Pick<Tag, 'id' | 'name' | 'color'>[];
}) {
  if (!tags?.length) return null;

  return (
    <Box
      component="span"
      sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, minWidth: 0 }}
    >
      {tags.map((tag) => {
        const palette =
          TAG_COLORS[tag.color as keyof typeof TAG_COLORS] || TAG_COLORS.slate;

        return (
          <Box
            component="span"
            key={tag.id}
            sx={{
              px: 0.75,
              py: 0.125,
              borderRadius: 1,
              bgcolor: palette.background,
              color: palette.text,
              fontSize: 12,
              lineHeight: 1.5,
              overflowWrap: 'anywhere',
              maxWidth: '100%',
            }}
          >
            {tag.name}
          </Box>
        );
      })}
    </Box>
  );
}

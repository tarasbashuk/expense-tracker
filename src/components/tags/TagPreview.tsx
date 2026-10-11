'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import type { Tag } from '@prisma/client';
import { Box, Button } from '@mui/material';
import { Plus } from 'lucide-react';
import { useIntl } from 'react-intl';
import TagBadges from './TagBadges';

export function fitTagPreview(
  width: number,
  sizes: number[],
  addWidth: number,
  moreWidth: number,
) {
  const fits = (items: number[]) => {
    let rows = 1;
    let used = 0;

    for (const size of items) {
      const itemWidth = Math.min(size, width);

      if (used && used + 8 + itemWidth > width) {
        rows += 1;
        used = 0;
      }

      used += (used ? 8 : 0) + itemWidth;
    }

    return rows <= 2;
  };

  for (let count = sizes.length; count >= 0; count -= 1) {
    if (
      fits([
        ...sizes.slice(0, count),
        addWidth,
        ...(count < sizes.length ? [moreWidth] : []),
      ])
    )
      return count;
  }

  return 0;
}

export default function TagPreview({
  tags,
  onCreate,
  onManage,
}: {
  tags: Tag[];
  onCreate: () => void;
  onManage: () => void;
}) {
  const { formatMessage } = useIntl();
  const container = useRef<HTMLDivElement>(null);
  const measure = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(tags.length);

  useLayoutEffect(() => {
    const update = () => {
      const width = container.current?.clientWidth || 0;
      const elements = Array.from(measure.current?.children || []);
      const sizes = elements.map(
        (element) => element.getBoundingClientRect().width,
      );

      if (!width || sizes.length !== tags.length + 2) return;

      setCount(
        fitTagPreview(width, sizes.slice(0, -2), sizes.at(-2)!, sizes.at(-1)!),
      );
    };

    update();
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;

    if (container.current) observer?.observe(container.current);

    document.fonts?.ready.then(update);

    return () => observer?.disconnect();
  }, [tags, formatMessage]);

  const shown = Math.min(count, tags.length);
  const add = (
    <Button
      startIcon={<Plus size={16} />}
      onClick={onCreate}
      sx={{ minHeight: 44, flexShrink: 0 }}
    >
      {formatMessage({ id: 'tags.short' })}
    </Button>
  );
  const more = (hidden: number) => (
    <Button onClick={onManage} sx={{ minHeight: 44, flexShrink: 0 }}>
      {formatMessage({ id: 'tags.more' }, { count: hidden })}
    </Button>
  );

  return (
    <Box ref={container} sx={{ position: 'relative', minWidth: 0 }}>
      <Box
        ref={measure}
        aria-hidden
        sx={{
          visibility: 'hidden',
          position: 'absolute',
          height: 0,
          overflow: 'hidden',
          display: 'flex',
          gap: 1,
          pointerEvents: 'none',
          maxWidth: '100%',
        }}
      >
        {tags.map((tag) => (
          <Box key={tag.id} sx={{ flexShrink: 0 }}>
            <TagBadges tags={[tag]} />
          </Box>
        ))}
        {add}
        {more(tags.length)}
      </Box>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0 8px',
          maxHeight: 88,
          overflow: 'hidden',
        }}
      >
        {tags.slice(0, shown).map((tag) => (
          <Box
            key={tag.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              minWidth: 0,
              maxWidth: '100%',
              height: 44,
            }}
          >
            <TagBadges tags={[tag]} />
          </Box>
        ))}
        {add}
        {shown < tags.length && more(tags.length - shown)}
      </Box>
    </Box>
  );
}

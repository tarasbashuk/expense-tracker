'use client';

import {
  Box,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useCategoryCatalog } from '../categories/useCategoryCatalog';
import { useCategoryI18n } from '@/lib/useCategoryI18n';
import { useIntl } from 'react-intl';
import {
  availableHistoryCategories,
  type HistoryFilters,
} from './HistoryFiltersSheet';
import { useTagCatalog } from '../tags/useTagCatalog';
import CategoryIcon from './CategoryIcon';
import { selectedSegmentStyles } from './tokens';
import { TAG_COLORS } from '@/lib/tags';

export default function DesktopHistoryFilters({
  value,
  onChange,
  creditCardTrackingEnabled,
  toolbarGrid = false,
}: {
  toolbarGrid?: boolean;
  value: HistoryFilters;
  onChange: (_value: HistoryFilters) => void;
  creditCardTrackingEnabled: boolean;
}) {
  const { formatMessage } = useIntl();
  const { tags, loading, error } = useTagCatalog();
  const selected = value.tagIds || [];
  const { categories: customCategories } = useCategoryCatalog();
  const { getLabel } = useCategoryI18n();
  const categories = availableHistoryCategories(
    value,
    creditCardTrackingEnabled,
    customCategories,
  );

  return (
    <>
      <ToggleButtonGroup
        exclusive
        size="small"
        color="primary"
        value={value.type}
        onChange={(_, type) => {
          if (type) onChange({ ...value, type, category: 'all' });
        }}
        sx={{
          ...selectedSegmentStyles,
          height: 44,
          flexShrink: 0,
          ...(toolbarGrid && {
            gridColumn: 1,
            gridRow: 2,
            width: '100%',
            '& > button': { flex: '1 1 0', width: 0 },
          }),
        }}
      >
        {['all', 'Expense', 'Income'].map((type) => (
          <ToggleButton key={type} value={type} sx={{ whiteSpace: 'nowrap' }}>
            {formatMessage({
              id:
                type === 'all'
                  ? 'filters.allTypes'
                  : `transactionType.${type.toLowerCase()}`,
            })}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <Box
        sx={{
          gridColumn: '1 / -1',
          gridRow: 3,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.5,
          alignItems: 'center',
          minWidth: 0,
          '& .MuiInputBase-root': { height: 44, bgcolor: 'background.paper' },
          '& .MuiSelect-select': {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          },
        }}
      >
        <FormControl size="small" sx={{ flex: '1 1 180px', minWidth: 0 }}>
          <InputLabel id="desktop-category-label">
            {formatMessage({ id: 'filters.category' })}
          </InputLabel>
          <Select
            labelId="desktop-category-label"
            label={formatMessage({ id: 'filters.category' })}
            value={value.category}
            onChange={(event) =>
              onChange({
                ...value,
                category: event.target.value as HistoryFilters['category'],
              })
            }
            MenuProps={{ PaperProps: { sx: { maxWidth: 400 } } }}
          >
            <MenuItem value="all">
              {formatMessage({ id: 'filters.allCategories' })}
            </MenuItem>
            {categories.map((category) => (
              <MenuItem
                key={category.value}
                value={category.value}
                sx={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}
              >
                <Box
                  component="span"
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}
                >
                  <CategoryIcon category={category.value} />
                  {getLabel(category.value)}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ flex: '1 1 170px', minWidth: 0 }}>
          <InputLabel id="desktop-tags-label" shrink>
            {formatMessage({ id: 'tags.title' })}
          </InputLabel>
          <Select
            labelId="desktop-tags-label"
            label={formatMessage({ id: 'tags.title' })}
            notched
            multiple
            displayEmpty
            value={selected}
            inputProps={{ 'aria-label': formatMessage({ id: 'tags.title' }) }}
            onChange={(event) =>
              onChange({
                ...value,
                tagIds:
                  typeof event.target.value === 'string'
                    ? event.target.value.split(',')
                    : event.target.value,
              })
            }
            renderValue={() => {
              if (!selected.length) return formatMessage({ id: 'tags.all' });
              if (selected.length === 1)
                return (
                  tags.find((tag) => tag.id === selected[0])?.name ||
                  formatMessage({ id: 'tags.selectedCount' }, { count: 1 })
                );

              return formatMessage(
                { id: 'tags.selectedCount' },
                { count: selected.length },
              );
            }}
            MenuProps={{
              PaperProps: {
                sx: { width: 300, maxWidth: 'calc(100vw - 32px)' },
              },
            }}
          >
            <MenuItem
              disabled
              sx={{ whiteSpace: 'normal', opacity: '1 !important' }}
            >
              <Typography variant="caption" color="text.secondary">
                {formatMessage({ id: 'tags.filterHint' })}
              </Typography>
            </MenuItem>
            {(loading || error || !tags.length) && (
              <MenuItem disabled sx={{ whiteSpace: 'normal' }}>
                {formatMessage({
                  id: error || (loading ? 'tags.loading' : 'tags.pickerEmpty'),
                })}
              </MenuItem>
            )}
            {tags.map((tag) => {
              const palette =
                TAG_COLORS[tag.color as keyof typeof TAG_COLORS] ||
                TAG_COLORS.slate;
              const active = selected.includes(tag.id);

              return (
                <MenuItem
                  key={tag.id}
                  value={tag.id}
                  sx={{
                    mx: 1,
                    my: 0.5,
                    border: '1px solid',
                    borderRadius: '10px',
                    borderColor: active ? palette.text : 'transparent',
                    color: palette.text,
                    fontWeight: active ? 600 : 400,
                    whiteSpace: 'normal',
                    overflowWrap: 'anywhere',
                    '&.Mui-selected, &.Mui-selected:hover': {
                      bgcolor: palette.background,
                    },
                  }}
                >
                  {tag.name}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
        <FormControlLabel
          sx={{ m: 0, minHeight: 44 }}
          control={
            <Switch
              checked={value.recurringOnly}
              onChange={(event) =>
                onChange({ ...value, recurringOnly: event.target.checked })
              }
            />
          }
          label={formatMessage({ id: 'history.recurringOnly' })}
        />
      </Box>
    </>
  );
}

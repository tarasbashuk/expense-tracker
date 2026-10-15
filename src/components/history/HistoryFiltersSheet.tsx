'use client';

import ResponsiveDialog, { FormTitle } from '../shared/ResponsiveDialog';
import TagPicker from '../tags/TagPicker';
import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  DialogContent,
  DialogActions,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { Search, X } from 'lucide-react';
import { TransactionType } from '@prisma/client';
import { useIntl } from 'react-intl';
import { TransactionCategory } from '@/constants/types';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES_LIST,
  INCOME_CATEGORIES_LIST,
  isCreditCardCategory,
} from '@/constants/constants';
import CategoryIcon from './CategoryIcon';

export interface HistoryFilters {
  tagIds?: string[];
  type: TransactionType | 'all';
  category: TransactionCategory | 'all';
  recurringOnly: boolean;
  search: string;
}

const allCategories = Object.entries({
  ...INCOME_CATEGORIES,
  ...EXPENSE_CATEGORIES,
}).map(([value, label]) => ({ value, label }));
export const categoriesByType = {
  all: allCategories,
  Income: INCOME_CATEGORIES_LIST,
  Expense: EXPENSE_CATEGORIES_LIST,
};
const emptyFilters: HistoryFilters = {
  type: 'all',
  category: 'all',
  recurringOnly: false,
  search: '',
  tagIds: [],
};

interface Props {
  desktop?: boolean;
  value: HistoryFilters;
  creditCardTrackingEnabled: boolean;
  onClose: () => void;
  onApply: (_filters: HistoryFilters) => void;
}

// Mount for each opening so closing always discards the draft.
export default function HistoryFiltersSheet({
  value,
  desktop = false,
  creditCardTrackingEnabled,
  onClose,
  onApply,
}: Props) {
  const [draft, setDraft] = useState(value);

  // A search applied outside this dialog must survive an older filter draft.
  useEffect(() => {
    setDraft((current) => ({ ...current, search: value.search }));
  }, [value.search]);

  const { formatMessage } = useIntl();
  const categories = categoriesByType[draft.type].filter(
    (category) =>
      creditCardTrackingEnabled || !isCreditCardCategory(category.value),
  );

  return (
    <ResponsiveDialog open desktop={desktop} onClose={onClose} maxWidth="sm">
      <FormTitle onClose={onClose}>
        <Box
          component="span"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          {formatMessage({ id: 'history.filtersTitle' })}
          <Button onClick={() => setDraft(emptyFilters)}>
            {formatMessage({ id: 'history.resetDraft' })}
          </Button>
        </Box>
      </FormTitle>
      <DialogContent>
        <Stack
          spacing={2.5}
          component="form"
          id="history-filters-form"
          onSubmit={(event) => {
            event.preventDefault();
            onApply({
              ...draft,
              search: desktop ? value.search : draft.search,
            });
          }}
        >
          <ToggleButtonGroup
            exclusive
            fullWidth
            value={draft.type}
            onChange={(_event, type) => {
              if (type) setDraft({ ...draft, type, category: 'all' });
            }}
          >
            <ToggleButton value="all">
              {formatMessage({ id: 'filters.allTypes' })}
            </ToggleButton>
            <ToggleButton value="Expense">
              {formatMessage({ id: 'transactionType.expense' })}
            </ToggleButton>
            <ToggleButton value="Income">
              {formatMessage({ id: 'transactionType.income' })}
            </ToggleButton>
          </ToggleButtonGroup>
          <FormControl fullWidth>
            <InputLabel id="mobile-category-label">
              {formatMessage({ id: 'filters.category' })}
            </InputLabel>
            <Select
              labelId="mobile-category-label"
              label={formatMessage({ id: 'filters.category' })}
              value={draft.category}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  category: event.target.value as HistoryFilters['category'],
                })
              }
            >
              <MenuItem value="all">
                {formatMessage({ id: 'filters.allCategories' })}
              </MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.value} value={category.value}>
                  <Box
                    component="span"
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <CategoryIcon category={category.value} />
                    {formatMessage({
                      id: `categories.${category.value}`,
                      defaultMessage: category.label,
                    })}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TagPicker
            filter
            value={draft.tagIds || []}
            onChange={(tagIds) => setDraft({ ...draft, tagIds })}
          />
          <FormControlLabel
            control={
              <Switch
                checked={draft.recurringOnly}
                onChange={(event) =>
                  setDraft({ ...draft, recurringOnly: event.target.checked })
                }
              />
            }
            label={formatMessage({ id: 'history.recurringOnly' })}
          />
          {!desktop && (
            <TextField
              label={formatMessage({ id: 'history.search' })}
              value={draft.search}
              onChange={(event) =>
                setDraft({ ...draft, search: event.target.value })
              }
              helperText={formatMessage({ id: 'history.searchScope' })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={20} />
                  </InputAdornment>
                ),
                endAdornment: draft.search ? (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={formatMessage({ id: 'history.clearSearch' })}
                      onClick={() => setDraft({ ...draft, search: '' })}
                    >
                      <X size={20} />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
              }}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          type="submit"
          form="history-filters-form"
          variant="contained"
          fullWidth
          size="large"
        >
          {formatMessage({ id: 'common.apply' })}
        </Button>
      </DialogActions>
    </ResponsiveDialog>
  );
}

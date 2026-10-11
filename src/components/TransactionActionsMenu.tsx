'use client';

import { useId, useState } from 'react';
import { Transaction } from '@prisma/client';
import {
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import { ChevronDown, Pencil, Copy, BookmarkPlus, Trash2 } from 'lucide-react';
import CategoryIcon from './history/CategoryIcon';
import { cardRadius, historyColors } from './history/tokens';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { useIntl } from 'react-intl';

import SaveTransactionTemplate from './SaveTransactionTemplate';

interface Props {
  transaction: Transaction;
  categoryButton?: boolean;
  onEdit: () => void;
  onCopy?: () => void;
  onDelete: () => void;
}

export default function TransactionActionsMenu({
  transaction,
  categoryButton = false,
  onEdit,
  onCopy,
  onDelete,
}: Props) {
  const { formatMessage } = useIntl();
  const id = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const isExpense = transaction.type === 'Expense';
  const categoryBackground = isExpense
    ? historyColors.expenseBackground
    : historyColors.incomeBackground;
  const activeCategoryBackground = isExpense
    ? historyColors.expenseActiveBackground
    : historyColors.incomeActiveBackground;
  const title = formatMessage({
    id: 'transactions.actions',
    defaultMessage: 'Transaction actions',
  });

  const runAction = (action: () => void) => {
    setAnchor(null);
    action();
  };

  return (
    <>
      <Tooltip title={title}>
        <IconButton
          id={`${id}-button`}
          aria-label={title}
          aria-haspopup="menu"
          aria-expanded={Boolean(anchor)}
          aria-controls={anchor ? `${id}-menu` : undefined}
          onClick={(event) => setAnchor(event.currentTarget)}
          sx={{
            width: categoryButton ? 52 : 44,
            height: categoryButton ? 48 : 44,
            flexShrink: 0,
            borderRadius: categoryButton ? '10px' : '50%',
            ...(categoryButton && {
              boxShadow: anchor ? 'inset 0 0 0 1px #CBD5E1' : undefined,
              bgcolor: anchor ? activeCategoryBackground : categoryBackground,
              '&:hover': { bgcolor: activeCategoryBackground },
              color:
                transaction.type === 'Expense'
                  ? historyColors.expenseIcon
                  : historyColors.income,
            }),
            '&.Mui-focusVisible': {
              outline: '2px solid',
              outlineColor: 'primary.main',
            },
          }}
        >
          <>
            {categoryButton ? (
              <>
                <CategoryIcon category={transaction.category} />
                <ChevronDown
                  size={12}
                  aria-hidden="true"
                  style={{ transform: anchor ? 'rotate(180deg)' : undefined }}
                />
              </>
            ) : (
              <MoreHorizIcon />
            )}
          </>
        </IconButton>
      </Tooltip>
      <Menu
        id={`${id}-menu`}
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        marginThreshold={12}
        PaperProps={{
          sx: {
            mt: 0.75,
            width: 292,
            maxWidth: 'calc(100vw - 24px)',
            borderRadius: cardRadius,
            bgcolor: historyColors.card,
            border: `1px solid ${historyColors.divider}`,
            boxShadow: '0 8px 28px rgba(41, 50, 65, 0.14)',
            '& .MuiMenuItem-root': {
              minHeight: 48,
              px: 1.5,
              py: 1,
              borderRadius: '10px',
              whiteSpace: 'normal',
              color: historyColors.expense,
              '&:hover, &.Mui-focusVisible': {
                bgcolor: historyColors.expenseBackground,
              },
            },
            '& .MuiListItemIcon-root': {
              minWidth: 32,
              color: historyColors.secondary,
            },
            '& .MuiListItemText-primary': {
              fontSize: 15,
              lineHeight: 1.4,
              overflowWrap: 'anywhere',
            },
            '& .transaction-delete': {
              color: historyColors.negativeBalance,
              '& .MuiListItemIcon-root': { color: 'inherit' },
              '&:hover, &.Mui-focusVisible': { bgcolor: '#FCEEEF' },
            },
          },
        }}
        MenuListProps={{ 'aria-labelledby': `${id}-button`, sx: { p: 0.75 } }}
      >
        <MenuItem onClick={() => runAction(onEdit)}>
          <ListItemIcon>
            <Pencil size={20} />
          </ListItemIcon>
          <ListItemText>
            {formatMessage({ id: 'common.edit', defaultMessage: 'Edit' })}
          </ListItemText>
        </MenuItem>
        {onCopy && (
          <MenuItem onClick={() => runAction(onCopy)}>
            <ListItemIcon>
              <Copy size={20} />
            </ListItemIcon>
            <ListItemText>
              {formatMessage({
                id: 'home.repeatTransaction',
                defaultMessage: 'Repeat transaction',
              })}
            </ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => runAction(() => setTemplateOpen(true))}>
          <ListItemIcon>
            <BookmarkPlus size={20} />
          </ListItemIcon>
          <ListItemText>
            {formatMessage({
              id: 'template.fromTransaction',
              defaultMessage: 'Save as shortcut',
            })}
          </ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          className="transaction-delete"
          onClick={() => runAction(onDelete)}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon sx={{ color: 'inherit' }}>
            <Trash2 size={20} />
          </ListItemIcon>
          <ListItemText>
            {formatMessage({ id: 'common.delete', defaultMessage: 'Delete' })}
          </ListItemText>
        </MenuItem>
      </Menu>
      {templateOpen && (
        <SaveTransactionTemplate
          transaction={transaction}
          onClose={() => setTemplateOpen(false)}
        />
      )}
    </>
  );
}

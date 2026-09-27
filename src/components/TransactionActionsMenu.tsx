'use client';

import { useId, useState } from 'react';
import { Transaction } from '@prisma/client';
import {
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import BookmarkAddOutlinedIcon from '@mui/icons-material/BookmarkAddOutlined';
import DeleteIcon from '@mui/icons-material/Delete';
import { useIntl } from 'react-intl';

import SaveTransactionTemplate from './SaveTransactionTemplate';

interface Props {
  transaction: Transaction;
  onEdit: () => void;
  onCopy?: () => void;
  onDelete: () => void;
}

export default function TransactionActionsMenu({
  transaction,
  onEdit,
  onCopy,
  onDelete,
}: Props) {
  const { formatMessage } = useIntl();
  const id = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
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
          sx={{ width: 44, height: 44 }}
        >
          <MoreHorizIcon />
        </IconButton>
      </Tooltip>
      <Menu
        id={`${id}-menu`}
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        MenuListProps={{ 'aria-labelledby': `${id}-button` }}
      >
        <MenuItem onClick={() => runAction(onEdit)}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            {formatMessage({ id: 'common.edit', defaultMessage: 'Edit' })}
          </ListItemText>
        </MenuItem>
        {onCopy && (
          <MenuItem onClick={() => runAction(onCopy)}>
            <ListItemIcon>
              <ContentCopyIcon fontSize="small" />
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
            <BookmarkAddOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            {formatMessage({
              id: 'template.fromTransaction',
              defaultMessage: 'Save as shortcut',
            })}
          </ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => runAction(onDelete)}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon sx={{ color: 'inherit' }}>
            <DeleteIcon fontSize="small" />
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

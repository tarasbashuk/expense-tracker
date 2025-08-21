'use client';
import { FC } from 'react';
import { ToggleButtonGroup, ToggleButton, SxProps } from '@mui/material';
import { TransactionType } from '@prisma/client';
import { useIntl } from 'react-intl';

interface Props {
  transactionType: TransactionType;
  buttonsSx?: SxProps;
  size?: 'large' | 'small' | 'medium';
  /* eslint-disable-next-line no-unused-vars*/
  setTranasctionType: (type: TransactionType) => void;
}

const TransactionTypeButtonGroup: FC<Props> = ({
  buttonsSx,
  size = 'large',
  transactionType,
  setTranasctionType,
}) => {
  const { formatMessage } = useIntl();

  const handleTypeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newType: TransactionType,
  ) => {
    if (!newType) return;
    setTranasctionType(newType);
  };

  return (
    <ToggleButtonGroup
      exclusive
      fullWidth
      size={size}
      color="primary"
      value={transactionType}
      onChange={handleTypeChange}
    >
      <ToggleButton sx={buttonsSx} value={TransactionType.Expense}>
        {formatMessage({
          id: 'transactionType.expense',
          defaultMessage: 'Expense',
        })}
      </ToggleButton>
      <ToggleButton sx={buttonsSx} value={TransactionType.Income}>
        {formatMessage({
          id: 'transactionType.income',
          defaultMessage: 'Income',
        })}
      </ToggleButton>
    </ToggleButtonGroup>
  );
};

export default TransactionTypeButtonGroup;

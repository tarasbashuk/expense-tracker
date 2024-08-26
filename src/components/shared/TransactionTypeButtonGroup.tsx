import { FC } from 'react';
import { ToggleButtonGroup, ToggleButton, SxProps } from '@mui/material';
import { TransactionType } from '@prisma/client';

interface Props {
  transactionType: TransactionType;
  buttonsSx?: SxProps;
  /* eslint-disable-next-line no-unused-vars*/
  setTranasctionType: (type: TransactionType) => void;
}

const TransactionTypeButtonGroup: FC<Props> = ({
  buttonsSx,
  transactionType,
  setTranasctionType,
}) => {
  const handleTypeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newType: TransactionType,
  ) => {
    // If a user click on already selected type button, the newTypes cames as null
    if (!newType) return;

    setTranasctionType(newType);
  };

  return (
    <ToggleButtonGroup
      exclusive
      fullWidth
      size="large"
      color="primary"
      value={transactionType}
      onChange={handleTypeChange}
    >
      <ToggleButton sx={buttonsSx} value={TransactionType.Expense}>
        Expense
      </ToggleButton>
      <ToggleButton sx={buttonsSx} value={TransactionType.Income}>
        Income
      </ToggleButton>
    </ToggleButtonGroup>
  );
};

export default TransactionTypeButtonGroup;

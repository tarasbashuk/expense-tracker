export const historyColors = {
  background: '#F3F6FA',
  card: '#FFFFFF',
  text: '#18202F',
  secondary: '#647084',
  expense: '#293241',
  expenseIcon: '#647084',
  expenseBackground: '#EDF2F7',
  expenseActiveBackground: '#E3EAF2',
  income: '#18834B',
  incomeBackground: '#EAF7EE',
  incomeActiveBackground: '#DCEFE2',
  negativeBalance: '#B54742',
  divider: '#E6EBF1',
};

// CSS lengths keep MUI sx from multiplying these values by theme.shape.borderRadius.
export const cardRadius = '16px';
export const cardStyles = {
  bgcolor: historyColors.card,
  color: historyColors.text,
  borderRadius: cardRadius,
  boxShadow: 'none',
};

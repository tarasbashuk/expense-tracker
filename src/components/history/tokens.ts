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

export const pageStyles = {
  width: '100%',
  maxWidth: '900px',
  boxSizing: 'border-box',
  minWidth: 0,
  mx: 'auto',
  '--page-header-height': 'calc(64px + env(safe-area-inset-top, 0px))',
};

export const pageHeaderStyles = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 1,
  mb: 2,
  position: { xs: 'sticky', sm: 'static' },
  top: 0,
  height: { xs: 'var(--page-header-height)', sm: 'auto' },
  pt: { xs: 'env(safe-area-inset-top, 0px)', sm: 0 },
  bgcolor: historyColors.background,
  borderBottom: { xs: `1px solid ${historyColors.divider}`, sm: 0 },
  zIndex: 1100,
};

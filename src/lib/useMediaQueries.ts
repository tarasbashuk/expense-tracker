import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

export const useMediaQueries = () => {
  const theme = useTheme();

  const isExtraSmall = useMediaQuery(theme.breakpoints.only('xs')); // xs: 0px
  const isSmall = useMediaQuery(theme.breakpoints.only('sm')); // sm: 600px
  const isMedium = useMediaQuery(theme.breakpoints.only('md')); // md: 900px
  const isLarge = useMediaQuery(theme.breakpoints.only('lg')); // lg: 1200px
  const isExtraLarge = useMediaQuery(theme.breakpoints.only('xl')); // xl: 1536px

  return {
    isExtraSmall,
    isSmall,
    isMedium,
    isLarge,
    isExtraLarge,
  };
};

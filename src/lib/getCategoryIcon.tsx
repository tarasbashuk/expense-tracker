import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import HomeIcon from '@mui/icons-material/Home';
import ReceiptIcon from '@mui/icons-material/Receipt';
import HomeRepairServiceIcon from '@mui/icons-material/HomeRepairService';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import PetsIcon from '@mui/icons-material/Pets';
import FavoriteIcon from '@mui/icons-material/Favorite';
import SchoolIcon from '@mui/icons-material/School';
import SportsIcon from '@mui/icons-material/Sports';
import LocalMoviesIcon from '@mui/icons-material/LocalMovies';
import SpaIcon from '@mui/icons-material/Spa';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import SavingsIcon from '@mui/icons-material/Savings';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

const ICON_MAP = {
  AttachMoney: AttachMoneyIcon,
  TrendingUp: TrendingUpIcon,
  CardGiftcard: CardGiftcardIcon,
  ShoppingCart: ShoppingCartIcon,
  Restaurant: RestaurantIcon,
  Home: HomeIcon,
  Receipt: ReceiptIcon,
  HomeRepairService: HomeRepairServiceIcon,
  DirectionsCar: DirectionsCarIcon,
  ShoppingBag: ShoppingBagIcon,
  PhoneIphone: PhoneIphoneIcon,
  Pets: PetsIcon,
  Favorite: FavoriteIcon,
  School: SchoolIcon,
  Sports: SportsIcon,
  LocalMovies: LocalMoviesIcon,
  Spa: SpaIcon,
  LocalPharmacy: LocalPharmacyIcon,
  Savings: SavingsIcon,
  MoreHoriz: MoreHorizIcon,
};

export type IconName = keyof typeof ICON_MAP;

export const getIconByName = (iconName: IconName) => {
  return ICON_MAP[iconName] || null;
};

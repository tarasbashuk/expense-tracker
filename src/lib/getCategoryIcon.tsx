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
import AirportShuttleIcon from '@mui/icons-material/AirportShuttle';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import CreditScoreIcon from '@mui/icons-material/CreditScore';
import AirplaneTicketIcon from '@mui/icons-material/AirplaneTicket';
import DevicesOtherIcon from '@mui/icons-material/DevicesOther';
import { TransactionCategory } from '@/constants/types';
import { OverridableComponent } from '@mui/material/OverridableComponent';
import { SvgIconTypeMap } from '@mui/material';

export const ICON_MAP: Record<
  TransactionCategory,
  OverridableComponent<SvgIconTypeMap<{}, 'svg'>> & {
    muiName: string;
  }
> = {
  groceries: ShoppingCartIcon,
  dining: RestaurantIcon,
  rent: HomeIcon,
  utilities: ReceiptIcon,
  home: HomeRepairServiceIcon,
  auto: DirectionsCarIcon,
  transport: AirportShuttleIcon,
  shopping: ShoppingBagIcon,
  subscriptions: PhoneIphoneIcon,
  pets: PetsIcon,
  donations: FavoriteIcon,
  education: SchoolIcon,
  sports: SportsIcon,
  entertainment: LocalMoviesIcon,
  beauty: SpaIcon,
  healthcare: LocalPharmacyIcon,
  gifts: CardGiftcardIcon,
  trips: AirplaneTicketIcon,
  savings: SavingsIcon,
  others: MoreHorizIcon,
  salary: AttachMoneyIcon,
  investments: TrendingUpIcon,
  creditReceived: CreditCardIcon,
  ROI: TrendingUpIcon,
  CCRepayment: CreditScoreIcon,
  gadgets: DevicesOtherIcon,
};

export const getIconByName = (iconName: TransactionCategory) => {
  return ICON_MAP[iconName] || null;
};

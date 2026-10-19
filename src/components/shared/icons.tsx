import { forwardRef } from 'react';
import { SvgIcon, type SvgIconProps } from '@mui/material';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChartColumn,
  ChartPie,
  CircleHelp,
  CircleCheck,
  CircleAlert,
  Info,
  TriangleAlert,
  CreditCard,
  Repeat2,
  List,
  Table2,
  Search,
  Download,
  X,
  ListFilter,
  Trash2,
  ScanText,
  FileText,
  FileUp,
  Plus,
  Sparkles,
  Ellipsis,
  EllipsisVertical,
  Settings,
  House,
  Receipt,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  CalendarDays,
  Square,
  SquareCheck,
  SquareMinus,
  Columns3,
  EyeOff,
  Minus,
  GripVertical,
  GripHorizontal,
  Rows2,
  Rows3,
  LoaderCircle,
  type LucideIcon,
} from 'lucide-react';

type AppIconProps = Omit<SvgIconProps, 'color'> & { color?: string };

function isThemeColor(
  color: string | undefined,
): color is NonNullable<SvgIconProps['color']> {
  return [
    'primary',
    'secondary',
    'disabled',
    'error',
    'inherit',
    'info',
    'success',
    'warning',
    'action',
  ].includes(color ?? '');
}

// Preserve MUI sizing, theme colors, sx, and tooltip refs around Lucide artwork.
function createIcon(Icon: LucideIcon) {
  const Component = forwardRef<SVGSVGElement, AppIconProps>(function AppIcon(
    { sx, color, ...props },
    ref,
  ) {
    return (
      <SvgIcon
        {...props}
        color={isThemeColor(color) ? color : undefined}
        htmlColor={isThemeColor(color) ? undefined : color}
        ref={ref}
        component={Icon}
        inheritViewBox
        strokeWidth={1.75}
        sx={[{ fill: 'none' }, ...(Array.isArray(sx) ? sx : [sx])]}
      />
    );
  });

  Component.displayName = `AppIcon(${Icon.displayName || 'Lucide'})`;

  return Component;
}

export const ArrowBack = createIcon(ArrowLeft);
export const ArrowForward = createIcon(ArrowRight);
export const ArrowUpIcon = createIcon(ArrowUp);
export const ArrowDownIcon = createIcon(ArrowDown);
export const SortIcon = createIcon(ArrowUpDown);
export const ArrowBackIosNew = createIcon(ChevronLeft);
export const ArrowForwardIos = createIcon(ChevronRight);
export const ChevronDownIcon = createIcon(ChevronDown);
export const FirstPageIcon = createIcon(ChevronsLeft);
export const LastPageIcon = createIcon(ChevronsRight);
export const CalendarMonth = createIcon(CalendarDays);
export const QuestionMarkIcon = createIcon(CircleHelp);
export const PieChartIcon = createIcon(ChartPie);
export const DonutSmallIcon = PieChartIcon;
export const BarChartIcon = createIcon(ChartColumn);
export const CreditCardIcon = createIcon(CreditCard);
export const RepeatIcon = createIcon(Repeat2);
export const ViewListIcon = createIcon(List);
export const TableViewIcon = createIcon(Table2);
export const SearchIcon = createIcon(Search);
export const DownloadIcon = createIcon(Download);
export const CloseIcon = createIcon(X);
export const FilterListIcon = createIcon(ListFilter);
export const DeleteIcon = createIcon(Trash2);
export const DocumentScannerIcon = createIcon(ScanText);
export const PictureAsPdfIcon = createIcon(FileText);
export const UploadFileIcon = createIcon(FileUp);
export const AddIcon = createIcon(Plus);
export const AutoAwesomeIcon = createIcon(Sparkles);
export const MoreHorizIcon = createIcon(Ellipsis);
export const MoreVertIcon = createIcon(EllipsisVertical);
export const SettingsIcon = createIcon(Settings);
export const HomeIcon = createIcon(House);
export const ReceiptIcon = createIcon(Receipt);
export const CheckIcon = createIcon(CircleCheck);
export const ErrorIcon = createIcon(CircleAlert);
export const InfoIcon = createIcon(Info);
export const WarningIcon = createIcon(TriangleAlert);
export const UncheckedIcon = createIcon(Square);
export const CheckedIcon = createIcon(SquareCheck);
export const IndeterminateIcon = createIcon(SquareMinus);
export const ColumnsIcon = createIcon(Columns3);
export const HideIcon = createIcon(EyeOff);

export const MinusIcon = createIcon(Minus);
export const ResizeIcon = createIcon(GripVertical);
export const ReorderIcon = createIcon(GripHorizontal);
export const CompactRowsIcon = createIcon(List);
export const StandardRowsIcon = createIcon(Rows3);
export const ComfortableRowsIcon = createIcon(Rows2);
export const LoadingIcon = createIcon(LoaderCircle);

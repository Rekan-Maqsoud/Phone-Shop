// Icon mappings using Lucide React - replaces all emojis for consistent cross-platform display
import {
  BarChart3,
  Package,
  Headphones,
  Archive,
  ShoppingCart,
  CreditCard,
  Building2,
  DollarSign,
  HandHeart,
  FileText,
  Cloud,
  Settings,
  LogOut,
  Plus,
  Search,
  Edit,
  Trash2,
  Check,
  X,
  AlertTriangle,
  TrendingUp,
  Users,
  User,
  Square,
  Calendar,
  Clock,
  Eye,
  Download,
  Upload,
  RefreshCw,
  Save,
  FileBarChart,
  PieChart,
  Activity,
  Zap,
  Target,
  Award,
  Briefcase,
  Coins,
  Banknote,
  Wallet,
  Calculator,
  ShoppingBag,
  Receipt,
  BookOpen,
  Database,
  Server,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Filter,
  SortAsc,
  SortDesc,
  Grid,
  List,
  Smartphone,
  Laptop,
  Monitor,
  Tablet,
  Watch,
  Camera,
  Speaker,
  Mouse,
  Keyboard,
  Gamepad2,
  Power,
  Battery,
  Wifi,
  Bluetooth,
  Usb,
  Cpu,
  MemoryStick,
  HardDrive,
  Shield,
  Lock,
  Unlock,
  Key,
  Bell,
  BellOff,
  Mail,
  Phone,
  MessageSquare,
  Send,
  Home,
  Store,
  MapPin,
  Globe,
  Info,
  HelpCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader,
  Star,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Flag,
  Bookmark,
  Share,
  Copy,
  ClipboardPaste,
  Scissors,
  Undo,
  Redo,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Move,
  Navigation,
  Compass,
  Map,
  Route,
  Car,
  Truck,
  Plane,
  Ship,
  Train,
  Bus,
  Bike,
  CircuitBoard,
  Code,
  Terminal,
  Bug,
  Wrench,
  Hammer,
  Paintbrush,
  Palette,
  Image,
  Video,
  Music,
  Volume2,
  VolumeX,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Rewind,
  FastForward,
  Repeat,
  Shuffle,
  Mic,
  MicOff,
  Camera as CameraIcon,
  Paperclip,
  Link,
  ExternalLink,
  Folder,
  FolderOpen,
  File,
  FileText as Document,
  FilePlus,
  FileX,
  Moon,
  Sun,
  CloudRain,
  CloudSnow,
  Wind,
  Thermometer,
  Droplets,
  Flame,
  Snowflake,
  Rainbow,
  Sunrise,
  Sunset
} from 'lucide-react';

// Icon mapping object for easy replacement of emojis
export const icons = {
  // Dashboard & Analytics
  dashboard: BarChart3,
  analytics: TrendingUp,
  multiCurrency: Coins,
  coins: Coins,
  
  // Products & Inventory
  products: Package,
  package: Package,
  dollarSign: DollarSign,
  creditCard: CreditCard,
  accessories: Headphones,
  archived: Archive,
  phone: Smartphone,
  laptop: Laptop,
  tablet: Tablet,
  watch: Watch,
  camera: Camera,
  speaker: Speaker,
  
  // Sales & Commerce
  sales: ShoppingCart,
  salesHistory: Receipt,
  buyingHistory: ShoppingBag,
  receipt: Receipt,
  cart: ShoppingCart,
  
  // Financial
  customerDebts: CreditCard,
  companyDebts: Building2,
  incentives: DollarSign,
  personalLoans: HandHeart,
  money: Banknote,
  wallet: Wallet,
  calculator: Calculator,
  
  // Reports & Documents
  monthlyReports: FileText,
  reports: FileBarChart,
  chart: PieChart,
  activity: Activity,
  
  // System & Settings
  backup: Cloud,
  settings: Settings,
  logout: LogOut,
  save: Save,
  database: Database,
  server: Server,
  
  // Actions
  add: Plus,
  edit: Edit,
  delete: Trash2,
  remove: X,
  search: Search,
  filter: Filter,
  refresh: RefreshCw,
  download: Download,
  upload: Upload,
  
  // Status & Feedback
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: AlertCircle,
  loading: Loader,
  
  // Navigation
  up: ChevronUp,
  down: ChevronDown,
  left: ChevronLeft,
  right: ChevronRight,
  menu: MoreHorizontal,
  
  // Business
  company: Building2,
  store: Store,
  briefcase: Briefcase,
  target: Target,
  award: Award,
  
  // Communication
  call: Phone,
  mail: Mail,
  message: MessageSquare,
  notification: Bell,
  
  // Time & Calendar
  calendar: Calendar,
  clock: Clock,
  
  // View modes
  grid: Grid,
  list: List,
  layout: Grid,
  
  // Security
  lock: Lock,
  unlock: Unlock,
  shield: Shield,
  key: Key,
  
  // General
  home: Home,
  about: Info,
  help: HelpCircle,
  star: Star,
  heart: Heart,
  flag: Flag,
  bookmark: Bookmark,
  
  // Technology
  cpu: Cpu,
  memory: MemoryStick,
  storage: HardDrive,
  battery: Battery,
  power: Power,
  wifi: Wifi,
  bluetooth: Bluetooth,
  usb: Usb,
  
  // Tools
  tools: Wrench,
  hammer: Hammer,
  screwdriver: Wrench,
  
  // Media
  image: Image,
  video: Video,
  music: Music,
  volume: Volume2,
  mute: VolumeX,
  
  // File operations
  folder: Folder,
  file: File,
  document: Document,
  copy: Copy,
  paste: ClipboardPaste,
  clipboard: ClipboardPaste,
  
  // Additional icon aliases for compatibility
  'refresh-cw': RefreshCw,
  'bar-chart': BarChart3,
  'barChart3': BarChart3,
  'chevron-up': ChevronUp,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'dollar-sign': DollarSign,
  'credit-card': CreditCard,
  check: Check,
  plus: Plus,
  smartphone: Smartphone,
  user: User,
  
  // Weather/Environment (if needed)
  sun: Sun,
  moon: Moon,
  cloud: Cloud,
  rain: CloudRain,
  snow: CloudSnow,
  wind: Wind,
  
  // Miscellaneous
  zap: Zap,
  flame: Flame,
  droplets: Droplets,
  globe: Globe,
  map: Map,
  compass: Compass
};

// Helper component for consistent icon styling
export const Icon = ({ 
  name, 
  size = 20, 
  className = '', 
  color = 'currentColor',
  strokeWidth = 2,
  ...props 
}) => {
  const IconComponent = icons[name];
  
  if (!IconComponent) {
    return null;
  }
  
  return (
    <IconComponent
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      className={className}
      {...props}
    />
  );
};

// Predefined icon sizes for consistency
export const iconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64
};

// Common icon combinations for specific UI elements
export const iconCombos = {
  // Navigation icons with labels
  nav: {
    dashboard: { icon: 'dashboard', label: 'Dashboard' },
    analytics: { icon: 'analytics', label: 'Analytics' },
    products: { icon: 'products', label: 'Products' },
    accessories: { icon: 'accessories', label: 'Accessories' },
    archived: { icon: 'archived', label: 'Archived' },
    sales: { icon: 'sales', label: 'Sales' },
    buyingHistory: { icon: 'buyingHistory', label: 'Buying History' },
    customerDebts: { icon: 'customerDebts', label: 'Customer Debts' },
    companyDebts: { icon: 'companyDebts', label: 'Company Debts' },
    incentives: { icon: 'incentives', label: 'Incentives' },
    personalLoans: { icon: 'personalLoans', label: 'Personal Loans' },
    monthlyReports: { icon: 'monthlyReports', label: 'Reports' },
    backup: { icon: 'backup', label: 'Backup' },
    settings: { icon: 'settings', label: 'Settings' },
    logout: { icon: 'logout', label: 'Logout' }
  },
  
  // Action icons
  actions: {
    add: { icon: 'add', label: 'Add' },
    edit: { icon: 'edit', label: 'Edit' },
    delete: { icon: 'delete', label: 'Delete' },
    search: { icon: 'search', label: 'Search' },
    filter: { icon: 'filter', label: 'Filter' },
    refresh: { icon: 'refresh', label: 'Refresh' },
    save: { icon: 'save', label: 'Save' },
    download: { icon: 'download', label: 'Download' },
    upload: { icon: 'upload', label: 'Upload' }
  },
  
  // Status icons
  status: {
    success: { icon: 'success', label: 'Success' },
    error: { icon: 'error', label: 'Error' },
    warning: { icon: 'warning', label: 'Warning' },
    info: { icon: 'info', label: 'Info' },
    loading: { icon: 'loading', label: 'Loading' }
  }
};

export default icons;

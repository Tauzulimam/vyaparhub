export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  unit: string;
  price: number;
  mrp: number;
  image: string;
  storeId: string;
  storeName: string;
  inStock: boolean;
  quantityAvailable?: number;
  isPopular?: boolean;
  isBuyAgain?: boolean;
  rating?: number;
  description?: string;
}

export interface Store {
  id: string;
  name: string;
  category: string;
  distanceKm: number;
  rating: number;
  reviewCount: number;
  deliveryTimeMin: string;
  isOpen: boolean;
  image: string;
  address: string;
  phone?: string;
  timing?: string;
  description?: string;
  categoriesOffered?: string[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  itemCount: number;
  image: string;
  description?: string;
}

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export interface SearchBarProps {
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearch?: (query: string) => void;
  onClear?: () => void;
  className?: string;
  autoFocus?: boolean;
  ariaLabel?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CartStore {
  id: string;
  name: string;
  deliveryTimeMin?: string;
  distanceKm?: number;
  address?: string;
}

export interface Address {
  id: string;
  tag: 'Home' | 'Work' | 'Other';
  name: string;
  phone: string;
  addressLine: string;
  landmark?: string;
  city: string;
  pincode: string;
  isDefault?: boolean;
}

export type OrderStatus =
  | 'PLACED'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  brand: string;
  unit: string;
  price: number;
  mrp: number;
  quantity: number;
  image: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  storeId: string;
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  taxes: number;
  total: number;
  status: OrderStatus;
  deliveryAddress: Address;
  deliveryInstructions?: string;
  paymentMethod: 'COD' | 'MOCK_UPI' | 'MOCK_CARD';
  paymentStatus: 'PENDING' | 'PAID';
  estimatedDeliveryTime: string;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  currentLocation: string;
  memberSince: string;
  savedAddresses: Address[];
  preferences: {
    vegetarianOnly: boolean;
    smsUpdates: boolean;
    whatsappUpdates: boolean;
    defaultNotes: string;
  };
}

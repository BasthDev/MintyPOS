import {
  Activity,
  BarChart3,
  Boxes, // Added for stock/inventory grouping
  ChefHat,
  ClipboardList,
  Coins,
  CreditCard,
  Folder,
  Layers,
  Package,
  Receipt,
  Scale,
  Settings,
  ShoppingCart,
  Sparkles,
  Store, // Added for catalog grouping
  Tag,
  Truck,
  User,
  Users,
} from 'lucide-react-native';

export type UserRole = 'Admin' | 'Manager' | 'Cashier' | 'Staff';

export interface SubMenuItem {
  title: string;
  path: string;
  icon: any;
  roles: UserRole[];
}

export interface MenuItem {
  title: string;
  path: string;
  icon: any;
  roles: UserRole[];
  children?: SubMenuItem[];
}

export const DRAWER_MENU_ITEMS: MenuItem[] = [
  {
    title: 'POS',
    path: '/',
    icon: ShoppingCart,
    roles: ['Admin', 'Manager', 'Staff'],
  },
  {
    title: 'Orders',
    path: '/orders',
    icon: ClipboardList,
    roles: ['Admin', 'Manager', 'Staff'],
  },
  // --- GROUP 1: CATALOG MANAGEMENT ---
  {
    title: 'Catalog',
    path: '/products',
    icon: Store,
    roles: ['Admin', 'Manager'],
    children: [
      {
        title: 'Products',
        path: '/products',
        icon: Package,
        roles: ['Admin', 'Manager'],
      },
      {
        title: 'Categories',
        path: '/categories',
        icon: Folder,
        roles: ['Admin', 'Manager'],
      },
    ],
  },
  // --- GROUP 2: INVENTORY & PRODUCTION ---
  {
    title: 'Inventory & Stock',
    path: '/inventory',
    icon: Boxes,
    roles: ['Admin', 'Manager'],
    children: [
      {
        title: 'Inventory',
        path: '/inventory',
        icon: Layers,
        roles: ['Admin', 'Manager'],
      },
      {
        title: 'Ingredients',
        path: '/ingredients',
        icon: Scale,
        roles: ['Admin', 'Manager'],
      },
      {
        title: 'Recipes',
        path: '/recipes',
        icon: ChefHat,
        roles: ['Admin', 'Manager'],
      },
      {
        title: 'Suppliers',
        path: '/suppliers',
        icon: Truck,
        roles: ['Admin', 'Manager'],
      },
    ],
  },
  {
    title: 'Activity',
    path: '/activity',
    icon: Activity,
    roles: ['Admin', 'Manager'],
  },
  {
    title: 'Reports',
    path: '/reports',
    icon: BarChart3,
    roles: ['Admin', 'Manager'],
  },
  // --- GROUP: CUSTOMERS & CRM ---
  {
    title: 'Customers & CRM',
    path: '/customers',
    icon: User,
    roles: ['Admin', 'Manager'],
    children: [
      {
        title: 'Customers',
        path: '/customers',
        icon: User,
        roles: ['Admin', 'Manager'],
      },
      {
        title: 'CRM & Loyalty',
        path: '/crm',
        icon: Sparkles,
        roles: ['Admin', 'Manager'],
      },
    ],
  },
  // --- EXISTING GROUP: PAYMENT & TAXES ---
  {
    title: 'Payment & Taxes',
    path: '/payment-methods',
    icon: Coins,
    roles: ['Admin', 'Manager'],
    children: [
      {
        title: 'Payment Methods',
        path: '/payment-methods',
        icon: CreditCard,
        roles: ['Admin', 'Manager'],
      },
      {
        title: 'Tax & Service',
        path: '/tax-service',
        icon: Receipt,
        roles: ['Admin', 'Manager'],
      },
      {
        title: 'Discounts',
        path: '/discounts',
        icon: Tag,
        roles: ['Admin', 'Manager'],
      },
    ],
  },
  {
    title: 'Staff',
    path: '/staff',
    icon: Users,
    roles: ['Admin', 'Manager'],
  },
  {
    title: 'Settings',
    path: '/settings',
    icon: Settings,
    roles: ['Admin', 'Manager'],
  },
];
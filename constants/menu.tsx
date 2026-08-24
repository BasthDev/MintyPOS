import {
  Activity,
  BarChart3,
  ChefHat,
  ClipboardList,
  Layers,
  Package,
  Scale,
  Settings,
  ShoppingCart,
  Truck,
  Users
} from 'lucide-react-native';

export type UserRole = 'Admin' | 'Manager' | 'Staff';

export interface MenuItem {
  title: string;
  path: string;
  icon: any;
  roles: UserRole[];
}

export const DRAWER_MENU_ITEMS: MenuItem[] = [
  {
    title: 'POS',
    path: '/',
    icon: ShoppingCart,
    roles: ['Admin', 'Manager', 'Staff'],
  },
  {
    title: 'Products',
    path: '/products',
    icon: Package,
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
    title: 'Inventory',
    path: '/inventory',
    icon: Layers,
    roles: ['Admin', 'Manager'],
  },
  {
    title: 'Activity',
    path: '/activity',
    icon: Activity,
    roles: ['Admin', 'Manager'],
  },
  {
    title: 'Suppliers',
    path: '/suppliers',
    icon: Truck,
    roles: ['Admin', 'Manager'],
  },
  {
    title: 'Categories',
    path: '/categories',
    icon: Package,
    roles: ['Admin', 'Manager'],
  },
  {
    title: 'Orders',
    path: '/orders',
    icon: ClipboardList,
    roles: ['Admin', 'Manager', 'Staff'],
  },
  {
    title: 'Reports',
    path: '/reports',
    icon: BarChart3,
    roles: ['Admin', 'Manager'],
  },
  {
    title: 'Staff',
    path: '/staff',
    icon: Users,
    roles: ['Admin'],
  },
  {
    title: 'Settings',
    path: '/settings',
    icon: Settings,
    roles: ['Admin', 'Manager'],
  },
];
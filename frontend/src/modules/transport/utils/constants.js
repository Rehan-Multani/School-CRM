import {
  LayoutDashboard,
  Bus,
  UserCheck,
  Route,
  MapPin,
  Users,
  Wrench,
  Fuel,
  CreditCard,
  ShieldAlert,
  Send,
  BarChart3,
  History,
  Bell,
  Settings
} from 'lucide-react';

export const NAVIGATION_ITEMS = [
  // MAIN
  { name: 'Dashboard', path: '/transport/dashboard', icon: LayoutDashboard, category: 'Main' },
  
  // FLEET
  { name: 'Vehicle Directory', path: '/transport/vehicles', icon: Bus, category: 'Fleet' },
  { name: 'Driver Management', path: '/transport/drivers', icon: UserCheck, category: 'Fleet' },
  
  // OPERATIONS
  { name: 'Route Management', path: '/transport/routes', icon: Route, category: 'Operations' },
  { name: 'Pickup & Drop Points', path: '/transport/pickup-points', icon: MapPin, category: 'Operations' },
  { name: 'Student Assignments', path: '/transport/assignments', icon: Users, category: 'Operations' },
  
  // SERVICE
  { name: 'Maintenance Log', path: '/transport/maintenance', icon: Wrench, category: 'Service' },
  { name: 'Fuel Records', path: '/transport/fuel', icon: Fuel, category: 'Service' },
  
  // FINANCE
  { name: 'Transport Fee Status', path: '/transport/fees', icon: CreditCard, category: 'Finance' },
  
  // COMMUNICATION
  { name: 'Emergency Desk', path: '/transport/emergency', icon: ShieldAlert, category: 'Communication' },
  { name: 'Broadcast Messages', path: '/transport/communication', icon: Send, category: 'Communication' },
  
  // SYSTEM
  { name: 'Reports & Analytics', path: '/transport/reports', icon: BarChart3, category: 'System' },
  { name: 'Audit Logs', path: '/transport/audit', icon: History, category: 'System' },
  { name: 'Notifications', path: '/transport/notifications', icon: Bell, category: 'System' },
  { name: 'Transport Settings', path: '/transport/settings', icon: Settings, category: 'System' }
];

export const MOCK_VEHICLES = [];
export const MOCK_DRIVERS = [];
export const MOCK_ROUTES = [];
export const MOCK_PICKUP_POINTS = [];
export const MOCK_ASSIGNMENTS = [];
export const MOCK_MAINTENANCE = [];
export const MOCK_FUEL_LOGS = [];
export const MOCK_LOGS = [];
export const MOCK_STUDENTS = [];

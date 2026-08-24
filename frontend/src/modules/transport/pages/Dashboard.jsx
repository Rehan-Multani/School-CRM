import React from 'react';
import { useTransportAuth } from '../context/TransportAuthContext';
import { useTransportNotifications } from '../context/TransportNotificationContext';
import { 
  Bus, 
  UserCheck, 
  Route, 
  MapPin, 
  Users, 
  Wrench, 
  Fuel, 
  ShieldAlert,
  ArrowRight,
  PlusCircle,
  CalendarDays,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { AreaChart } from '../components/ui/Charts/AreaChart';
import { BarChart } from '../components/ui/Charts/BarChart';
import { PieChart } from '../components/ui/Charts/PieChart';
import { LineChart } from '../components/ui/Charts/LineChart';
import { formatDate, formatCurrency } from '../utils/formatters';
import { MOCK_VEHICLES, MOCK_DRIVERS, MOCK_ROUTES, MOCK_PICKUP_POINTS, MOCK_ASSIGNMENTS, MOCK_MAINTENANCE } from '../utils/constants';

import { useAppStore } from '../../../shared/store/useAppStore';

export const Dashboard = () => {
  const { user } = useTransportAuth();
  const { notifications } = useTransportNotifications();
  const navigate = useNavigate();
  const { transport = {} } = useAppStore();
  
  // Compute Dashboard Statistics from real state
  const vehicles = transport.vehicles || [];
  const routes = transport.routes || [];
  const totalVehicles = vehicles.length;
  const activeVehicles = vehicles.filter(v => v.currentStatus === 'Active' || v.status === 'ACTIVE').length;
  const inactiveVehicles = vehicles.filter(v => v.currentStatus === 'Inactive' || v.status === 'INACTIVE').length;
  const maintenanceVehicles = vehicles.filter(v => v.currentStatus === 'Maintenance' || v.status === 'MAINTENANCE').length;
  
  const totalDrivers = 0;
  const activeDrivers = 0;
  const studentsCount = 0;
  
  const totalRoutes = routes.length;
  const totalPickups = 0;
  const pendingMaintenanceCount = 0;
  
  const insuranceExpCount = 0;
  const fitnessExpCount = 0;
  const licenseExpCount = 0;

  // Chart datasets (empty when no real data exists)
  const vehicleTypeData = [];
  const studentsPerRouteData = [];
  const maintenanceCostData = [];
  const fuelCostData = [];
  const routeOccupancyData = [];

  const quickActions = [
    { name: 'Add Vehicle', icon: PlusCircle, path: '/transport/vehicles', state: { openAddWizard: true }, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/20' },
    { name: 'Add Driver', icon: PlusCircle, path: '/transport/drivers', state: { openAddWizard: true }, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-955/20' },
    { name: 'Create Route', icon: Route, path: '/transport/routes', state: { openAddWizard: true }, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-955/20' },
    { name: 'Assign Student', icon: Users, path: '/transport/assignments', color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-955/20' },
    { name: 'Log Maintenance', icon: Wrench, path: '/transport/maintenance', color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-955/20' },
    { name: 'View Reports', icon: FileText, path: '/transport/reports', color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-955/20' }
  ];

  return (
    <div className="space-y-6">
      {/* Header Profile Section */}
      <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 rounded-3xl p-6 md:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md shadow-cyan-900/10">
        <div className="flex items-center gap-4">
          <img
            src={user?.photoUrl}
            alt={user?.name}
            className="h-16 w-16 rounded-full border-2 border-white/20 shrink-0"
          />
          <div className="space-y-1">
            <h2 className="text-xl md:text-2xl font-black">Welcome back, {user?.name}!</h2>
            <p className="text-xs text-cyan-100 font-semibold flex items-center gap-1.5 opacity-90">
              <span>{user?.schoolName}</span>
              <span className="h-1 w-1 bg-white/40 rounded-full" />
              <span>Session {user?.academicSession}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-2xl self-start md:self-auto border border-white/15">
          <CalendarDays className="h-4.5 w-4.5 text-cyan-200" />
          <span className="text-xs font-bold font-mono uppercase tracking-wider">{formatDate(new Date())}</span>
        </div>
      </div>

      {/* Expiry warnings notification panel */}
      {(insuranceExpCount > 0 || licenseExpCount > 0 || fitnessExpCount > 0) && (
        <div className="p-4 bg-rose-50 border border-rose-100 dark:bg-rose-955/10 dark:border-rose-900/20 rounded-2xl flex gap-3 text-xs text-rose-800 dark:text-rose-400">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 animate-bounce" />
          <div className="space-y-1 flex-1">
            <p className="font-bold">Attention Required: Critical Document Expiries Detected</p>
            <p className="text-3xs text-slate-500 dark:text-slate-400">
              You have document expiries approaching.
            </p>
          </div>
          <button 
            onClick={() => navigate('/transport/notifications')}
            className="text-xs font-bold underline hover:no-underline shrink-0"
          >
            Resolve Alerts
          </button>
        </div>
      )}

      {/* Grid statistics (16 Stats) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard title="Total Vehicles" value={totalVehicles === 0 ? "00" : totalVehicles} icon={Bus} />
        <StatCard title="Active Fleet" value={activeVehicles === 0 ? "00" : activeVehicles} icon={Bus} />
        <StatCard title="Fleet Inactive" value={inactiveVehicles === 0 ? "00" : inactiveVehicles} icon={Bus} />
        <StatCard title="Under Service" value={maintenanceVehicles === 0 ? "00" : maintenanceVehicles} icon={Wrench} />
        <StatCard title="Total Drivers" value="0" icon={UserCheck} />
        <StatCard title="Active Drivers" value="0" icon={UserCheck} />
        <StatCard title="Total Students" value="0" icon={Users} />
        <StatCard title="Total Routes" value={totalRoutes === 0 ? "00" : totalRoutes} icon={Route} />
        <StatCard title="Pickup Stops" value="0" icon={MapPin} />
        <StatCard title="Pending Service" value={pendingMaintenanceCount} icon={Wrench} />
        <StatCard title="Ins. Expiring" value={insuranceExpCount} icon={ShieldAlert} />
        <StatCard title="Lic. Expiring" value={licenseExpCount} icon={ShieldAlert} />
      </div>

      {/* Quick Actions Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 rounded-3xl p-6">
        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4">Operations & Fleet Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.name}
                onClick={() => navigate(act.path, { state: act.state })}
                className="flex flex-col items-center justify-center p-4 border border-slate-200 dark:border-slate-850 hover:border-cyan-400 dark:hover:border-cyan-900/50 rounded-2xl hover:shadow-xs transition-all duration-200 group text-center"
              >
                <div className={`p-3 rounded-xl mb-3 group-hover:scale-105 transition-transform duration-205 ${act.color}`}>
                  <Icon className="h-5.5 w-5.5" />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-350">{act.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fuel Cost Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 lg:col-span-2">
          <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4">Weekly Fuel Cost Analysis</h3>
          <AreaChart data={fuelCostData} dataKey="Cost" xKey="name" />
        </div>

        {/* Fleet Composition Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 rounded-3xl p-6">
          <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4">Fleet Composition</h3>
          <PieChart data={vehicleTypeData} />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Maintenance Cost Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
          <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4">Maintenance Spendings (INR)</h3>
          <BarChart data={maintenanceCostData} dataKey="Cost" xKey="name" />
        </div>

        {/* Route Occupancy Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 rounded-3xl p-6">
          <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4">Route Utilization %</h3>
          <BarChart data={routeOccupancyData} dataKey="Utilization" xKey="name" />
        </div>

        {/* Students Per Route Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 rounded-3xl p-6">
          <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4">Students per Route</h3>
          <PieChart data={studentsPerRouteData} />
        </div>
      </div>
    </div>
  );
};
export default Dashboard;

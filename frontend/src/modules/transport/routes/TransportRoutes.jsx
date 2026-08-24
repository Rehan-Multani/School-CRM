import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { TransportLayout } from '../components/layout/TransportLayout';
import { Dashboard } from '../pages/Dashboard';
import { VehicleList } from '../pages/vehicles/VehicleList';
import { VehicleDetail } from '../pages/vehicles/VehicleDetail';
import { DriverList } from '../pages/drivers/DriverList';
import { DriverDetail } from '../pages/drivers/DriverDetail';
import { RouteList } from '../pages/routes/RouteList';
import { PickupPoints } from '../pages/pickupPoints/PickupPoints';
import { StudentAssignments } from '../pages/assignments/StudentAssignments';
import { MaintenanceManagement } from '../pages/maintenance/MaintenanceManagement';
import { FuelManagement } from '../pages/fuel/FuelManagement';
import { TransportFee } from '../pages/transportFee/TransportFee';
import { EmergencyManagement } from '../pages/emergency/EmergencyManagement';
import { Communication } from '../pages/communication/Communication';
import { Reports } from '../pages/reports/Reports';
import { Notifications } from '../pages/notifications/Notifications';
import { AuditLogs } from '../pages/audit/AuditLogs';
import { Settings } from '../pages/settings/Settings';

export const TransportRoutes = () => {
  return (
    <Routes>
      <Route element={<TransportLayout />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="vehicles" element={<VehicleList />} />
        <Route path="vehicles/:id" element={<VehicleDetail />} />
        <Route path="drivers" element={<DriverList />} />
        <Route path="drivers/:id" element={<DriverDetail />} />
        <Route path="routes" element={<RouteList />} />
        <Route path="pickup-points" element={<PickupPoints />} />
        <Route path="assignments" element={<StudentAssignments />} />
        <Route path="maintenance" element={<MaintenanceManagement />} />
        <Route path="fuel" element={<FuelManagement />} />
        <Route path="fees" element={<TransportFee />} />
        <Route path="emergency" element={<EmergencyManagement />} />
        <Route path="communication" element={<Communication />} />
        <Route path="reports" element={<Reports />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="audit" element={<AuditLogs />} />
        <Route path="settings" element={<Settings />} />
        
        {/* Default redirects */}
        <Route path="" element={<Navigate to="dashboard" replace />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>
    </Routes>
  );
};

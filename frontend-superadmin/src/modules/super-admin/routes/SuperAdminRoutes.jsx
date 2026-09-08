import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSuperAdminAuth } from '../context/SuperAdminAuthContext';
import { Pulse, KpiSkeleton } from '../components/ui/SkeletonLoader';
import Dashboard from '../pages/dashboard/Dashboard';
import SchoolsIndex from '../pages/schools/SchoolsIndex';
import SubscriptionsIndex from '../pages/subscriptions/SubscriptionsIndex';
import NotificationsIndex from '../pages/notifications/NotificationsIndex';
import RevenueIndex from '../pages/revenue/RevenueIndex';
import BillingIndex from '../pages/billing/BillingIndex';
import ReportsIndex from '../pages/reports/ReportsIndex';
import PrivacyPolicyIndex from '../pages/privacy/PrivacyPolicyIndex';
import SupportIndex from '../pages/support/SupportIndex';
import SettingsIndex from '../pages/settings/SettingsIndex';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useSuperAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950">
        <div className="mb-6 space-y-2">
          <Pulse className="h-7 w-56" />
          <Pulse className="h-3 w-80" />
        </div>
        <div className="mb-6">
          <KpiSkeleton count={4} />
        </div>
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          {Array.from({ length: 6 }).map((_, index) => (
            <Pulse key={index} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/super-admin/login" replace />;
  }

  return children;
};

export const SuperAdminRoutes = () => {
  return (
    <Routes>
      <Route
        path="dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="schools"
        element={
          <ProtectedRoute>
            <SchoolsIndex />
          </ProtectedRoute>
        }
      />
      <Route
        path="subscriptions"
        element={
          <ProtectedRoute>
            <SubscriptionsIndex />
          </ProtectedRoute>
        }
      />
      <Route
        path="notifications"
        element={
          <ProtectedRoute>
            <NotificationsIndex />
          </ProtectedRoute>
        }
      />
      <Route
        path="revenue"
        element={
          <ProtectedRoute>
            <RevenueIndex />
          </ProtectedRoute>
        }
      />
      <Route
        path="billing"
        element={
          <ProtectedRoute>
            <BillingIndex />
          </ProtectedRoute>
        }
      />
      <Route
        path="reports"
        element={
          <ProtectedRoute>
            <ReportsIndex />
          </ProtectedRoute>
        }
      />
      <Route
        path="privacy-policy"
        element={
          <ProtectedRoute>
            <PrivacyPolicyIndex />
          </ProtectedRoute>
        }
      />
      <Route
        path="support"
        element={
          <ProtectedRoute>
            <SupportIndex />
          </ProtectedRoute>
        }
      />
      <Route
        path="settings"
        element={
          <ProtectedRoute>
            <SettingsIndex />
          </ProtectedRoute>
        }
      />
      <Route path="" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
};

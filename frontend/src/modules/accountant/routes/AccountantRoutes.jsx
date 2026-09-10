import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from '../pages/Dashboard';
import { FeeCollection } from '../pages/fee-collection/FeeCollection';
import { FeeStructure } from '../pages/fee-structure/FeeStructure';
import { InstallmentManagement } from '../pages/installments/InstallmentManagement';
import { DuesPendingFees } from '../pages/dues/DuesPendingFees';
import { Expenses } from '../pages/expenses/Expenses';
import { ReceiptManagement } from '../pages/receipts/ReceiptManagement';
import { Transactions } from '../pages/transactions/Transactions';
import { Notifications } from '../pages/notifications/Notifications';
import { FinancialReports } from '../pages/reports/FinancialReports';
import { Settings } from '../pages/settings/Settings';

export const AccountantRoutes = () => {
  return (
    <Routes>
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="fee-collection" element={<FeeCollection />} />
      <Route path="fee-structure" element={<FeeStructure />} />
      <Route path="installments" element={<InstallmentManagement />} />
      <Route path="dues" element={<DuesPendingFees />} />
      <Route path="expenses" element={<Expenses />} />
      <Route path="receipts" element={<ReceiptManagement />} />
      <Route path="transactions" element={<Transactions />} />
      <Route path="notifications" element={<Notifications />} />
      <Route path="reports" element={<FinancialReports />} />
      <Route path="settings" element={<Settings />} />

      {/* Legacy Fallback Redirects */}
      <Route path="discounts" element={<Navigate to="../fee-structure" replace />} />
      <Route path="late-fees" element={<Navigate to="../fee-structure" replace />} />
      <Route path="refunds" element={<Navigate to="../transactions" replace />} />
      <Route path="student-history" element={<Navigate to="../dues" replace />} />
      <Route path="audit" element={<Navigate to="../transactions" replace />} />

      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
};
export default AccountantRoutes;

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from '../pages/Dashboard';
import { FeeCollection } from '../pages/fee-collection/FeeCollection';
import { ReceiptManagement } from '../pages/receipts/ReceiptManagement';
import { InstallmentManagement } from '../pages/installments/InstallmentManagement';
import { DiscountScholarship } from '../pages/discounts/DiscountScholarship';
import { LateFeeManagement } from '../pages/late-fees/LateFeeManagement';
import { RefundManagement } from '../pages/refunds/RefundManagement';
import { FinancialReports } from '../pages/reports/FinancialReports';
import { StudentFinancialHistory } from '../pages/student-history/StudentFinancialHistory';
import { AuditLogs } from '../pages/audit/AuditLogs';
import { Notifications } from '../pages/notifications/Notifications';
import { Settings } from '../pages/settings/Settings';

export const AccountantRoutes = () => {
  return (
    <Routes>
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="fee-collection" element={<FeeCollection />} />
      <Route path="receipts" element={<ReceiptManagement />} />
      <Route path="installments" element={<InstallmentManagement />} />
      <Route path="discounts" element={<DiscountScholarship />} />
      <Route path="late-fees" element={<LateFeeManagement />} />
      <Route path="refunds" element={<RefundManagement />} />
      <Route path="reports" element={<FinancialReports />} />
      <Route path="student-history" element={<StudentFinancialHistory />} />
      <Route path="audit" element={<AuditLogs />} />
      <Route path="notifications" element={<Notifications />} />
      <Route path="settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
};
export default AccountantRoutes;

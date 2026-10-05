import React from 'react';
import { SchoolReportsHub } from '../../../../shared/components/SchoolReportsHub';
import { schoolPortalApi } from '../../../../shared/api/client';
import { useSchoolAdminAuth } from '../../context/SchoolAdminAuthContext';

// Module-level so the reference stays stable across renders.
const reportsApi = {
  summary: () => schoolPortalApi.reportsSummary(),
  data: (category, params) => schoolPortalApi.reportData(category, params),
};

export const ReportsHub = () => {
  const { user } = useSchoolAdminAuth();
  return <SchoolReportsHub api={reportsApi} schoolName={user?.schoolName || ''} />;
};

export default ReportsHub;

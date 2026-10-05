import React from 'react';
import { SchoolReportsHub } from '../../../../shared/components/SchoolReportsHub';
import { principalReportApi } from '../../../../shared/api/client';
import { usePrincipalAuth } from '../../context/PrincipalAuthContext';

export const Reports = () => {
  const { user } = usePrincipalAuth();
  return <SchoolReportsHub api={principalReportApi} schoolName={user?.schoolName || ''} />;
};

export default Reports;

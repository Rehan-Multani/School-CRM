import React from 'react';
import VisitorManager from '../../../../shared/components/visitors/VisitorManager';
import { schoolAdminVisitorApi } from '../../../../shared/api/client';

export const VisitorsPage = () => <VisitorManager api={schoolAdminVisitorApi} canEdit={false} />;

export default VisitorsPage;

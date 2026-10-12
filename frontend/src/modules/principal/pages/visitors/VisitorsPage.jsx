import React from 'react';
import VisitorManager from '../../../../shared/components/visitors/VisitorManager';
import { principalVisitorApi } from '../../../../shared/api/client';

export const VisitorsPage = () => <VisitorManager api={principalVisitorApi} canEdit={false} />;

export default VisitorsPage;

import React from 'react';
import VisitorManager from '../../../../shared/components/visitors/VisitorManager';
import { hrVisitorApi } from '../../../../shared/api/client';

export const VisitorsPage = () => <VisitorManager api={hrVisitorApi} canEdit={true} />;

export default VisitorsPage;

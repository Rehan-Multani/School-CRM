import React from 'react';
import { SchoolBackup } from '../../../school-admin/pages/backup/SchoolBackup';
import { principalBackupApi } from '../../../../shared/api/client';

export const PrincipalBackup = () => <SchoolBackup api={principalBackupApi} adminControls={false} />;

export default PrincipalBackup;

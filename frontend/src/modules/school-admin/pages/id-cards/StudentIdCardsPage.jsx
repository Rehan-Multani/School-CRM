import React from 'react';
import StudentIdCards from '../../../../shared/components/StudentIdCards';
import { schoolAdminIdCardApi } from '../../../../shared/api/client';

export const StudentIdCardsPage = () => <StudentIdCards api={schoolAdminIdCardApi} />;

export default StudentIdCardsPage;

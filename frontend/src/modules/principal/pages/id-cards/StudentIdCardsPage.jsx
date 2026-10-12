import React from 'react';
import StudentIdCards from '../../../../shared/components/StudentIdCards';
import { principalIdCardApi } from '../../../../shared/api/client';

export const StudentIdCardsPage = () => <StudentIdCards api={principalIdCardApi} />;

export default StudentIdCardsPage;

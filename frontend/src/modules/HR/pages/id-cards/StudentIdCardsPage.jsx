import React from 'react';
import StudentIdCards from '../../../../shared/components/StudentIdCards';
import { hrIdCardApi } from '../../../../shared/api/client';

export const StudentIdCardsPage = () => <StudentIdCards api={hrIdCardApi} />;

export default StudentIdCardsPage;

import React from 'react';
import StaffSelfAttendance from '../../../../shared/components/StaffSelfAttendance';
import { librarianSelfAttendanceApi } from '../../../../shared/api/client';

export const MyAttendance = () => <StaffSelfAttendance api={librarianSelfAttendanceApi} />;

export default MyAttendance;

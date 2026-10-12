import React from 'react';
import StaffSelfAttendance from '../../../../shared/components/StaffSelfAttendance';
import { accountantSelfAttendanceApi } from '../../../../shared/api/client';

export const MyAttendance = () => <StaffSelfAttendance api={accountantSelfAttendanceApi} />;

export default MyAttendance;

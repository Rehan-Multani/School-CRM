import React from 'react';
import StaffSelfAttendance from '../../../../shared/components/StaffSelfAttendance';
import { hrSelfAttendanceApi } from '../../../../shared/api/client';

export const MyAttendance = () => <StaffSelfAttendance api={hrSelfAttendanceApi} />;

export default MyAttendance;

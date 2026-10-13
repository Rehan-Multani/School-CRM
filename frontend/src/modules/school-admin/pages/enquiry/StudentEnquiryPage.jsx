import React from 'react';
import StudentEnquiryManager from '../../../../shared/components/enquiry/StudentEnquiryManager';
import { schoolAdminStudentEnquiryApi } from '../../../../shared/api/client';

export const StudentEnquiryPage = () => <StudentEnquiryManager api={schoolAdminStudentEnquiryApi} />;

export default StudentEnquiryPage;

import React from 'react';
import StudentEnquiryManager from '../../../../shared/components/enquiry/StudentEnquiryManager';
import { hrStudentEnquiryApi } from '../../../../shared/api/client';

export const StudentEnquiryPage = () => <StudentEnquiryManager api={hrStudentEnquiryApi} />;

export default StudentEnquiryPage;

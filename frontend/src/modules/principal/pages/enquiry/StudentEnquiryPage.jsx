import React from 'react';
import StudentEnquiryManager from '../../../../shared/components/enquiry/StudentEnquiryManager';
import { principalStudentEnquiryApi } from '../../../../shared/api/client';

export const StudentEnquiryPage = () => <StudentEnquiryManager api={principalStudentEnquiryApi} />;

export default StudentEnquiryPage;

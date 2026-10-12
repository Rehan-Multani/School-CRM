import React from 'react';
import CertificateManager from '../../../../shared/components/certificates/CertificateManager';
import { schoolAdminCertificateApi } from '../../../../shared/api/client';

export const CertificatesPage = () => <CertificateManager api={schoolAdminCertificateApi} />;

export default CertificatesPage;

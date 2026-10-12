import React from 'react';
import CertificateManager from '../../../../shared/components/certificates/CertificateManager';
import { principalCertificateApi } from '../../../../shared/api/client';

export const CertificatesPage = () => <CertificateManager api={principalCertificateApi} />;

export default CertificatesPage;

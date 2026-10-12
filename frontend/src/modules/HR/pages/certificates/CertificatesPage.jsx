import React from 'react';
import CertificateManager from '../../../../shared/components/certificates/CertificateManager';
import { hrCertificateApi } from '../../../../shared/api/client';

export const CertificatesPage = () => <CertificateManager api={hrCertificateApi} />;

export default CertificatesPage;

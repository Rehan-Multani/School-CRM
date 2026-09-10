ï»¿import React from 'react';
import LegalPage from '../components/LegalPage';

export const TermsPage = () => (
  <LegalPage
    docTitle="Terms of Service"
    kicker="Legal"
    which="termsOfService"
    other={{ to: '/privacy', label: 'Privacy Policy' }}
  />
);

export default TermsPage;

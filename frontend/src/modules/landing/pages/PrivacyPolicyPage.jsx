import React from 'react';
import LegalPage from '../components/LegalPage';

export const PrivacyPolicyPage = () => (
  <LegalPage
    docTitle="Privacy Policy"
    kicker="Legal"
    which="privacyPolicy"
    other={{ to: '/terms', label: 'Terms of Service' }}
  />
);

export default PrivacyPolicyPage;

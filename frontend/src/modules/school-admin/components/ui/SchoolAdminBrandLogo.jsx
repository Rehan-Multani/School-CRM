import React from 'react';
import defaultLogo from '../../../../assets/School_logo.png';
import { useSchoolAdminAuth } from '../../context/SchoolAdminAuthContext';

/**
 * branding prop (optional) — when passed it takes full priority and the
 * component does NOT fall back to the logged-in user's stored data.
 * This is used on the login page so that a school's logo only appears
 * after its email is recognised, not from a previously-logged-in session.
 */
export default function SchoolAdminBrandLogo({ className = 'h-9 w-9', alt, branding, useAuth = true }) {
  const { user } = useSchoolAdminAuth();

  let src, schoolName;

  if (branding !== undefined) {
    // Explicit branding passed (e.g. login page): use only what was fetched,
    // never fall back to stored session data.
    src = branding?.logo || defaultLogo;
    schoolName = branding?.schoolName || 'School';
  } else if (useAuth) {
    // Normal authenticated pages: prefer live user, then localStorage cache.
    const storedBranding = JSON.parse(localStorage.getItem('school-admin-branding') || '{}');
    src = user?.brandingLogo || storedBranding.logo || defaultLogo;
    schoolName = user?.schoolName || storedBranding.schoolName || 'School';
  } else {
    src = defaultLogo;
    schoolName = 'School';
  }

  const resolvedAlt = alt || `${schoolName} admin logo`;

  return <img src={src} alt={resolvedAlt} className={`block rounded-lg object-contain ${className}`} />;
}

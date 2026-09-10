import React from 'react';
import bundledLogo from '../../assets/School_logo.png';
import { usePlatformLogo } from '../platformBrand';

export default function BrandLogo({ className = 'h-9 w-9', alt = 'School CRM' }) {
  const logo = usePlatformLogo();
  // Treat empty string as null to avoid passing empty src to img tag
  const logoUrl = logo && typeof logo === 'string' && logo.trim() ? logo : bundledLogo;

  return (
    <img
      src={logoUrl}
      alt={alt}
      onError={(e) => {
        if (e.currentTarget.src !== bundledLogo) e.currentTarget.src = bundledLogo;
      }}
      className={`block rounded-lg object-contain ${className}`}
    />
  );
}

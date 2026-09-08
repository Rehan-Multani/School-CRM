import React from 'react';
import schoolLogo from '../../assets/School_logo.png';

export default function BrandLogo({ className = 'h-9 w-9', alt = 'School CRM' }) {
  return (
    <img
      src={schoolLogo}
      alt={alt}
      className={`block rounded-lg object-contain ${className}`}
    />
  );
}

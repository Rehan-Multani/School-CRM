import React from 'react';
import bundledLogo from '../../assets/School_logo.png';
import { usePlatformLogo } from '../platformBrand';

export default function BrandLogo({ className = 'h-9 w-9', alt = 'School CRM' }) {
  const logo = usePlatformLogo();
  return (
    <img
      src={logo || bundledLogo}
      alt={alt}
      onError={(e) => {
        if (e.currentTarget.src !== bundledLogo) e.currentTarget.src = bundledLogo;
      }}
      className={`block rounded-lg object-contain ${className}`}
    />
  );
}

import React, { useState } from 'react';
import { cn } from '../lib/cn';

// Canonical merged Avatar — superset of teacher (hashed color background
// per name, sizes sm/md/lg/xl) and parent (div-wrapped image with an `xs`
// size and a flat primary-tinted fallback). Uses parent's more robust
// "always wrap in a sized div" structure (avoids a broken-image icon
// flashing before onError fires) combined with teacher's colorful
// per-name initials background.
export const Avatar = ({ src, name, size = 'md', className }) => {
  const [imgError, setImgError] = useState(false);

  const sizes = {
    xs: 'w-6 h-6 text-[9px]',
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-16 h-16 text-base',
  };

  const initials = name
    ? name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const colors = [
    'bg-primary text-white',
    'bg-emerald-500 text-white',
    'bg-violet-500 text-white',
    'bg-amber-500 text-white',
    'bg-rose-500 text-white',
    'bg-sky-500 text-white',
  ];
  const colorIndex = name ? name.charCodeAt(0) % colors.length : 0;

  const showImage = src && !imgError;

  return (
    <div className={cn(
      "rounded-2xl overflow-hidden border border-border flex items-center justify-center font-bold shrink-0 select-none",
      sizes[size] || sizes.md,
      !showImage && (colors[colorIndex] || 'bg-primary/10 text-primary'),
      className
    )}>
      {showImage ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};

export default Avatar;

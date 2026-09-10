import React, { useState } from 'react';
import { cn } from '../../utils/cn';

export function UserAvatar({ src, name, className = 'h-8 w-8 rounded-lg text-xs' }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  const initial = (name || 'L').trim().charAt(0).toUpperCase();

  if (showImage) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        className={cn('object-cover border border-slate-200 dark:border-slate-800', className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center border border-primary/20 bg-primary/10 font-bold text-primary',
        className
      )}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}

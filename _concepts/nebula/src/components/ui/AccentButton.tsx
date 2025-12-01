'use client';

import clsx from 'clsx';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

export type AccentButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost';
};

export const AccentButton = forwardRef<HTMLButtonElement, AccentButtonProps>(
  ({ variant = 'primary', className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          'rounded-full px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.45em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400',
          variant === 'primary'
            ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-900 shadow-neon'
            : 'border border-slate-700 text-slate-200 hover:border-cyan-400',
          className
        )}
        {...props}
      />
    );
  }
);

AccentButton.displayName = 'AccentButton';

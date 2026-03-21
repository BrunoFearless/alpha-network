'use client';
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Spinner } from './Spinner';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variants = {
  primary:   'bg-gold text-alpha-bg hover:bg-gold-light font-semibold',
  secondary: 'border border-gold text-gold hover:bg-gold/10',
  ghost:     'text-text-secondary hover:text-text-primary hover:bg-white/5',
  danger:    'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-md',
  md: 'px-4 py-2 rounded-lg',
  lg: 'px-6 py-3 text-lg rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, children, className, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-30 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : children}
    </button>
  ),
);

Button.displayName = 'Button';

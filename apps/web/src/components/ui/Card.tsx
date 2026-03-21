import { HTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered';
}

const variants = {
  default:  'bg-alpha-card',
  elevated: 'bg-alpha-card shadow-lg shadow-black/30',
  bordered: 'bg-alpha-card border border-alpha-border',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx('rounded-xl', variants[variant], className)}
      {...props}
    >
      {children}
    </div>
  ),
);
Card.displayName = 'Card';

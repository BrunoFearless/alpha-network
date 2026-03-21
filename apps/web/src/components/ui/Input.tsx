'use client';
import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const baseInput = 'w-full bg-alpha-card border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-gold/50';
const normalBorder = 'border-alpha-border focus:border-gold/40';
const errorBorder  = 'border-red-500/50 focus:border-red-500';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm text-text-secondary font-medium">{label}</label>}
      <input
        ref={ref}
        className={clsx(baseInput, error ? errorBorder : normalBorder, className)}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
    </div>
  ),
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm text-text-secondary font-medium">{label}</label>}
      <textarea
        ref={ref}
        className={clsx(baseInput, error ? errorBorder : normalBorder, 'resize-y min-h-[80px]', className)}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
    </div>
  ),
);
Textarea.displayName = 'Textarea';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, helperText, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold tracking-wider uppercase text-zinc-600 dark:text-zinc-400"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={cn(
            'flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900',
            'placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-black focus:border-black',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-white dark:focus:border-white',
            className
          )}
          {...props}
        />
        {helperText && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

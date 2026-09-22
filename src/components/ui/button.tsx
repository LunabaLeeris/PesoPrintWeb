import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

    const variants = {
      primary: 'bg-black text-white hover:bg-zinc-800 focus:ring-zinc-400 dark:bg-white dark:text-black dark:hover:bg-zinc-200',
      secondary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 focus:ring-zinc-400 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700',
      outline: 'border border-zinc-300 bg-transparent text-zinc-900 hover:bg-zinc-100 focus:ring-zinc-400 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800',
      ghost: 'bg-transparent text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 focus:ring-zinc-400',
      danger: 'border border-zinc-400 bg-white text-zinc-900 hover:bg-zinc-100 dark:bg-black dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-900 focus:ring-zinc-400',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      md: 'h-10 px-4 text-sm gap-2',
      lg: 'h-12 px-6 text-base gap-2.5',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

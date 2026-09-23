'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Minus, Plus } from 'lucide-react';

export type StepperButtonType = 'decrement' | 'increment';

export interface StepperButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: StepperButtonType;
  isDisabled?: boolean;
}

export const StepperButton: React.FC<StepperButtonProps> = ({
  variant,
  isDisabled = false,
  className,
  onClick,
  ...props
}) => {
  const isDec = variant === 'decrement';

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={onClick}
      aria-label={isDec ? 'Decrease copy amount' : 'Increase copy amount'}
      className={cn(
        'h-[58px] sm:h-[62px] w-[76px] sm:w-[84px] flex items-center justify-center transition-all duration-150 select-none cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        isDec
          ? 'bg-[#FDD41F] hover:bg-[#F2C917] active:bg-[#E5BD0F] text-[#1E232F] rounded-l-[18px] focus-visible:ring-[#FDD41F]'
          : 'bg-[#34418E] hover:bg-[#2A3575] active:bg-[#222B60] text-white rounded-r-[18px] focus-visible:ring-[#34418E]',
        isDisabled && 'opacity-40 cursor-not-allowed active:scale-100',
        !isDisabled && 'active:scale-95',
        className
      )}
      {...props}
    >
      {isDec ? (
        <Minus className="w-6 h-6 stroke-[3]" />
      ) : (
        <Plus className="w-6 h-6 stroke-[3]" />
      )}
    </button>
  );
};

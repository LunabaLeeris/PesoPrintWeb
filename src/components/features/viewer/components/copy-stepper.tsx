'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { StepperButton } from './stepper-button';
import { CopyAmountInput } from './copy-amount-input';

export interface CopyStepperProps {
  amount: number;
  onAmountChange: (newAmount: number) => void;
  min?: number;
  max?: number;
  className?: string;
  disabled?: boolean;
}

export const CopyStepper: React.FC<CopyStepperProps> = ({
  amount,
  onAmountChange,
  min = 1,
  max = 99,
  className,
  disabled = false,
}) => {
  const handleDecrement = () => {
    if (disabled || amount <= min) return;
    onAmountChange(amount - 1);
  };

  const handleIncrement = () => {
    if (disabled || amount >= max) return;
    onAmountChange(amount + 1);
  };

  return (
    <div
      role="group"
      aria-label="Document page copy amount selector"
      className={cn(
        'inline-flex items-center rounded-[18px] overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,0.14)]',
        'border border-black/[0.04]',
        className
      )}
    >
      {/* Decrement Button (-) */}
      <StepperButton
        variant="decrement"
        isDisabled={disabled || amount <= min}
        onClick={handleDecrement}
      />

      {/* Amount Display & Input */}
      <CopyAmountInput
        value={amount}
        onChange={onAmountChange}
        min={min}
        max={max}
        disabled={disabled}
      />

      {/* Increment Button (+) */}
      <StepperButton
        variant="increment"
        isDisabled={disabled || amount >= max}
        onClick={handleIncrement}
      />
    </div>
  );
};

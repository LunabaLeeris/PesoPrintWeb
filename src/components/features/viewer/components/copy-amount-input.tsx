'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface CopyAmountInputProps {
  value: number;
  onChange: (newValue: number) => void;
  min?: number;
  max?: number;
  className?: string;
  disabled?: boolean;
}

export const CopyAmountInput: React.FC<CopyAmountInputProps> = ({
  value,
  onChange,
  min = 1,
  max = 99,
  className,
  disabled = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());

  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const handleBlur = () => {
    setIsEditing(false);
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(clamped);
      setInputValue(clamped.toString());
    } else {
      setInputValue(value.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setInputValue(value.toString());
      setIsEditing(false);
    }
  };

  return (
    <div
      onClick={() => !disabled && setIsEditing(true)}
      className={cn(
        'h-[58px] sm:h-[62px] px-5 sm:px-7 bg-[#F7F8FA] border-y border-[#ECEEF2]',
        'flex flex-col items-center justify-center select-none cursor-pointer',
        'min-w-[85px] sm:min-w-[95px] transition-colors',
        isEditing && 'bg-white ring-2 ring-inset ring-[#34418E]/30',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {isEditing ? (
        <input
          type="number"
          min={min}
          max={max}
          autoFocus
          value={inputValue}
          disabled={disabled}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-14 text-center font-bold text-[22px] sm:text-[24px] text-[#1E232F] bg-transparent outline-none p-0 m-0"
          aria-label="Edit number of copies"
        />
      ) : (
        <span className="font-bold text-[22px] sm:text-[24px] text-[#1E232F] leading-tight tracking-tight">
          {value}
        </span>
      )}
      <span className="text-[11px] sm:text-[12px] font-medium text-[#7C808E] tracking-tight -mt-0.5">
        Amount
      </span>
    </div>
  );
};

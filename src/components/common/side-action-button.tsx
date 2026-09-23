'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export type SidePosition = 'left' | 'right';

export interface SideActionButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  side: SidePosition;
  y?: number | string;
  icon: React.ReactNode | string;
  iconAlt?: string;
  bgColor?: string;
  borderColor?: string;
  textColor?: string;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
}

function resolveIconPath(iconPath: string): string {
  if (iconPath.startsWith('/') || iconPath.startsWith('http')) {
    return iconPath;
  }
  return `/icons/${iconPath}`;
}

export const SideActionButton: React.FC<SideActionButtonProps> = ({
  side,
  y = '175px',
  icon,
  iconAlt = 'Side action',
  bgColor,
  borderColor,
  textColor,
  onClick,
  className,
  ariaLabel,
  disabled = false,
  ...props
}) => {
  const isLeft = side === 'left';

  // Determine custom inline styles if hex/rgb is passed
  const isHexOrRgbBg = bgColor?.startsWith('#') || bgColor?.startsWith('rgb');
  const isHexOrRgbBorder = borderColor?.startsWith('#') || borderColor?.startsWith('rgb');
  const isHexOrRgbText = textColor?.startsWith('#') || textColor?.startsWith('rgb');

  const topPosition = typeof y === 'number' ? `${y}px` : y;

  const defaultClasses = isLeft
    ? cn(
      !bgColor && 'bg-white',
      !borderColor && 'border-[#E2E4E9]',
      !textColor && 'text-[#050315]',
      'shadow-[2px_4px_18px_rgba(0,0,0,0.08)] rounded-r-[18px] sm:rounded-r-[20px] rounded-l-none border-y border-r'
    )
    : cn(
      !bgColor && 'bg-[#34418E]',
      !borderColor && 'border-[#2A3575]',
      !textColor && 'text-white',
      'shadow-[-2px_4px_18px_rgba(52,65,142,0.25)] rounded-l-[18px] sm:rounded-l-[20px] rounded-r-none border-y border-l'
    );

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel || (isLeft ? 'Left side action' : 'Right side action')}
      style={{
        top: topPosition,
        ...(isHexOrRgbBg ? { backgroundColor: bgColor } : {}),
        ...(isHexOrRgbBorder ? { borderColor } : {}),
        ...(isHexOrRgbText ? { color: textColor } : {}),
      }}
      className={cn(
        // High z-index & fixed screen edge positioning (does not move when scrolling)
        'fixed z-50 transition-all duration-150 select-none cursor-pointer',
        'w-[54px] sm:w-[62px] h-[54px] sm:h-[62px]',
        'flex items-center justify-center p-2.5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34418E] focus-visible:ring-offset-2',
        isLeft ? 'left-0 active:translate-x-0.5' : 'right-0 active:-translate-x-0.5',
        disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'hover:brightness-95 active:scale-95',
        defaultClasses,
        !isHexOrRgbBg && bgColor,
        !isHexOrRgbBorder && borderColor,
        !isHexOrRgbText && textColor,
        className
      )}
      {...props}
    >
      {typeof icon === 'string' ? (
        <Image
          src={resolveIconPath(icon)}
          alt={iconAlt}
          width={26}
          height={26}
          className="w-6 h-6 sm:w-7 sm:h-7 object-contain pointer-events-none"
          priority
        />
      ) : (
        icon
      )}
    </button>
  );
};

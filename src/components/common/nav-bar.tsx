import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export interface NavBarProps extends React.HTMLAttributes<HTMLElement> {
  onLogoClick?: () => void;
  onQuestionClick?: () => void;
  className?: string;
}

export const NavBar: React.FC<NavBarProps> = ({
  onLogoClick,
  onQuestionClick,
  className,
  ...props
}) => {
  return (
    <header
      className={cn(
        'w-full bg-white rounded-b-[24px] sm:rounded-b-[28px]',
        'shadow-[0_4px_20px_rgba(0,0,0,0.05)] border-b border-black/[0.03]',
        'z-20 relative select-none',
        className
      )}
      {...props}
    >
      <div className="w-full max-w-[430px] mx-auto px-6 py-4 sm:py-5 flex items-center justify-between">
      {/* Left Ellipse Panel (Logo / Printer Icon) */}
      <div
        onClick={onLogoClick}
        role={onLogoClick ? 'button' : undefined}
        tabIndex={onLogoClick ? 0 : undefined}
        aria-label="Peso Print Home"
        className={cn(
          'w-[54px] h-[54px] rounded-full bg-[#FAFAFC] border border-[#E9E9ED]',
          'flex items-center justify-center overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)]',
          'transition-transform duration-150',
          onLogoClick && 'cursor-pointer active:scale-95'
        )}
      >
        <Image
          src="/illustrations/icon.svg"
          alt="Peso Print Icon"
          width={44}
          height={38}
          className="w-auto h-auto max-w-[42px] max-h-[38px] object-contain pointer-events-none"
          priority
        />
      </div>

      {/* Right Ellipse Panel (Question / Help Button) */}
      <button
        type="button"
        onClick={onQuestionClick}
        aria-label="Ask Question or Help"
        className={cn(
          'w-[54px] h-[54px] rounded-full bg-white border border-[#E9E9ED]',
          'flex items-center justify-center p-2 shadow-[0_2px_8px_rgba(0,0,0,0.05)]',
          'hover:bg-[#FAFAFA] active:scale-95 transition-all duration-150 cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34418E]'
        )}
      >
        <Image
          src="/illustrations/questions.svg"
          alt="Questions / Help"
          width={36}
          height={30}
          className="w-auto h-auto max-w-[34px] max-h-[28px] object-contain pointer-events-none"
          priority
        />
      </button>
      </div>
    </header>
  );
};

import React, { forwardRef, KeyboardEvent, ReactNode } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export interface ModalPanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  illustration?: string;
  illustrationAlt?: string;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  isClickable?: boolean;
  onClick?: () => void;
  children?: ReactNode;
  className?: string;
}

// Helper to normalize illustration path to /illustrations/<name>
function getIllustrationPath(nameOrPath: string): string {
  if (nameOrPath.startsWith('/') || nameOrPath.startsWith('http')) {
    return nameOrPath;
  }
  return `/illustrations/${nameOrPath}`;
}

export interface ModalPanelIconProps extends React.HTMLAttributes<HTMLDivElement> {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
}

export const ModalPanelIcon = ({
  src,
  alt = 'Illustration',
  width = 160,
  height = 145,
  className,
  ...props
}: ModalPanelIconProps) => {
  const resolvedSrc = getIllustrationPath(src);
  return (
    <div
      className={cn(
        'relative flex items-center justify-center mx-auto mb-5 select-none',
        'w-36 h-32 sm:w-40 sm:h-36',
        className
      )}
      {...props}
    >
      <Image
        src={resolvedSrc}
        alt={alt}
        width={width}
        height={height}
        className="w-auto h-full max-h-36 object-contain pointer-events-none"
        priority
      />
    </div>
  );
};

export interface ModalPanelTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  className?: string;
  children: ReactNode;
}

export const ModalPanelTitle = ({ className, children, ...props }: ModalPanelTitleProps) => (
  <h2
    className={cn(
      'text-[19px] sm:text-[20px] font-bold text-[#2A2F3D] tracking-tight leading-snug text-center mb-2',
      className
    )}
    {...props}
  >
    {children}
  </h2>
);

export interface ModalPanelDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  className?: string;
  children: ReactNode;
}

export const ModalPanelDescription = ({
  className,
  children,
  ...props
}: ModalPanelDescriptionProps) => (
  <p
    className={cn(
      'text-[14px] sm:text-[15px] font-normal text-[#5A5E6B] leading-relaxed text-center max-w-[260px] mx-auto',
      className
    )}
    {...props}
  >
    {children}
  </p>
);

export interface ModalPanelActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: ReactNode;
}

export const ModalPanelActions = ({ className, children, ...props }: ModalPanelActionsProps) => (
  <div
    className={cn(
      'w-full mt-6 grid grid-cols-2 gap-3 items-center justify-center',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export interface ModalPanelComponent
  extends React.ForwardRefExoticComponent<ModalPanelProps & React.RefAttributes<HTMLDivElement>> {
  Icon: typeof ModalPanelIcon;
  Title: typeof ModalPanelTitle;
  Description: typeof ModalPanelDescription;
  Actions: typeof ModalPanelActions;
}

export const ModalPanel = forwardRef<HTMLDivElement, ModalPanelProps>(
  (
    {
      illustration,
      illustrationAlt,
      title,
      description,
      actions,
      isClickable = false,
      onClick,
      children,
      className,
      ...props
    },
    ref
  ) => {
    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
      if (isClickable && onClick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onClick();
      }
      props.onKeyDown?.(e);
    };

    return (
      <div
        ref={ref}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onClick={isClickable ? onClick : undefined}
        onKeyDown={handleKeyDown}
        aria-label={
          isClickable && typeof title === 'string' ? title : undefined
        }
        className={cn(
          'relative w-full bg-white rounded-[24px] sm:rounded-[28px] px-6 sm:px-8 py-[70px]',
          'flex flex-col items-center justify-center text-center',
          'shadow-[0_12px_36px_rgba(0,0,0,0.07)] border border-white/60',
          'transition-all duration-200 select-none',
          isClickable && [
            'cursor-pointer',
            'hover:shadow-[0_16px_44px_rgba(0,0,0,0.11)] hover:-translate-y-0.5',
            'active:scale-[0.985] active:shadow-[0_6px_20px_rgba(0,0,0,0.06)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34418E] focus-visible:ring-offset-2',
          ],
          className
        )}
        {...props}
      >
        {/* Shorthand or Compound */}
        {illustration && (
          <ModalPanelIcon src={illustration} alt={illustrationAlt || (typeof title === 'string' ? title : 'Illustration')} />
        )}
        {title && <ModalPanelTitle>{title}</ModalPanelTitle>}
        {description && <ModalPanelDescription>{description}</ModalPanelDescription>}
        {actions && <ModalPanelActions>{actions}</ModalPanelActions>}
        {children}
      </div>
    );
  }
) as ModalPanelComponent;

ModalPanel.displayName = 'ModalPanel';
ModalPanel.Icon = ModalPanelIcon;
ModalPanel.Title = ModalPanelTitle;
ModalPanel.Description = ModalPanelDescription;
ModalPanel.Actions = ModalPanelActions;

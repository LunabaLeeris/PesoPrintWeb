import React, { forwardRef, KeyboardEvent, ReactNode, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export interface ModalPanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  isOpen?: boolean;
  onClose?: () => void;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  backdropClassName?: string;
  containerClassName?: string;
  backdropTestId?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
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

export interface ModalPanelDetailsProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: ReactNode;
}

export const ModalPanelDetails = ({ className, children, ...props }: ModalPanelDetailsProps) => (
  <div
    className={cn(
      'w-full grid grid-cols-2 gap-x-4 gap-y-1.5 text-left text-[13.5px] sm:text-[14px] leading-relaxed mb-6 px-1',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export interface ModalPanelDetailItemProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: ReactNode;
  className?: string;
}

export const ModalPanelDetailItem = ({
  label,
  value,
  className,
  ...props
}: ModalPanelDetailItemProps) => (
  <div className={cn('text-[#5A5E6B] font-medium text-[13.5px] sm:text-[14px]', className)} {...props}>
    {label}: <span className="font-semibold text-[#2A2F3D]">{value}</span>
  </div>
);

export interface ModalPanelComponent
  extends React.ForwardRefExoticComponent<ModalPanelProps & React.RefAttributes<HTMLDivElement>> {
  Icon: typeof ModalPanelIcon;
  Title: typeof ModalPanelTitle;
  Description: typeof ModalPanelDescription;
  Actions: typeof ModalPanelActions;
  Details: typeof ModalPanelDetails;
  DetailItem: typeof ModalPanelDetailItem;
}

export const ModalPanel = forwardRef<HTMLDivElement, ModalPanelProps>(
  (
    {
      isOpen,
      onClose,
      closeOnBackdropClick = true,
      closeOnEscape = true,
      backdropClassName,
      containerClassName,
      backdropTestId,
      ariaLabelledBy,
      ariaDescribedBy,
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
    const isModal = isOpen !== undefined;

    // Handle Escape key when open as modal
    useEffect(() => {
      if (!isModal || !isOpen) return;

      const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
        if (e.key === 'Escape' && closeOnEscape) {
          onClose?.();
        }
      };

      window.addEventListener('keydown', handleGlobalKeyDown);
      return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [isModal, isOpen, closeOnEscape, onClose]);

    if (isModal && !isOpen) {
      return null;
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
      if (isClickable && onClick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onClick();
      }
      props.onKeyDown?.(e);
    };

    const cardContent = (
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
          isModal && 'py-8 sm:py-9 shadow-[0_16px_48px_rgba(0,0,0,0.14)]',
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
          <ModalPanelIcon
            src={illustration}
            alt={illustrationAlt || (typeof title === 'string' ? title : 'Illustration')}
          />
        )}
        {title && <ModalPanelTitle>{title}</ModalPanelTitle>}
        {description && <ModalPanelDescription>{description}</ModalPanelDescription>}
        {children}
        {actions && <ModalPanelActions>{actions}</ModalPanelActions>}
      </div>
    );

    if (!isModal) {
      return cardContent;
    }

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        className={cn(
          'fixed inset-0 z-[120] flex items-center justify-center p-4 select-none',
          containerClassName
        )}
      >
        {/* Dimmed backdrop */}
        <div
          data-testid={backdropTestId || 'modal-panel-backdrop'}
          onClick={closeOnBackdropClick ? onClose : undefined}
          aria-hidden="true"
          className={cn(
            'fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200',
            backdropClassName
          )}
        />

        {/* Modal Card Centered Container */}
        <div className="relative z-10 w-full max-w-[340px] sm:max-w-[360px] animate-in zoom-in-95 fade-in duration-150">
          {cardContent}
        </div>
      </div>
    );
  }
) as ModalPanelComponent;

ModalPanel.displayName = 'ModalPanel';
ModalPanel.Icon = ModalPanelIcon;
ModalPanel.Title = ModalPanelTitle;
ModalPanel.Description = ModalPanelDescription;
ModalPanel.Actions = ModalPanelActions;
ModalPanel.Details = ModalPanelDetails;
ModalPanel.DetailItem = ModalPanelDetailItem;

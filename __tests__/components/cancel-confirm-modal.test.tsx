import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CancelConfirmModal } from '@/components/features/viewer/components/cancel-confirm-modal';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ src, alt, priority, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  },
}));

describe('CancelConfirmModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    isDeleting: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal dialog with illustration, title, description, and buttons when isOpen is true', () => {
    render(<CancelConfirmModal {...defaultProps} />);

    // Dialog role
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Illustration
    const img = screen.getByAltText(/cancel confirmation/i);
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/illustrations/confirmation.svg');

    // Title & description
    expect(screen.getByRole('heading', { name: /cancel printing\?/i })).toBeInTheDocument();
    expect(
      screen.getByText(/are you sure you want to cancel your printing session\? all details will be deleted permanently!/i)
    ).toBeInTheDocument();

    // Buttons: "No" and "Cancel"
    expect(screen.getByRole('button', { name: /^no$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<CancelConfirmModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('calls onClose when "No" button is clicked', () => {
    render(<CancelConfirmModal {...defaultProps} />);

    const noButton = screen.getByRole('button', { name: /^no$/i });
    fireEvent.click(noButton);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('calls onConfirm when "Cancel" button is clicked', () => {
    render(<CancelConfirmModal {...defaultProps} />);

    const cancelButton = screen.getByRole('button', { name: /^cancel$/i });
    fireEvent.click(cancelButton);

    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when clicking the backdrop', () => {
    render(<CancelConfirmModal {...defaultProps} />);

    const backdrop = screen.getByTestId('cancel-modal-backdrop');
    fireEvent.click(backdrop);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    render(<CancelConfirmModal {...defaultProps} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('prevents closing and disables buttons when isDeleting is true', () => {
    render(<CancelConfirmModal {...defaultProps} isDeleting={true} />);

    const noButton = screen.getByRole('button', { name: /^no$/i });
    const cancelButton = screen.getByRole('button', { name: /^cancel$/i });

    expect(noButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();

    // Backdrop click should not close
    const backdrop = screen.getByTestId('cancel-modal-backdrop');
    fireEvent.click(backdrop);
    expect(defaultProps.onClose).not.toHaveBeenCalled();

    // Escape key should not close
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });
});

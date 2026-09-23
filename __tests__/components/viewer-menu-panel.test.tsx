import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  ViewerMenuPanel,
  PAPER_SIZE_OPTIONS,
  ORIENTATION_OPTIONS,
  COLOR_SCHEME_OPTIONS,
} from '@/components/features/viewer/components/viewer-menu-panel';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, priority, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  },
}));

describe('ViewerMenuPanel', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onOrganizePages: jest.fn(),
    onPrint: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all menu panel elements when open', () => {
    render(<ViewerMenuPanel {...defaultProps} />);

    // Title
    expect(screen.getByRole('heading', { name: /menu/i })).toBeInTheDocument();

    // Quick actions
    expect(screen.getByRole('button', { name: /organize pages/i })).toBeInTheDocument();

    // Dropdowns
    expect(screen.getByLabelText(/paper size/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/orientation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/color scheme/i)).toBeInTheDocument();

    // Print button
    expect(screen.getByRole('button', { name: /^print$/i })).toBeInTheDocument();

    // Footer
    expect(screen.getByText(/peso print - 2026/i)).toBeInTheDocument();
  });

  it('marks panel as hidden when isOpen is false', () => {
    render(<ViewerMenuPanel {...defaultProps} isOpen={false} />);

    const panel = screen.getByTestId('viewer-menu-panel');
    expect(panel).toHaveAttribute('aria-hidden', 'true');
    expect(panel).toHaveClass('translate-x-full');
  });

  it('calls onClose when close tab button is clicked', () => {
    render(<ViewerMenuPanel {...defaultProps} />);

    const closeBtn = screen.getByRole('button', { name: /close menu panel/i });
    fireEvent.click(closeBtn);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    render(<ViewerMenuPanel {...defaultProps} />);

    const backdrop = screen.getByTestId('viewer-menu-backdrop');
    fireEvent.click(backdrop);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    render(<ViewerMenuPanel {...defaultProps} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onOrganizePages when Organize Pages is clicked', () => {
    render(<ViewerMenuPanel {...defaultProps} />);

    const organizeBtn = screen.getByRole('button', { name: /organize pages/i });
    fireEvent.click(organizeBtn);

    expect(defaultProps.onOrganizePages).toHaveBeenCalledTimes(1);
  });

  it('calls onPrint when Print button is clicked', () => {
    render(<ViewerMenuPanel {...defaultProps} />);

    const printBtn = screen.getByRole('button', { name: /^print$/i });
    fireEvent.click(printBtn);

    expect(defaultProps.onPrint).toHaveBeenCalledTimes(1);
  });

  it('handles dropdown option changes', () => {
    const onPaperSizeChange = jest.fn();
    const onOrientationChange = jest.fn();
    const onColorSchemeChange = jest.fn();

    render(
      <ViewerMenuPanel
        {...defaultProps}
        onPaperSizeChange={onPaperSizeChange}
        onOrientationChange={onOrientationChange}
        onColorSchemeChange={onColorSchemeChange}
      />
    );

    // Paper size change
    const paperSizeSelect = screen.getByLabelText(/paper size/i);
    fireEvent.change(paperSizeSelect, { target: { value: 'Letter' } });
    expect(onPaperSizeChange).toHaveBeenCalledWith('Letter');

    // Orientation change
    const orientationSelect = screen.getByLabelText(/orientation/i);
    fireEvent.change(orientationSelect, { target: { value: 'Landscape' } });
    expect(onOrientationChange).toHaveBeenCalledWith('Landscape');

    // Color scheme change
    const colorSchemeSelect = screen.getByLabelText(/color scheme/i);
    fireEvent.change(colorSchemeSelect, { target: { value: 'Color' } });
    expect(onColorSchemeChange).toHaveBeenCalledWith('Color');
  });

  it('exports expected standard options', () => {
    expect(PAPER_SIZE_OPTIONS).toContain('A4');
    expect(ORIENTATION_OPTIONS).toContain('Portrait');
    expect(COLOR_SCHEME_OPTIONS).toContain('B&W');
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PageThumbnailCard } from '@/components/features/viewer/components/page-thumbnail-card';

describe('PageThumbnailCard', () => {
  const mockPage = {
    getViewport: () => ({ width: 400, height: 600 }),
    render: () => ({
      promise: Promise.resolve(),
      cancel: jest.fn(),
    }),
  };

  const mockPdfDoc = {
    getPage: jest.fn().mockResolvedValue(mockPage),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders page number badge and copy count circular badge', async () => {
    render(
      <PageThumbnailCard
        pageNumber={3}
        copies={4}
        pdfDoc={mockPdfDoc}
        onClick={jest.fn()}
      />
    );

    // Page badge
    expect(screen.getByText('Page 3')).toBeInTheDocument();

    // Copy amount in center circle
    expect(screen.getByText('4')).toBeInTheDocument();

    // Accessible role and label
    const button = screen.getByRole('button', { name: /page 3, 4 copies/i });
    expect(button).toBeInTheDocument();

    await waitFor(() => {
      expect(mockPdfDoc.getPage).toHaveBeenCalledWith(3);
    });
  });

  it('handles click event', async () => {
    const handleClick = jest.fn();
    render(
      <PageThumbnailCard
        pageNumber={1}
        copies={2}
        pdfDoc={mockPdfDoc}
        onClick={handleClick}
      />
    );

    const button = screen.getByRole('button', { name: /page 1/i });
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(mockPdfDoc.getPage).toHaveBeenCalledWith(1);
    });
  });

  it('handles keyboard navigation (Enter key)', async () => {
    const handleClick = jest.fn();
    render(
      <PageThumbnailCard
        pageNumber={2}
        copies={1}
        pdfDoc={mockPdfDoc}
        onClick={handleClick}
      />
    );

    const button = screen.getByRole('button', { name: /page 2/i });
    fireEvent.keyDown(button, { key: 'Enter' });

    expect(handleClick).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(mockPdfDoc.getPage).toHaveBeenCalledWith(2);
    });
  });
});

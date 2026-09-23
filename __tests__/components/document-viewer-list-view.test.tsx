import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DocumentViewer } from '@/components/features/viewer/document-viewer';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ src, alt, priority, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  },
}));

// Mock PDF.js
jest.mock('pdfjs-dist/build/pdf.js', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: 4,
      getPage: () =>
        Promise.resolve({
          getViewport: () => ({ width: 500, height: 700 }),
          render: () => ({ promise: Promise.resolve(), cancel: jest.fn() }),
        }),
    }),
  }),
}));

jest.mock('@/services/kiosk-service', () => ({
  updateDocumentPrintOptions: jest.fn().mockResolvedValue({}),
  deleteDocumentRecord: jest.fn().mockResolvedValue(true),
}));

describe('DocumentViewer List View Toggle', () => {
  const dummyDoc = {
    id: 'doc-123',
    kiosk_id: 'kiosk-456',
    document_url: 'https://mock-storage.com/prints/kiosk-456/doc-123.pdf',
    name: 'sample.pdf',
    total_pages: 4,
    copies: 1,
    status: 'uploaded',
    created_at: new Date().toISOString(),
    options: [
      [1, 4],
      [2, 1],
      [3, 3],
      [4, 2],
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts in single page view and does not render zoom in/out side buttons', async () => {
    render(
      <DocumentViewer
        kioskId="kiosk-456"
        documentId="doc-123"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialDocument={dummyDoc as any}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading document preview/i)).not.toBeInTheDocument();
    });

    // Zoom in and out side action buttons should exist in single page view
    expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /zoom out/i })).toBeInTheDocument();

    // Left side action button should have "Switch to page list view" aria-label
    const leftButton = screen.getByRole('button', { name: /switch to page list view/i });
    expect(leftButton).toBeInTheDocument();
    const leftImg = leftButton.querySelector('img');
    expect(leftImg).toHaveAttribute('src', '/icons/cols.svg');
  });

  it('switches to list view when left side button is clicked and changes icon to pages.svg and hides zoom buttons', async () => {
    render(
      <DocumentViewer
        kioskId="kiosk-456"
        documentId="doc-123"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialDocument={dummyDoc as any}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading document preview/i)).not.toBeInTheDocument();
    });

    // Click left button (cols.svg)
    const toggleBtn = screen.getByRole('button', { name: /switch to page list view/i });
    fireEvent.click(toggleBtn);

    // Should now be in list view
    expect(screen.getByRole('region', { name: /document pages list/i })).toBeInTheDocument();

    // Zoom in and out side action buttons should NOT exist in list view
    expect(screen.queryByRole('button', { name: /zoom in/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /zoom out/i })).not.toBeInTheDocument();

    // Left button should now have pages.svg and label "Switch to single page view"
    const leftButtonAfter = screen.getByRole('button', { name: /switch to single page view/i });
    expect(leftButtonAfter).toBeInTheDocument();
    const leftImg = leftButtonAfter.querySelector('img');
    expect(leftImg).toHaveAttribute('src', '/icons/pages.svg');

    // Verify all 4 pages are rendered in list view with their copy counts
    await waitFor(() => {
      expect(screen.getByText('Page 1')).toBeInTheDocument();
      expect(screen.getByText('Page 2')).toBeInTheDocument();
      expect(screen.getByText('Page 3')).toBeInTheDocument();
      expect(screen.getByText('Page 4')).toBeInTheDocument();
    });

    // Copy amounts from options: [1, 4], [2, 1], [3, 3], [4, 2]
    expect(screen.getByRole('button', { name: /page 1, 4 copies/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /page 2, 1 copy/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /page 3, 3 copies/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /page 4, 2 copies/i })).toBeInTheDocument();
  });

  it('clicking a page thumbnail in list view switches back to single-page view for that page', async () => {
    render(
      <DocumentViewer
        kioskId="kiosk-456"
        documentId="doc-123"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialDocument={dummyDoc as any}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading document preview/i)).not.toBeInTheDocument();
    });

    // Switch to list view
    fireEvent.click(screen.getByRole('button', { name: /switch to page list view/i }));

    // Click on Page 3 thumbnail
    const page3Card = screen.getByRole('button', { name: /page 3, 3 copies/i });
    fireEvent.click(page3Card);

    // Should return to single page view on Page 3
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /document pages list/i })).toHaveClass('hidden');
      expect(screen.getByRole('region', { name: /document page viewer/i })).toBeVisible();
      expect(screen.getByText(/page 3\/4/i)).toBeInTheDocument();
    });
  });

  it('switches to list view and back via left button on same page without losing page render', async () => {
    render(
      <DocumentViewer
        kioskId="kiosk-456"
        documentId="doc-123"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialDocument={dummyDoc as any}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading document preview/i)).not.toBeInTheDocument();
    });

    // 1. Initially on Page 1 in single view
    expect(screen.getByText(/page 1\/4/i)).toBeInTheDocument();
    const singleViewer = screen.getByRole('region', { name: /document page viewer/i });
    expect(singleViewer).toBeVisible();

    // 2. Toggle to list view via left button (cols.svg)
    const leftBtn1 = screen.getByRole('button', { name: /switch to page list view/i });
    fireEvent.click(leftBtn1);

    // List view is active
    expect(screen.getByRole('region', { name: /document pages list/i })).not.toHaveClass('hidden');

    // 3. Toggle back to single view via left button (pages.svg)
    const leftBtn2 = screen.getByRole('button', { name: /switch to single page view/i });
    fireEvent.click(leftBtn2);

    // 4. Single view should be active and visible again
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /document pages list/i })).toHaveClass('hidden');
      expect(screen.getByRole('region', { name: /document page viewer/i })).toBeVisible();
      expect(screen.getByText(/page 1\/4/i)).toBeInTheDocument();
    });
  });
});

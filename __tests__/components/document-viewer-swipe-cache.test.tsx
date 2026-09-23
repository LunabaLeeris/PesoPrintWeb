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

const mockRenderTask = {
  promise: Promise.resolve(),
  cancel: jest.fn(),
};

const mockPageRender = jest.fn().mockReturnValue(mockRenderTask);

// Mock PDF.js
jest.mock('pdfjs-dist/build/pdf.js', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: 3,
      getPage: (pageNum: number) =>
        Promise.resolve({
          pageNumber: pageNum,
          getViewport: () => ({ width: 500, height: 700 }),
          render: mockPageRender,
        }),
    }),
  }),
}));

jest.mock('@/services/kiosk-service', () => ({
  updateDocumentPrintOptions: jest.fn().mockResolvedValue({}),
  deleteDocumentRecord: jest.fn().mockResolvedValue(true),
}));

describe('DocumentViewer Page Swiping & Caching', () => {
  const dummyDoc = {
    id: 'doc-swipe-test',
    kiosk_id: 'kiosk-456',
    document_url: 'https://mock-storage.com/prints/kiosk-456/doc-swipe.pdf',
    name: 'swipe-test.pdf',
    total_pages: 3,
    copies: 1,
    status: 'uploaded',
    created_at: new Date().toISOString(),
    options: [
      [1, 1],
      [2, 1],
      [3, 1],
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates through pages with arrow keys and swipe gestures without reloading previously visited pages', async () => {
    render(
      <DocumentViewer
        kioskId="kiosk-456"
        documentId="doc-swipe-test"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialDocument={dummyDoc as any}
      />
    );

    // Initial load: page 1 is rendered
    await waitFor(() => {
      expect(screen.queryByText(/loading document preview/i)).not.toBeInTheDocument();
      expect(screen.getByText(/page 1\/3/i)).toBeInTheDocument();
    });

    // Navigate to page 2 using ArrowRight key
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    await waitFor(() => {
      expect(screen.getByText(/page 2\/3/i)).toBeInTheDocument();
    });

    // Navigate to page 3 using Next Page button
    const nextBtn = screen.getByRole('button', { name: /next page/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText(/page 3\/3/i)).toBeInTheDocument();
    });

    // Record how many times render was called up to page 3
    const renderCallCount = mockPageRender.mock.calls.length;

    // Navigate back to page 2 (previously visited and cached)
    const prevBtn = screen.getByRole('button', { name: /previous page/i });
    fireEvent.click(prevBtn);

    await waitFor(() => {
      expect(screen.getByText(/page 2\/3/i)).toBeInTheDocument();
    });

    // Navigate back to page 1 (previously visited and cached)
    fireEvent.click(prevBtn);

    await waitFor(() => {
      expect(screen.getByText(/page 1\/3/i)).toBeInTheDocument();
    });

    // Verify that navigating back to already-visited pages does NOT trigger new PDF.js renders
    // because pages 1 and 2 are retrieved instantly from renderedPageCanvasCache
    expect(mockPageRender.mock.calls.length).toBeLessThanOrEqual(renderCallCount);
  });

  it('handles touch swipe events to advance and rewind pages', async () => {
    render(
      <DocumentViewer
        kioskId="kiosk-456"
        documentId="doc-swipe-test"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialDocument={dummyDoc as any}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/page 1\/3/i)).toBeInTheDocument();
    });

    const viewerSection = screen.getByRole('region', { name: /document page viewer/i });

    // Simulate Swipe Left (drag left: clientX from 250 to 150 -> deltaX = -100) -> Next Page
    fireEvent.touchStart(viewerSection, {
      touches: [{ clientX: 250, clientY: 200 }],
    });
    fireEvent.touchEnd(viewerSection, {
      changedTouches: [{ clientX: 150, clientY: 205 }],
    });

    await waitFor(() => {
      expect(screen.getByText(/page 2\/3/i)).toBeInTheDocument();
    });

    // Simulate Swipe Right (drag right: clientX from 150 to 250 -> deltaX = +100) -> Previous Page
    fireEvent.touchStart(viewerSection, {
      touches: [{ clientX: 150, clientY: 200 }],
    });
    fireEvent.touchEnd(viewerSection, {
      changedTouches: [{ clientX: 250, clientY: 205 }],
    });

    await waitFor(() => {
      expect(screen.getByText(/page 1\/3/i)).toBeInTheDocument();
    });
  });
});

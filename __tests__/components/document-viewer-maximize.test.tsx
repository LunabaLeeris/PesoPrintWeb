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
      numPages: 2,
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

describe('DocumentViewer Maximize / Minimize Feature', () => {
  const dummyDoc = {
    id: 'doc-max-test',
    kiosk_id: 'kiosk-456',
    document_url: 'https://mock-storage.com/prints/kiosk-456/doc-max.pdf',
    name: 'test.pdf',
    total_pages: 2,
    copies: 1,
    status: 'uploaded',
    created_at: new Date().toISOString(),
    options: [[1, 1], [2, 1]],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders maximize button in single page view and hides it in list view', async () => {
    render(
      <DocumentViewer
        kioskId="kiosk-456"
        documentId="doc-max-test"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialDocument={dummyDoc as any}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading document preview/i)).not.toBeInTheDocument();
    });

    // In single page view: maximize button should be present
    const maxBtn = screen.getByRole('button', { name: /maximize preview/i });
    expect(maxBtn).toBeInTheDocument();
    const maxImg = maxBtn.querySelector('img');
    expect(maxImg).toHaveAttribute('src', '/icons/maximize.svg');

    // Switch to list view
    const listToggleBtn = screen.getByRole('button', { name: /switch to page list view/i });
    fireEvent.click(listToggleBtn);

    // Maximize button should be hidden in list view
    expect(screen.queryByRole('button', { name: /maximize preview/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /minimize preview/i })).not.toBeInTheDocument();
  });

  it('hides list toggle, menu, and bottom stepper footer when maximized, keeping zoom in/out and navbar visible', async () => {
    render(
      <DocumentViewer
        kioskId="kiosk-456"
        documentId="doc-max-test"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialDocument={dummyDoc as any}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading document preview/i)).not.toBeInTheDocument();
    });

    // Before maximize: cancel, list toggle, menu, zoom in/out, and bottom stepper are all present
    expect(screen.getByRole('button', { name: /cancel printing session/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /switch to page list view/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /document menu options/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /zoom out/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /copy amount selector/i })).toBeInTheDocument();

    // Click maximize button
    const maxBtn = screen.getByRole('button', { name: /maximize preview/i });
    fireEvent.click(maxBtn);

    // After maximize:
    // 1. Maximize button turns into Minimize button
    const minBtn = screen.getByRole('button', { name: /minimize preview/i });
    expect(minBtn).toBeInTheDocument();
    const minImg = minBtn.querySelector('img');
    expect(minImg).toHaveAttribute('src', '/icons/minimize.svg');

    // 2. Cancel, List toggle, and Menu button are hidden
    expect(screen.queryByRole('button', { name: /cancel printing session/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /switch to page list view/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /document menu options/i })).not.toBeInTheDocument();

    // 3. Bottom copy stepper footer is hidden
    expect(screen.queryByRole('group', { name: /copy amount selector/i })).not.toBeInTheDocument();

    // 4. Zoom in and out buttons remain visible
    expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /zoom out/i })).toBeInTheDocument();

    // 5. Top NavBar remains visible
    expect(screen.getByRole('banner')).toBeInTheDocument();

    // Now click minimize button to restore normal view
    fireEvent.click(minBtn);

    // Cancel, List toggle, menu, and bottom stepper footer are restored
    expect(screen.getByRole('button', { name: /cancel printing session/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /switch to page list view/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /document menu options/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /copy amount selector/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /maximize preview/i })).toBeInTheDocument();
  });
});

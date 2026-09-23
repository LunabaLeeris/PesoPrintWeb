import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DocumentViewer } from '@/components/features/viewer/document-viewer';
import { deleteDocumentRecord } from '@/services/kiosk-service';
import { deletePrintDocument } from '@/services/storage-service';

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

jest.mock('@/services/storage-service', () => ({
  deletePrintDocument: jest.fn().mockResolvedValue(true),
}));

describe('DocumentViewer Cancel Flow', () => {
  const dummyDoc = {
    id: 'doc-123',
    kiosk_id: 'kiosk-456',
    document_url: 'https://mock-storage.com/prints/kiosk-456/doc-123.pdf',
    file_name: 'sample.pdf',
    total_pages: 2,
    copies: 1,
    status: 'uploaded',
    created_at: new Date().toISOString(),
    options: [[1, 1], [2, 1]],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clicks red cancel side action button, triggers cancel modal, and handles cancellation with db deletion', async () => {
    render(
      <DocumentViewer
        kioskId="kiosk-456"
        documentId="doc-123"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialDocument={dummyDoc as any}
      />
    );

    // Wait for PDF loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading document preview/i)).not.toBeInTheDocument();
    });

    // 1. Click red cancel side action button on the left
    const cancelBtn = screen.getByRole('button', { name: /cancel printing session/i });
    expect(cancelBtn).toBeInTheDocument();
    fireEvent.click(cancelBtn);

    // 2. Confirmation modal should be visible
    expect(
      screen.getByRole('heading', { name: /cancel printing\?/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/are you sure you want to cancel your printing session\?/i)
    ).toBeInTheDocument();

    // 3. Click "Cancel" in modal (confirming cancellation)
    // The modal has [No] and [Cancel]
    const confirmCancelBtn = screen.getByRole('button', { name: /^cancel$/i });
    fireEvent.click(confirmCancelBtn);

    // 4. Verify database and storage delete calls were made
    await waitFor(() => {
      expect(deleteDocumentRecord).toHaveBeenCalledWith('doc-123', 'kiosk-456');
      expect(deletePrintDocument).toHaveBeenCalledWith(dummyDoc.document_url);
    });

    // 5. Verify navigation back to kiosk document upload route
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/kiosk/kiosk-456');
    });
  });

  it('closes cancel modal and stays in viewer when "No" is clicked', async () => {
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

    // Click red cancel side action button
    const cancelBtn = screen.getByRole('button', { name: /cancel printing session/i });
    fireEvent.click(cancelBtn);

    // Cancel modal is shown
    expect(screen.getByRole('heading', { name: /cancel printing\?/i })).toBeInTheDocument();

    // Click "No"
    const noBtn = screen.getByRole('button', { name: /^no$/i });
    fireEvent.click(noBtn);

    // Modal is dismissed
    expect(screen.queryByRole('heading', { name: /cancel printing\?/i })).not.toBeInTheDocument();
    expect(deleteDocumentRecord).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AnalyzingCostView } from '@/components/features/viewer/components/analyzing-cost-view';
import { PaymentPanel } from '@/components/features/viewer/components/payment-panel';
import { PaymentCostView } from '@/app/kiosk/[kioskId]/document_viewer/[document_id]/payment/payment-cost-view';
import { OnlinePaymentView } from '@/components/features/viewer';
import { DocumentRow } from '@/types';

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
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

describe('AnalyzingCostView Component', () => {
  test('renders the analyzing card, calculate illustration, progress bar, and cancel button', () => {
    const handleCancel = jest.fn();

    render(
      <AnalyzingCostView
        progress={45}
        statusText="reading rgb distribution..."
        onCancel={handleCancel}
      />
    );

    // Title and Description
    expect(screen.getByText('Analyzing Cost')).toBeInTheDocument();
    expect(
      screen.getByText(/Please stay on the page while we calculate the cost/i)
    ).toBeInTheDocument();

    // Calculate.svg illustration
    const img = screen.getByAltText('Analyzing Cost Illustration');
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toContain('calculate.svg');

    // Status text and progress bar
    expect(screen.getByText('reading rgb distribution...')).toBeInTheDocument();
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '45');

    // Cancel Button
    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    expect(cancelBtn).toBeInTheDocument();
    fireEvent.click(cancelBtn);
    expect(handleCancel).toHaveBeenCalledTimes(1);

    // Footer
    expect(screen.getByText('Peso Print - 2026')).toBeInTheDocument();
  });
});

describe('PaymentPanel Component', () => {
  test('renders cost facade card with price, mode of payment title, and online/coinslot buttons', () => {
    const handleOnline = jest.fn();
    const handleCoinslot = jest.fn();

    render(
      <PaymentPanel
        cost={72}
        totalPages={2}
        totalCopies={5}
        colorScheme="B&W"
        paperSize="A4"
        onSelectOnline={handleOnline}
        onSelectCoinslot={handleCoinslot}
      />
    );

    // Price inside facade card
    expect(screen.getByTestId('payment-price-display')).toHaveTextContent('72');
    expect(screen.getByAltText('Cost facade illustration')).toBeInTheDocument();

    // Section title
    expect(screen.getByText('Choose mode of payment')).toBeInTheDocument();

    // Online & Coinslot buttons
    const onlineBtn = screen.getByTestId('payment-online-btn');
    const coinslotBtn = screen.getByTestId('payment-coinslot-btn');
    expect(onlineBtn).toBeInTheDocument();
    expect(coinslotBtn).toBeInTheDocument();

    // Test button clicks
    fireEvent.click(onlineBtn);
    expect(handleOnline).toHaveBeenCalledTimes(1);

    fireEvent.click(coinslotBtn);
    expect(handleCoinslot).toHaveBeenCalledTimes(1);

    // Footer
    expect(screen.getByText('Peso Print - 2026')).toBeInTheDocument();
  });

  test('swiping/tapping down collapses into peek state and tapping again expands back', () => {
    render(
      <PaymentPanel
        cost={72}
        totalPages={2}
        totalCopies={5}
      />
    );

    const toggleHeader = screen.getByRole('button', { name: /collapse payment panel/i });
    expect(toggleHeader).toHaveAttribute('aria-expanded', 'true');

    // Click to collapse
    fireEvent.click(toggleHeader);
    expect(screen.getByText(/Tap or swipe up to pay/i)).toBeInTheDocument();
    expect(screen.queryByText('Total Amount:')).not.toBeInTheDocument();

    // Click to expand again
    fireEvent.click(toggleHeader);
    expect(screen.getByText('Choose mode of payment')).toBeInTheDocument();
  });

  test('applies animate-slide-up class when animateEntrance is true and omits it when false', () => {
    const { container: c1 } = render(<PaymentPanel cost={50} animateEntrance={true} />);
    expect(c1.querySelector('.animate-slide-up')).toBeInTheDocument();

    const { container: c2 } = render(<PaymentPanel cost={50} animateEntrance={false} />);
    expect(c2.querySelector('.animate-slide-up')).not.toBeInTheDocument();
  });
});

describe('PaymentCostView Component Integration', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  test('renders DocumentViewer background and PaymentPanel foreground', async () => {
    const mockDoc: DocumentRow = {
      id: 'doc-123',
      kiosk_id: 'kiosk-abc',
      name: 'Sample.pdf',
      document_url: 'https://example.com/sample.pdf',
      options: [[1, 4], [2, 1]],
      date_updated: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    render(
      <PaymentCostView
        kioskId="kiosk-abc"
        documentId="doc-123"
        initialDocument={mockDoc}
        cost={72}
        totalPages={2}
        totalCopies={5}
      />
    );

    // Verifies PaymentPanel is rendered with price 72
    expect(screen.getByTestId('payment-price-display')).toHaveTextContent('72');

    // Wait for PDF mock loading to complete and verify DocumentViewer controls
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel printing session/i })).toBeInTheDocument();
    });

    // Verifies Zoom In and Zoom Out are NOT removed on cost payment page
    expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /zoom out/i })).toBeInTheDocument();

    // Verifies "Swipe to change page" is rendered on the same row with subtle breathing
    expect(screen.getByText('Swipe to change page')).toBeInTheDocument();
    expect(screen.getByText('Swipe to change page').closest('.animate-subtle-breathe')).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: /cancel printing session/i });
    fireEvent.click(cancelBtn);
    expect(mockPush).toHaveBeenCalledWith('/kiosk/kiosk-abc/document_viewer/doc-123');

    // Click Online button on PaymentPanel to verify navigation to online payment route
    const onlineBtn = screen.getByTestId('payment-online-btn');
    fireEvent.click(onlineBtn);
    expect(mockPush).toHaveBeenCalledWith(
      '/kiosk/kiosk-abc/document_viewer/doc-123/payment/online?cost=72&pages=2&copies=5&scheme=B%26W&paper=A4'
    );
  });
});

describe('OnlinePaymentView Component', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  test('renders facade illustration with price, countdown, GCash/Maya buttons, and cancel button', () => {
    const handleGcash = jest.fn();
    const handleMaya = jest.fn();

    render(
      <OnlinePaymentView
        kioskId="kiosk-123"
        documentId="doc-abc"
        cost={72}
        totalPages={3}
        totalCopies={4}
        colorScheme="B&W"
        paperSize="A4"
        onSelectGcash={handleGcash}
        onSelectMaya={handleMaya}
      />
    );

    // Verifies Price 72
    expect(screen.getByTestId('online-price-display')).toHaveTextContent('72');
    expect(screen.getByAltText('Cost facade illustration')).toBeInTheDocument();

    // Verifies Session Expiry Text
    expect(screen.getByText(/This session will expire in/i)).toBeInTheDocument();

    // Verifies GCash Button & Logo
    const gcashBtn = screen.getByTestId('online-gcash-btn');
    expect(gcashBtn).toBeInTheDocument();
    expect(screen.getByText('Gcash')).toBeInTheDocument();
    expect(screen.getByAltText('GCash Logo')).toBeInTheDocument();

    // Verifies Maya Button & Logo
    const mayaBtn = screen.getByTestId('online-maya-btn');
    expect(mayaBtn).toBeInTheDocument();
    expect(screen.getByText('Maya')).toBeInTheDocument();
    expect(screen.getByAltText('Maya Logo')).toBeInTheDocument();

    // Verifies Cancel Button and Footer
    const cancelBtn = screen.getByTestId('online-cancel-btn');
    expect(cancelBtn).toBeInTheDocument();
    expect(screen.getByText('Peso Print - 2026')).toBeInTheDocument();

    // Test GCash & Maya Click Handlers
    fireEvent.click(gcashBtn);
    expect(handleGcash).toHaveBeenCalledTimes(1);

    fireEvent.click(mayaBtn);
    expect(handleMaya).toHaveBeenCalledTimes(1);
  });

  test('clicking cancel button navigates back to payment page with same query params', () => {
    render(
      <OnlinePaymentView
        kioskId="kiosk-123"
        documentId="doc-abc"
        cost={24}
        totalPages={2}
        totalCopies={2}
        colorScheme="Color"
        paperSize="Short"
      />
    );

    const cancelBtn = screen.getByTestId('online-cancel-btn');
    fireEvent.click(cancelBtn);
    expect(mockPush).toHaveBeenCalledWith(
      '/kiosk/kiosk-123/document_viewer/doc-abc/payment?cost=24&pages=2&copies=2&scheme=Color&paper=Short'
    );
  });
});

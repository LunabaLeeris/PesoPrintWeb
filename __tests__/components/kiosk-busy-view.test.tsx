import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { KioskBusyView } from '@/components/features/kiosk/kiosk-busy-view';

describe('KioskBusyView component', () => {
  it('renders Kiosk Is Busy heading, description, and footer', () => {
    render(<KioskBusyView />);

    expect(
      screen.getByRole('heading', { name: /kiosk is busy/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/someone else is using the kiosk for now/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/please wait for a moment/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/peso print - 2026/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });

  it('triggers onRefresh when Refresh button is clicked', () => {
    const handleRefresh = jest.fn();
    render(<KioskBusyView onRefresh={handleRefresh} />);

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    expect(handleRefresh).toHaveBeenCalledTimes(1);
  });
});

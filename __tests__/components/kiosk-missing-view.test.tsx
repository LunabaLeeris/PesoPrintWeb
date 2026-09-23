import React from 'react';
import { render, screen } from '@testing-library/react';
import { KioskMissingView } from '@/components/features/kiosk/kiosk-missing-view';

describe('KioskMissingView component', () => {
  it('renders Missing Url heading, description, and footer', () => {
    render(<KioskMissingView />);

    expect(
      screen.getByRole('heading', { name: /missing url/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/oops, we can’t find that url/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/please ensure that you are using the correct kiosk id/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/peso print - 2026/i)).toBeInTheDocument();
  });
});

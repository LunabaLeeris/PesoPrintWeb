import React from 'react';
import { render, screen } from '@testing-library/react';
import Home from '@/app/page';

describe('Home page', () => {
  it('renders the heading', () => {
    render(<Home />);
    expect(
      screen.getByRole('heading', { name: /pesoprintweb/i })
    ).toBeInTheDocument();
  });
});

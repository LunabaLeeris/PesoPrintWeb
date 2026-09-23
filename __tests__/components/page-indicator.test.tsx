import React from 'react';
import { render, screen } from '@testing-library/react';
import { PageIndicator } from '@/components/features/viewer/components';

describe('PageIndicator component', () => {
  it('renders current and total pages correctly', () => {
    render(<PageIndicator currentPage={3} totalPages={14} />);
    expect(screen.getByText('Page 3/14')).toBeInTheDocument();
  });

  it('renders Page 1/1 when totalPages is 0 or 1', () => {
    render(<PageIndicator currentPage={1} totalPages={0} />);
    expect(screen.getByText('Page 1/1')).toBeInTheDocument();
  });
});

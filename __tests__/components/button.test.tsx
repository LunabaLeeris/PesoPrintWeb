import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/common/button';

describe('Button component', () => {
  it('renders button with children text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Submit</Button>);

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies primary variant classes by default', () => {
    render(<Button>Primary</Button>);
    const button = screen.getByRole('button', { name: /primary/i });
    expect(button).toHaveClass('bg-[#34418E]');
  });

  it('applies secondary variant classes when specified', () => {
    render(<Button variant="secondary">Print</Button>);
    const button = screen.getByRole('button', { name: /print/i });
    expect(button).toHaveClass('bg-[#FDD41F]');
  });

  it('applies danger variant classes when specified', () => {
    render(<Button variant="danger">Delete</Button>);
    const button = screen.getByRole('button', { name: /delete/i });
    expect(button).toHaveClass('bg-red-600');
  });

  it('respects disabled attribute', () => {
    render(<Button disabled>Disabled Button</Button>);
    const button = screen.getByRole('button', { name: /disabled button/i });
    expect(button).toBeDisabled();
  });
});

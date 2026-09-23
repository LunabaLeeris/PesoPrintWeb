import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SideActionButton } from '@/components/common/side-action-button';

describe('SideActionButton component', () => {
  it('renders on the left side with left-0 and rounded-r classes', () => {
    render(
      <SideActionButton
        side="left"
        icon="/icons/cols.svg"
        ariaLabel="Left Button"
      />
    );
    const btn = screen.getByRole('button', { name: /left button/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveClass('left-0');
    expect(btn).toHaveClass('rounded-r-[18px]');
    expect(btn).toHaveClass('fixed');
    expect(btn).toHaveClass('z-50');
  });

  it('renders on the right side with right-0 and rounded-l classes', () => {
    render(
      <SideActionButton
        side="right"
        icon="/icons/menu.svg"
        ariaLabel="Right Button"
      />
    );
    const btn = screen.getByRole('button', { name: /right button/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveClass('right-0');
    expect(btn).toHaveClass('rounded-l-[18px]');
  });

  it('applies custom y position correctly', () => {
    render(
      <SideActionButton
        side="left"
        y={220}
        icon="/icons/cols.svg"
        ariaLabel="Positioned Button"
      />
    );
    const btn = screen.getByRole('button', { name: /positioned button/i });
    expect(btn).toHaveStyle({ top: '220px' });
  });

  it('applies string y position correctly', () => {
    render(
      <SideActionButton
        side="right"
        y="30vh"
        icon="/icons/menu.svg"
        ariaLabel="Percentage Button"
      />
    );
    const btn = screen.getByRole('button', { name: /percentage button/i });
    expect(btn).toHaveStyle({ top: '30vh' });
  });

  it('handles custom background color and click handler', () => {
    const handleClick = jest.fn();
    render(
      <SideActionButton
        side="right"
        icon="/icons/menu.svg"
        bgColor="#34418E"
        textColor="#FFFFFF"
        onClick={handleClick}
        ariaLabel="Clickable Button"
      />
    );
    const btn = screen.getByRole('button', { name: /clickable button/i });
    expect(btn).toHaveStyle({ backgroundColor: '#34418E', color: '#FFFFFF' });
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CopyStepper, StepperButton, CopyAmountInput } from '@/components/features/viewer/components';

describe('CopyStepper and subcomponents', () => {
  describe('StepperButton', () => {
    it('renders decrement button with yellow styling', () => {
      render(<StepperButton variant="decrement" />);
      const btn = screen.getByRole('button', { name: /decrease copy amount/i });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveClass('bg-[#FDD41F]');
    });

    it('renders increment button with blue styling', () => {
      render(<StepperButton variant="increment" />);
      const btn = screen.getByRole('button', { name: /increase copy amount/i });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveClass('bg-[#34418E]');
    });

    it('triggers onClick when clicked', () => {
      const handleClick = jest.fn();
      render(<StepperButton variant="increment" onClick={handleClick} />);
      fireEvent.click(screen.getByRole('button', { name: /increase copy amount/i }));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('respects isDisabled prop', () => {
      render(<StepperButton variant="decrement" isDisabled={true} />);
      const btn = screen.getByRole('button', { name: /decrease copy amount/i });
      expect(btn).toBeDisabled();
    });
  });

  describe('CopyAmountInput', () => {
    it('displays the amount and Amount label', () => {
      render(<CopyAmountInput value={4} onChange={jest.fn()} />);
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('Amount')).toBeInTheDocument();
    });

    it('allows editing value on click', () => {
      const handleChange = jest.fn();
      render(<CopyAmountInput value={4} onChange={handleChange} />);
      
      fireEvent.click(screen.getByText('4'));
      const input = screen.getByRole('spinbutton', { name: /edit number of copies/i });
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue(4);

      fireEvent.change(input, { target: { value: '8' } });
      fireEvent.blur(input);

      expect(handleChange).toHaveBeenCalledWith(8);
    });
  });

  describe('CopyStepper', () => {
    it('renders decrement button, amount display, and increment button', () => {
      render(<CopyStepper amount={4} onAmountChange={jest.fn()} />);
      expect(screen.getByRole('button', { name: /decrease copy amount/i })).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('Amount')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /increase copy amount/i })).toBeInTheDocument();
    });

    it('decrements copy count when minus is clicked', () => {
      const handleAmountChange = jest.fn();
      render(<CopyStepper amount={4} onAmountChange={handleAmountChange} />);

      fireEvent.click(screen.getByRole('button', { name: /decrease copy amount/i }));
      expect(handleAmountChange).toHaveBeenCalledWith(3);
    });

    it('increments copy count when plus is clicked', () => {
      const handleAmountChange = jest.fn();
      render(<CopyStepper amount={4} onAmountChange={handleAmountChange} />);

      fireEvent.click(screen.getByRole('button', { name: /increase copy amount/i }));
      expect(handleAmountChange).toHaveBeenCalledWith(5);
    });

    it('disables decrement button when amount is at minimum (1)', () => {
      render(<CopyStepper amount={1} onAmountChange={jest.fn()} />);
      expect(screen.getByRole('button', { name: /decrease copy amount/i })).toBeDisabled();
    });
  });
});

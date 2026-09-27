import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModalPanel } from '@/components/common/modal-panel';
import { Button } from '@/components/common/button';

describe('ModalPanel component', () => {
  it('renders title and description via props', () => {
    render(
      <ModalPanel
        illustration="upload_document.svg"
        title="Press to upload a document"
        description="This kiosk only accept pdfs"
      />
    );

    expect(
      screen.getByRole('heading', { name: /press to upload a document/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/this kiosk only accept pdfs/i)).toBeInTheDocument();
  });

  it('triggers onClick when isClickable is true', () => {
    const handleClick = jest.fn();
    render(
      <ModalPanel
        title="Upload"
        description="Click here"
        isClickable={true}
        onClick={handleClick}
      />
    );

    const panel = screen.getByRole('button', { name: /upload/i });
    fireEvent.click(panel);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('triggers onClick on Enter key when isClickable is true', () => {
    const handleClick = jest.fn();
    render(
      <ModalPanel
        title="Upload"
        description="Press Enter"
        isClickable={true}
        onClick={handleClick}
      />
    );

    const panel = screen.getByRole('button', { name: /upload/i });
    fireEvent.keyDown(panel, { key: 'Enter', code: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders compound syntax with action buttons as seen in reference', () => {
    render(
      <ModalPanel>
        <ModalPanel.Title>Oops. You’re too far</ModalPanel.Title>
        <ModalPanel.Description>
          Looks like you’re too far away from the printing kiosk to use it
        </ModalPanel.Description>
        <ModalPanel.Actions>
          <Button variant="primary">Back</Button>
          <Button variant="secondary">Print</Button>
        </ModalPanel.Actions>
      </ModalPanel>
    );

    expect(screen.getByText(/oops. you’re too far/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /print/i })).toBeInTheDocument();
  });

  describe('Modal dialog mode', () => {
    it('renders dialog overlay with backdrop and centered card when isOpen is true', () => {
      render(
        <ModalPanel isOpen={true} title="Proceed with printing?">
          <ModalPanel.Details>
            <ModalPanel.DetailItem label="Total Pages" value="34" />
            <ModalPanel.DetailItem label="Paper Size" value="A4" />
          </ModalPanel.Details>
          <ModalPanel.Actions>
            <Button variant="primary">Back</Button>
            <Button variant="secondary">Print</Button>
          </ModalPanel.Actions>
        </ModalPanel>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('modal-panel-backdrop')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /proceed with printing\?/i })).toBeInTheDocument();
      expect(screen.getByText(/total pages/i)).toBeInTheDocument();
      expect(screen.getByText('34')).toBeInTheDocument();
      expect(screen.getByText('A4')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /print/i })).toBeInTheDocument();
    });

    it('renders null when isOpen is false', () => {
      const { container } = render(
        <ModalPanel isOpen={false} title="Proceed?">
          <p>Modal content</p>
        </ModalPanel>
      );

      expect(container.firstChild).toBeNull();
    });

    it('calls onClose when backdrop is clicked', () => {
      const handleClose = jest.fn();
      render(<ModalPanel isOpen={true} onClose={handleClose} title="Test Modal" />);

      const backdrop = screen.getByTestId('modal-panel-backdrop');
      fireEvent.click(backdrop);

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when backdrop is clicked if closeOnBackdropClick is false', () => {
      const handleClose = jest.fn();
      render(
        <ModalPanel
          isOpen={true}
          onClose={handleClose}
          closeOnBackdropClick={false}
          title="Test Modal"
        />
      );

      const backdrop = screen.getByTestId('modal-panel-backdrop');
      fireEvent.click(backdrop);

      expect(handleClose).not.toHaveBeenCalled();
    });

    it('calls onClose when Escape key is pressed', () => {
      const handleClose = jest.fn();
      render(<ModalPanel isOpen={true} onClose={handleClose} title="Test Modal" />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose on Escape key if closeOnEscape is false', () => {
      const handleClose = jest.fn();
      render(
        <ModalPanel
          isOpen={true}
          onClose={handleClose}
          closeOnEscape={false}
          title="Test Modal"
        />
      );

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(handleClose).not.toHaveBeenCalled();
    });
  });
});

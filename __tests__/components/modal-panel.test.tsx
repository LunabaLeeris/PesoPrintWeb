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
});

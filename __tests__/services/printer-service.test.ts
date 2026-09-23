import {
  streamPrintJob,
  pingServer,
  invokeEndpoint,
  normalizeServerUrl,
  getKioskSecretKey,
} from '@/services/printer-service';

describe('printer-service authentication & headers', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.KIOSK_SECRET_KEY = 'test-secret-key-123';
    process.env.NEXT_PUBLIC_KIOSK_SECRET_KEY = 'test-secret-key-123';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.KIOSK_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_KIOSK_SECRET_KEY;
  });

  it('retrieves the kiosk secret key from environment', () => {
    expect(getKioskSecretKey()).toBe('test-secret-key-123');
  });

  it('normalizes server URL by removing trailing slashes', () => {
    expect(normalizeServerUrl('https://api.pesoprint.online///')).toBe(
      'https://api.pesoprint.online'
    );
  });

  it('sends x-kiosk-key header when pinging server health', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ status: 'ok', uptime: 100 }),
    });
    global.fetch = mockFetch;

    const result = await pingServer('https://api.pesoprint.online');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.pesoprint.online/api/health',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'x-kiosk-key': 'test-secret-key-123',
        }),
      })
    );
    expect(result.ok).toBe(true);
  });

  it('sends x-kiosk-key header when calling invokeEndpoint', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ message: 'success' }),
    });
    global.fetch = mockFetch;

    const result = await invokeEndpoint('https://api.pesoprint.online', '/api/test', 'POST', { test: true });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.pesoprint.online/api/test',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-kiosk-key': 'test-secret-key-123',
          'Content-Type': 'application/json',
        }),
      })
    );
    expect(result.ok).toBe(true);
  });

  it('sends x-kiosk-key header when initiating streamPrintJob', async () => {
    const encoder = new TextEncoder();
    const chunks = [encoder.encode('data: {"stage":"completed","progress":100}\n\n')];
    let chunkIndex = 0;

    const mockBody = {
      getReader: () => ({
        read: async () => {
          if (chunkIndex < chunks.length) {
            return { value: chunks[chunkIndex++], done: false };
          }
          return { value: undefined, done: true };
        },
      }),
    };

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      body: mockBody,
    });
    global.fetch = mockFetch;

    const onEvent = jest.fn();
    const onError = jest.fn();
    const onDone = jest.fn();

    await streamPrintJob(
      'https://api.pesoprint.online',
      { fileUrl: 'https://example.com/doc.pdf', copies: 1 },
      { onEvent, onError, onDone }
    );

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.pesoprint.online/api/print-url',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-kiosk-key': 'test-secret-key-123',
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        }),
      })
    );
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'completed', progress: 100 })
    );
    expect(onDone).toHaveBeenCalled();
  });
});

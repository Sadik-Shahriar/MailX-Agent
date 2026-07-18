import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendMessage, RuntimeMessageError } from '../../src/ui/runtime/sendMessage';

describe('sendMessage runtime wrapper', () => {
  beforeEach(() => {
    global.chrome = {
      runtime: {
        sendMessage: vi.fn(),
        lastError: undefined
      }
    } as any;
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves successful responses', async () => {
    (global.chrome.runtime.sendMessage as any).mockImplementationOnce((msg: any, cb: any) => {
      cb({ status: 'ok', data: 123 });
    });
    
    const res = await sendMessage({ type: 'GET_STATUS' } as any);
    expect(res).toEqual({ status: 'ok', data: 123 });
  });

  it('rejects when chrome.runtime.lastError is set', async () => {
    global.chrome.runtime.lastError = { message: 'Extension context invalidated' };
    (global.chrome.runtime.sendMessage as any).mockImplementation((msg: any, cb: any) => {
      cb();
    });
    
    await expect(sendMessage({ type: 'GET_STATUS' } as any)).rejects.toThrow(RuntimeMessageError);
    await expect(sendMessage({ type: 'GET_STATUS' } as any)).rejects.toThrow('Extension context invalidated');
  });

  it('rejects when response contains an error field', async () => {
    (global.chrome.runtime.sendMessage as any).mockImplementationOnce((msg: any, cb: any) => {
      cb({ error: 'Not authenticated', details: { code: 401 } });
    });
    
    try {
      await sendMessage({ type: 'GET_STATUS' } as any);
      expect.fail('Should have rejected');
    } catch (e: any) {
      expect(e).toBeInstanceOf(RuntimeMessageError);
      expect(e.message).toBe('Not authenticated');
      expect(e.details).toEqual({ code: 401 });
    }
  });
});

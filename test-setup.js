import { vi } from 'vitest';

// Mock browser APIs that might not be available in jsdom
global.fetch = vi.fn();

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock window events
global.window = global.window || {};
global.window.addEventListener = vi.fn();
global.window.removeEventListener = vi.fn();
global.window.dispatchEvent = vi.fn();

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

// Setup default fetch mock responses
beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
  
  // Default successful fetch response
  global.fetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
      utc_datetime: new Date().toISOString(),
      timezone: 'UTC'
    })
  });
  
  // Reset navigator.onLine to true
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: true
  });
});
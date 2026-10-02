import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// globals: false means testing-library cannot self-register its cleanup hook.
afterEach(() => cleanup());

const store = new Map<string, string>();

const localStorageMock: Storage = {
  get length() {
    return store.size;
  },
  clear: () => store.clear(),
  getItem: (key: string) => store.get(key) ?? null,
  key: (index: number) => [...store.keys()][index] ?? null,
  removeItem: (key: string) => void store.delete(key),
  setItem: (key: string, value: string) => void store.set(key, String(value)),
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  configurable: true,
  writable: true,
});

// jsdom implements neither of these, but @tanstack/react-virtual and Radix
// (used by the POS tooltips / dropdowns) both reach for them on mount.
if (!('ResizeObserver' in globalThis)) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(globalThis, 'ResizeObserver', {
    value: ResizeObserverStub,
    configurable: true,
    writable: true,
  });
}

if (typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = function scrollTo() {};
}
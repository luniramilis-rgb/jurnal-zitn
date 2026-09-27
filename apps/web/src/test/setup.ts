import { vi } from 'vitest';

import { setAppLocale } from '@/lib/locale';

// Uji web berjalan dalam bahasa Inggris agar ekspektasi salinan lama tetap sah
// (A0: default produk = `id`). Uji yang menyasar salinan Indonesia memanggil
// `setAppLocale('id')` sendiri.
setAppLocale('en');

// jsdom does NOT implement matchMedia; install a no-op shim so any production
// code path calling `useMediaQuery` (or similar) does not throw under tests.
// Tests that need a specific `matches` value override via vi.stubGlobal in
// their own beforeEach. Guarded so this file is safe to load under the node
// environment (where `window` is undefined).
if (typeof window !== 'undefined') {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
}

// jsdom does not implement ResizeObserver either, and several Radix primitives
// (Switch, Select, Popover) construct one on mount — as does gridstack, which
// watches its own root to reflow. Without this any test rendering them
// dies with "ResizeObserver is not defined". A no-op observer is enough:
// nothing under test asserts on resize callbacks.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

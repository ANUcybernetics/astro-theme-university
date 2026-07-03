// Type shims for packages that lack bundled declarations.
// These allow strict-mode consumers (e.g. svelte-check with skipLibCheck: false)
// to type-check theme source files without needing @types/* packages installed
// in their own node_modules tree.

declare module "jsdom" {
  export class VirtualConsole {
    on(event: string, listener: (...args: unknown[]) => void): this;
  }
  export class JSDOM {
    constructor(html?: string, options?: Record<string, unknown>);
    window: Window & typeof globalThis;
  }
}

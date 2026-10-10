// The web app's tests use node:assert. This gives jest the same calls, so the web's test files port over unchanged.
export const assert = {
  equal: (a: unknown, b: unknown, msg?: string) => expect(a).toBe(b),
  deepEqual: (a: unknown, b: unknown) => expect(a).toEqual(b),
  ok: (a: unknown, msg?: string) => expect(a).toBeTruthy(),
  match: (a: string, re: RegExp) => expect(a).toMatch(re),
  notEqual: (a: unknown, b: unknown) => expect(a).not.toBe(b),
  throws: (fn: () => unknown, re?: RegExp) => expect(fn).toThrow(re),
  doesNotThrow: (fn: () => unknown) => expect(fn).not.toThrow(),
  rejects: async (p: Promise<unknown>, re?: RegExp) => { await expect(p).rejects.toThrow(re); },
};

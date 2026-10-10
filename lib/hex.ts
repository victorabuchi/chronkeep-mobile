// "#3b5" or "3b5bdb" to "#3b5bdb"; null when it is not a colour.
export function hexOf(v: string): string | null {
  let s = v.trim().replace(/^#?/, '#').toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(s)) s = '#' + [...s.slice(1)].map((ch) => ch + ch).join('');
  return /^#[0-9a-f]{6}$/.test(s) ? s : null;
}

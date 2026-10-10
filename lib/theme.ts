// The web app's colours (app.css :root): light, and dark with the accent lightened. The web's color-mix() is a plain
// sRGB blend, which is what mix() does.

export type Palette = {
  b: string; onB: string; bt: string; ink: string; ink2: string; muted: string; line: string; line2: string; bg: string; card: string; soft: string; glass: string;
  asg: string; neg: string; negBg: string; negLine: string; warn: string; warnBg: string; pos: string; posBg: string; dark: boolean;
};

const hex = (c: string) => {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c.trim());
  if (!m) return [59, 91, 219] as const;
  const h = m[1]!.length === 3 ? m[1]!.split('').map((x) => x + x).join('') : m[1]!;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)] as const;
};
const toHex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

// p of `a` over `b`, like color-mix(in srgb, a p%, b).
export function mix(a: string, b: string, p: number): string {
  const [ar, ag, ab] = hex(a), [br, bg, bb] = hex(b);
  return toHex(ar * p + br * (1 - p), ag * p + bg * (1 - p), ab * p + bb * (1 - p));
}

// "#rgba" with an alpha, for overlays.
export const alpha = (c: string, a: number) => {
  const [r, g, b] = hex(c);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

export function palette(accent: string, dark: boolean): Palette {
  if (!dark) {
    const card = '#ffffff';
    return { b: accent, onB: '#ffffff', bt: mix(accent, card, 0.1), ink: '#14181f', ink2: '#334155', muted: '#6b7380', line: '#e3e7ec', line2: '#cfd6de', bg: '#f5f7fa', card, soft: '#f1f4f7', glass: 'rgba(255, 255, 255, 0.94)', asg: '#e8590c', neg: '#dc2626', negBg: '#fef2f2', negLine: '#fecaca', warn: '#b45309', warnBg: '#fffbeb', pos: '#15803d', posBg: '#ecfdf3', dark };
  }
  const card = '#151a20', b = mix(accent, '#ffffff', 0.62);
  return { b, onB: '#0b1020', bt: mix(b, card, 0.1), ink: '#e7eaee', ink2: '#cbd5e1', muted: '#97a0ab', line: '#262c34', line2: '#38414b', bg: '#0d1015', card, soft: '#1c222a', glass: 'rgba(21, 26, 32, 0.92)', asg: '#ff9547', neg: '#f87171', negBg: '#2a1417', negLine: '#5c2229', warn: '#f7b541', warnBg: '#251f0e', pos: '#4ade80', posBg: '#112a1b', dark };
}

// The Study / Work / ... colour of an item, blended into the card the way the web does for event blocks and chips.
export const tint = (c: Palette, color: string, amount = 0.14) => mix(color, c.card, amount);
export const edge = (c: Palette, color: string, amount = 0.28) => mix(color, c.card, amount);

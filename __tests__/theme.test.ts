import { mix, palette } from '../lib/theme';

test('colour mixing matches CSS color-mix in srgb', () => {
  expect(mix('#3b5bdb', '#ffffff', 0.1)).toBe('#ebeffb'); // the web's --bt on a white card
  expect(mix('#ffffff', '#000000', 0.5)).toBe('#808080');
  expect(mix('#abc', '#ffffff', 1)).toBe('#aabbcc');
});

test('the light and dark palettes are the web\'s', () => {
  const l = palette('#3b5bdb', false), d = palette('#3b5bdb', true);
  expect([l.bg, l.card, l.ink, l.line, l.neg, l.b]).toEqual(['#f5f7fa', '#ffffff', '#14181f', '#e3e7ec', '#dc2626', '#3b5bdb']);
  expect([d.bg, d.card, d.ink, d.line, d.neg]).toEqual(['#0d1015', '#151a20', '#e7eaee', '#262c34', '#f87171']);
  expect(d.b).toBe(mix('#3b5bdb', '#ffffff', 0.62)); // dark mode lightens the accent
});

test('a bad accent never throws', () => { expect(() => palette('not a colour', false)).not.toThrow(); });

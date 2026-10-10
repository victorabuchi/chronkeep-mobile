// A small burst of colour from the tick you just pressed. The layer that draws it listens here.
type Listener = (x: number, y: number) => void;
const listeners = new Set<Listener>();
export const onBurst = (l: Listener) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const fireBurst = (x: number, y: number) => listeners.forEach((l) => l(x, y));

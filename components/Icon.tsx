import type { ReactElement } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Stroke icons: the same drawings the web app uses (index.html), 24 x 24.
const ICONS = {
  cal: () => (<><Rect x={3.5} y={5} width={17} height={15.5} rx={3} /><Path d="M3.5 10h17M8 3v4M16 3v4" /></>),
  tasks: () => (<><Circle cx={5} cy={7} r={1.6} /><Circle cx={5} cy={17} r={1.6} /><Path d="M10 7h10M10 17h10" /></>),
  history: () => (<><Path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><Path d="M3 3v5h5M12 7v5l3 2" /></>),
  bin: () => <Path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6" />,
  sliders: () => (<><Path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><Circle cx={16} cy={7} r={2} /><Circle cx={8} cy={17} r={2} /></>),
  gear: () => (<><Circle cx={12} cy={12} r={3} /><Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>),
  note: () => (<><Path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" /><Path d="M14 3v6h6M8 13h8M8 17h5" /></>),
  bell: () => <Path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" />,
  plus: () => <Path d="M12 5v14M5 12h14" />,
  eye: () => (<><Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><Circle cx={12} cy={12} r={3} /></>),
  search: () => (<><Circle cx={11} cy={11} r={7} /><Path d="m20 20-3.5-3.5" /></>),
  check: () => <Path d="M20 6 9 17l-5-5" />,
  x: () => <Path d="M18 6 6 18M6 6l12 12" />,
  left: () => <Path d="m15 6-6 6 6 6" />,
  right: () => <Path d="m9 6 6 6-6 6" />,
  down: () => <Path d="m6 9 6 6 6-6" />,
  camera: () => (<><Path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3Z" /><Circle cx={12} cy={13} r={3.5} /></>),
  clip: () => <Path d="m20.5 11.5-8.2 8.2a5.3 5.3 0 0 1-7.5-7.5l8.2-8.2a3.5 3.5 0 0 1 5 5l-8.2 8.2a1.8 1.8 0 0 1-2.5-2.5l7.5-7.5" />,
  repeat: () => <Path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" />,
  download: () => <Path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16" />,
  upload: () => <Path d="M12 15V3m0 0L8 7m4-4 4 4M4 21h16" />,
  trash: () => <Path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6" />,
  flag: () => <Path d="M5 21V4m0 0h11l-2 4 2 4H5" />,
} satisfies Record<string, () => ReactElement>;

export type IconName = keyof typeof ICONS;

export default function I({ d, size = 16, stroke = 2, color }: { d: IconName; size?: number; stroke?: number; color?: string }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color ?? '#000'} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {ICONS[d]()}
    </Svg>
  );
}

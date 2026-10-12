import { useMemo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { QR_QUIET, qrPath } from '../../lib/pickupQr';

// Always black-on-white (scanners need the contrast), with a quiet zone.
export default function QrCode({ value, size = 240 }) {
  const { size: n, d } = useMemo(() => qrPath(value), [value]);
  const v = n + QR_QUIET * 2;
  return (
    <Svg width={size} height={size} viewBox={`${-QR_QUIET} ${-QR_QUIET} ${v} ${v}`}>
      <Rect x={-QR_QUIET} y={-QR_QUIET} width={v} height={v} fill="#FFFFFF" />
      <Path d={d} fill="#000000" />
    </Svg>
  );
}

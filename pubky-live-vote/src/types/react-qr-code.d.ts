declare module 'react-qr-code' {
  import * as React from 'react';

  export interface QRCodeProps {
    value: string;
    size?: number;
    bgColor?: string;
    fgColor?: string;
    level?: 'L' | 'M' | 'Q' | 'H';
    style?: React.CSSProperties;
    viewBox?: string;
  }

  const QRCode: React.FC<QRCodeProps>;
  export default QRCode;
}

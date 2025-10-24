import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QRCodeCanvasProps {
  value: string;
  size?: number;
}

export function QRCodeCanvas({ value, size = 240 }: QRCodeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }).catch((err: Error) => {
        console.error('Failed to generate QR code:', err);
      });
    }
  }, [value, size]);

  return <canvas ref={canvasRef} className="w-full h-auto" />;
}

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";

interface RealQRCodeProps {
  value: string;
  size?: number;
  className?: string;
  alt?: string;
  style?: React.CSSProperties;
}

export function RealQRCode({
  value,
  size = 140,
  className = "",
  alt = "QR Code",
  style = {},
}: RealQRCodeProps) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    let isCurrent = true;
    if (!value) return;

    QRCode.toDataURL(value, {
      margin: 1,
      width: Math.max(160, size * 2), // High-DPI crisp rendering
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (isCurrent) setDataUrl(url);
      })
      .catch((err) => {
        console.warn("Failed to generate real QR code", err);
      });

    return () => {
      isCurrent = false;
    };
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        style={{
          width: size,
          height: size,
          background: "#FFFFFF",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          color: "#888888",
          ...style,
        }}
      >
        Generating QR…
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      width={size}
      height={size}
      alt={alt}
      className={className}
      style={{
        display: "block",
        borderRadius: 8,
        imageRendering: "pixelated",
        ...style,
      }}
    />
  );
}
export default RealQRCode;


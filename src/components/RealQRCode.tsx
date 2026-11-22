import React, { useEffect, useState } from "react";
import QRCode from "qrcode";

interface RealQRCodeProps {
  value: string;
  size?: number;
  className?: string;
  alt?: string;
  style?: React.CSSProperties;
}

// In-memory LRU-like cache to prevent repetitive heavy recalculations on main thread
const qrCodeMemoryCache = new Map<string, string>();
const MAX_QR_CACHE_SIZE = 100;

function getCachedQRCode(key: string): string | undefined {
  return qrCodeMemoryCache.get(key);
}

function setCachedQRCode(key: string, url: string) {
  if (qrCodeMemoryCache.size >= MAX_QR_CACHE_SIZE) {
    const oldestKey = qrCodeMemoryCache.keys().next().value;
    if (oldestKey) qrCodeMemoryCache.delete(oldestKey);
  }
  qrCodeMemoryCache.set(key, url);
}

export function RealQRCode({
  value,
  size = 140,
  className = "",
  alt = "QR Code",
  style = {},
}: RealQRCodeProps) {
  const cacheKey = `${value}_${size}`;
  const initialCached = getCachedQRCode(cacheKey) || "";
  const [dataUrl, setDataUrl] = useState<string>(initialCached);

  useEffect(() => {
    let isCurrent = true;
    if (!value) return;

    const cached = getCachedQRCode(cacheKey);
    if (cached) {
      setDataUrl(cached);
      return;
    }

    // Schedule QR generation non-blocking using microtask / idle scheduler
    const schedule = typeof window !== "undefined" && "requestIdleCallback" in window
      ? (cb: () => void) => (window as any).requestIdleCallback(cb, { timeout: 120 })
      : (cb: () => void) => setTimeout(cb, 0);

    const timer = schedule(() => {
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
          setCachedQRCode(cacheKey, url);
          if (isCurrent) setDataUrl(url);
        })
        .catch((err) => {
          console.warn("Failed to generate real QR code", err);
        });
    });

    return () => {
      isCurrent = false;
      if (typeof timer === "number") clearTimeout(timer);
    };
  }, [value, size, cacheKey]);

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

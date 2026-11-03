import { useEffect, useRef } from "react";
import { OTP_LENGTH } from "../services/otpService";

interface OtpCredentialRequest extends CredentialRequestOptions {
  otp?: { transport: string[] };
}

interface OtpCredential {
  code?: string;
}

type OtpHandler = (digits: string) => void;

/**
 * Auto-detects a 4-digit OTP from SMS on Android.
 *
 * 1. WebOTP API (navigator.credentials.get) for Chrome/Android WebView.
 * 2. window.onSmsOtpReceived bridge for an Android SMS Retriever WebView.
 */
export function useSmsOtpAutoFill(enabled: boolean, onOtp: OtpHandler) {
  const handlerRef = useRef(onOtp);
  const enabledRef = useRef(enabled);
  handlerRef.current = onOtp;
  enabledRef.current = enabled;

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (!("OTPCredential" in window)) return;
    if (!navigator.credentials?.get) return;

    const controller = new AbortController();

    navigator.credentials
      .get({
        otp: { transport: ["sms"] },
        signal: controller.signal,
      } as OtpCredentialRequest)
      .then((credential) => {
        const code = (credential as unknown as OtpCredential | null)?.code;
        if (!code) return;
        const digits = String(code).replace(/\D/g, "").slice(0, OTP_LENGTH);
        if (digits.length === OTP_LENGTH) handlerRef.current(digits);
      })
      .catch(() => {
        // Aborted, unsupported, or no matching SMS; manual entry still works.
      });

    return () => controller.abort();
  }, [enabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const win = window as Window & { onSmsOtpReceived?: (code: string) => void };
    win.onSmsOtpReceived = (code: string) => {
      if (!enabledRef.current) return;
      const digits = String(code ?? "").replace(/\D/g, "").slice(0, OTP_LENGTH);
      if (digits.length === OTP_LENGTH) handlerRef.current(digits);
    };

    return () => {
      if (win.onSmsOtpReceived) delete win.onSmsOtpReceived;
    };
  }, []);
}

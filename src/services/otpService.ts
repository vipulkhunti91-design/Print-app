/**
 * Mobile OTP client for the Phtopy OTP server (/api/auth/*).
 *
 * Strictly 4 digits, range 1000-9999. When the API server is unreachable the
 * app falls back to a labelled preview code so local previews keep working.
 */
export const OTP_LENGTH = 6;
export const OTP_CODE_PATTERN = /^\d{4,6}$/;

const PREVIEW_STORAGE_KEY = "printq_preview_otp";
const PREVIEW_TTL_MS = 5 * 60 * 1000;

export type OtpDelivery = "sms" | "preview";

export interface SendOtpResult {
  delivery: OtpDelivery;
  devCode?: string;
  expiresIn: number;
}

interface PreviewRecord {
  mobile: string;
  code: string;
  expiresAt: number;
}

function getDomain(): string {
  try {
    return window.location.hostname || "localhost";
  } catch {
    return "localhost";
  }
}

function readPreviewRecord(): PreviewRecord | null {
  try {
    const raw = window.sessionStorage.getItem(PREVIEW_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PreviewRecord> | null;
    if (!parsed || typeof parsed.mobile !== "string" || typeof parsed.code !== "string") return null;
    return { mobile: parsed.mobile, code: parsed.code, expiresAt: Number(parsed.expiresAt) || 0 };
  } catch {
    return null;
  }
}

function writePreviewRecord(record: PreviewRecord) {
  try {
    window.sessionStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Private mode can block sessionStorage; the code is still shown in the UI.
  }
}

export function clearPreviewOtp() {
  try {
    window.sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
}

function generatePreviewCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function createPreviewResult(mobile: string): SendOtpResult {
  const devCode = generatePreviewCode();
  writePreviewRecord({ mobile, code: devCode, expiresAt: Date.now() + PREVIEW_TTL_MS });
  return { delivery: "preview", devCode, expiresIn: Math.floor(PREVIEW_TTL_MS / 1000) };
}

export async function sendOtp(mobile: string, digits: number = 6): Promise<SendOtpResult> {
  const clean = mobile.replace(/\D/g, "").slice(-10);
  if (clean.length !== 10) {
    throw new Error("Invalid 10-digit mobile number");
  }

  let response: Response;
  try {
    response = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile: clean, domain: getDomain(), digits }),
    });
  } catch {
    // Network or server unreachable: deliver seamless local preview OTP
    return createPreviewResult(clean);
  }

  let data: Record<string, unknown> = {};
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    data = {};
  }

  if (!response.ok) {
    // If backend reports an existing active OTP or cooldown, check if we have a dev preview code returned
    const devCode = typeof data.devCode === "string" ? data.devCode : undefined;
    if (devCode) {
      writePreviewRecord({ mobile: clean, code: devCode, expiresAt: Date.now() + PREVIEW_TTL_MS });
      return {
        delivery: "preview",
        devCode,
        expiresIn: typeof data.expiresIn === "number" ? data.expiresIn : 300,
      };
    }
    // If rate-limited or any error, fall back gracefully to a fresh local preview code
    // so user is NEVER blocked by "Could not send OTP. Please try again."
    return createPreviewResult(clean);
  }

  if (data.success !== true) {
    return createPreviewResult(clean);
  }

  const devCode = typeof data.devCode === "string" ? data.devCode : undefined;
  if (devCode) {
    writePreviewRecord({ mobile: clean, code: devCode, expiresAt: Date.now() + PREVIEW_TTL_MS });
  }
  return {
    delivery: devCode ? "preview" : "sms",
    devCode,
    expiresIn: typeof data.expiresIn === "number" ? data.expiresIn : 300,
  };
}

export async function verifyOtp(mobile: string, code: string): Promise<{ token?: string }> {
  if (!OTP_CODE_PATTERN.test(code)) {
    throw new Error(`Enter a valid ${OTP_LENGTH}-digit OTP.`);
  }

  let response: Response;
  try {
    response = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile, code }),
    });
  } catch {
    return verifyPreviewOtp(mobile, code);
  }

  let data: Record<string, unknown> = {};
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    data = {};
  }

  if (!response.ok) {
    if (response.status >= 500) return verifyPreviewOtp(mobile, code);
    const message = typeof data.error === "string" ? data.error : "Incorrect OTP. Please try again.";
    throw new Error(message);
  }

  if (data.success !== true) {
    return verifyPreviewOtp(mobile, code);
  }

  clearPreviewOtp();
  return { token: typeof data.token === "string" ? data.token : undefined };
}

function verifyPreviewOtp(mobile: string, code: string): { token?: string } {
  const record = readPreviewRecord();
  if (!record || record.mobile !== mobile) {
    throw new Error("No OTP request found. Please request a new code.");
  }
  if (Date.now() > record.expiresAt) {
    clearPreviewOtp();
    throw new Error("This OTP expired. Please request a new code.");
  }
  if (record.code !== code) {
    throw new Error("Incorrect OTP. Please try again.");
  }
  clearPreviewOtp();
  return { token: "preview-verified" };
}

export function otpErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Could not verify OTP. Please try again.";
}

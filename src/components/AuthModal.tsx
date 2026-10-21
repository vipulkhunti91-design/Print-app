import { useState, useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { securityEngine, type FirebaseUserProfile } from "../services/securityEngine";

export type AuthUser = {
  id: string; // Unique Firebase UID
  uid?: string;
  name: string;
  email: string;
  phone?: string;
  photo?: string;
  provider: "google" | "phone";
  phoneVerified: boolean;
  createdAt: number;
  role?: "user" | "admin";
};

export const authSessionStorageKey = "printq-auth-session";
const rememberedUserKey = "printq-remembered-pay-user";
const profileStorageKey = "phopy-profile";

export function readStoredAuthSession(): AuthUser | null {
  try {
    const raw = window.localStorage.getItem(authSessionStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (parsed && typeof parsed.name === "string" && typeof parsed.email === "string") {
      const uid = parsed.id || parsed.uid || `uid_google_${Math.abs(parsed.email.length * 31).toString(16)}`;
      securityEngine.setAuthenticatedUser(uid);
      return {
        id: uid,
        uid: uid,
        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone || "",
        photo: parsed.photo,
        provider: parsed.provider || "google",
        phoneVerified: Boolean(parsed.phoneVerified),
        createdAt: parsed.createdAt || Date.now(),
        role: parsed.role || "user",
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveAuthSession(user: AuthUser) {
  try {
    securityEngine.setAuthenticatedUser(user.id);
    window.localStorage.setItem(authSessionStorageKey, JSON.stringify(user));
    // Synchronize to profile storage and remembered pay user for backwards compatibility
    window.localStorage.setItem(profileStorageKey, JSON.stringify({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      photo: user.photo || "",
      uid: user.id,
      role: user.role || "user",
    }));
    if (user.phone) {
      window.localStorage.setItem(rememberedUserKey, JSON.stringify({
        name: user.name,
        mobile: user.phone.replace(/\D/g, "").slice(-10),
      }));
    }
  } catch {
    // LocalStorage quota or privacy mode error
  }
}

export function clearAuthSession() {
  try {
    securityEngine.setAuthenticatedUser(null);
    securityEngine.endAdminSession();
    window.localStorage.removeItem(authSessionStorageKey);
    window.localStorage.removeItem(rememberedUserKey);
    window.sessionStorage.removeItem("printq-auth-dismissed");
  } catch {
    // Ignore error
  }
}

// Available Google demo accounts representing Android Credential Manager choices
export const AVAILABLE_GOOGLE_ACCOUNTS = [
  {
    name: "Vipul Khunti",
    email: "vipul.khunti@gmail.com",
    photo: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80",
    role: "admin" as const,
  },
  {
    name: "Priya Sharma",
    email: "priya.sharma@campus.edu",
    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80",
    role: "user" as const,
  },
  {
    name: "Campus Print Administrator",
    email: "admin@campus.edu",
    photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=120&h=120&q=80",
    role: "admin" as const,
  },
];

const DEFAULT_GOOGLE_ACCOUNT = AVAILABLE_GOOGLE_ACCOUNTS[0];

export default function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
  requiredForAction = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: AuthUser) => void;
  requiredForAction?: boolean;
}) {
  const [authMode, setAuthMode] = useState<"google_picker" | "phone_prompt" | "otp_verify" | "direct_phone">("google_picker");
  const [selectedGoogleAccount, setSelectedGoogleAccount] = useState(DEFAULT_GOOGLE_ACCOUNT);
  const [showAccountChooser, setShowAccountChooser] = useState(false);
  const [isCustomGoogle, setIsCustomGoogle] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customEmail, setCustomEmail] = useState("");

  // Phone input & OTP state
  const [mobileNumber, setMobileNumber] = useState("");
  const [mobileError, setMobileError] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [resendSeconds, setResendSeconds] = useState(30);
  const [isVerifying, setIsVerifying] = useState(false);
  const [pendingUser, setPendingUser] = useState<Partial<AuthUser> | null>(null);

  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const verifyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (authMode === "otp_verify" && resendSeconds > 0) {
      const timer = window.setTimeout(() => setResendSeconds((s) => s - 1), 1000);
      return () => window.clearTimeout(timer);
    }
  }, [authMode, resendSeconds]);

  useEffect(() => {
    return () => {
      if (verifyTimerRef.current !== null) window.clearTimeout(verifyTimerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  // 1. Google Sign-In Action - Uses Security Engine to enforce UID & anti-impersonation
  const handleGoogleSignIn = async (chosenAccount = selectedGoogleAccount) => {
    const name = isCustomGoogle ? (customName.trim() || "Vipul Khunti") : chosenAccount.name;
    const email = isCustomGoogle ? (customEmail.trim() || "vipul.khunti@gmail.com") : chosenAccount.email;
    const photo = chosenAccount.photo;

    try {
      const profile: FirebaseUserProfile = await securityEngine.handleGoogleAuthSuccess({
        email,
        displayName: name,
        photoURL: photo,
        phoneNumber: "+91 98765 43210",
      });

      const fullUser: AuthUser = {
        id: profile.uid,
        uid: profile.uid,
        name: profile.displayName,
        email: profile.email,
        photo: profile.photoURL,
        provider: "google",
        phone: profile.phoneNumber,
        phoneVerified: profile.phoneVerified,
        createdAt: profile.createdAt,
        role: profile.role,
      };

      saveAuthSession(fullUser);
      onAuthSuccess(fullUser);
      onClose();
    } catch (err: any) {
      alert("Authentication Error: " + err.message);
    }
  };

  // 2. Submit Phone Number to receive OTP
  const handleSendOtp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanNumber = mobileNumber.replace(/\D/g, "");
    if (cleanNumber.length !== 10) {
      setMobileError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setMobileError("");
    setOtpDigits(["", "", "", ""]);
    setOtpError("");
    setResendSeconds(30);
    setAuthMode("otp_verify");
    window.setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
  };

  // 3. Auto-Verify OTP when 4 digits are completed
  const handleVerifyOtp = async (codeArr: string[]) => {
    const code = codeArr.join("");
    if (code.length !== 4 || isVerifying) return;
    if (!/^\d{4}$/.test(code)) {
      setOtpError("Please enter 4 valid numbers.");
      return;
    }

    setIsVerifying(true);
    setOtpError("");

    if (verifyTimerRef.current !== null) window.clearTimeout(verifyTimerRef.current);
    verifyTimerRef.current = window.setTimeout(async () => {
      setIsVerifying(false);

      const baseName = pendingUser?.name || (customName.trim() || "Campus Student");
      const baseEmail = pendingUser?.email || `${mobileNumber.slice(-4)}@campus.edu`;
      
      const profile = await securityEngine.handleGoogleAuthSuccess({
        email: baseEmail,
        displayName: baseName,
        photoURL: pendingUser?.photo,
        phoneNumber: `+91 ${mobileNumber.slice(0, 5)} ${mobileNumber.slice(5)}`,
      });

      const fullUser: AuthUser = {
        id: profile.uid,
        uid: profile.uid,
        name: profile.displayName,
        email: profile.email,
        phone: profile.phoneNumber,
        photo: profile.photoURL,
        provider: "phone",
        phoneVerified: true,
        createdAt: profile.createdAt,
        role: profile.role,
      };

      saveAuthSession(fullUser);
      onAuthSuccess(fullUser);
      onClose();
    }, 450);
  };

  const handleOtpChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const updated = otpDigits.map((d, i) => (i === index ? digit : d));
    setOtpDigits(updated);
    setOtpError("");
    if (digit && index < 3) {
      otpInputRefs.current[index + 1]?.focus();
    }
    if (updated.join("").length === 4) {
      handleVerifyOtp(updated);
    }
  };

  const handleOtpPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (pasted.length === 4) {
      e.preventDefault();
      const splitted = pasted.split("");
      setOtpDigits(splitted);
      otpInputRefs.current[3]?.focus();
      handleVerifyOtp(splitted);
    }
  };

  const handleOtpKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="auth-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <div className="auth-modal-panel">
        {/* Header Bar */}
        <div className="auth-modal-header">
          <div className="auth-modal-logo">
            <span style={{ color: "var(--text)", fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em" }}>Print</span>
            <span style={{ color: "var(--accent)", fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em" }}>Q</span>
          </div>
          {!requiredForAction && (
            <button
              type="button"
              className="auth-modal-close-btn"
              onClick={onClose}
              aria-label="Close sign in"
            >
              ✕
            </button>
          )}
        </div>

        {/* 1. Google Account Picker Screen */}
        {authMode === "google_picker" && (
          <div className="auth-flow-content">
            <div className="auth-hero-copy">
              <h1 id="auth-modal-title" className="auth-title">Welcome to PrintQ</h1>
              <p className="auth-subtitle">Fast, queue-free document printing on campus.</p>
            </div>

            {/* Android Credential Manager Style Account Picker */}
            <div className="auth-credential-card" role="region" aria-label="Sign in with Google Account">
              <div className="auth-credential-top">
                <svg className="google-g-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span className="auth-credential-label">Sign in with Google</span>
              </div>

              {!isCustomGoogle ? (
                <>
                  <div
                    className="auth-account-row is-active"
                    onClick={() => handleGoogleSignIn(selectedGoogleAccount)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Continue as ${selectedGoogleAccount.name}`}
                  >
                    <div className="auth-avatar-circle">
                      {selectedGoogleAccount.name.split(" ").map((w) => w[0]).join("")}
                    </div>
                    <div className="auth-account-details">
                      <strong className="auth-account-name">{selectedGoogleAccount.name}</strong>
                      <span className="auth-account-email">{selectedGoogleAccount.email}</span>
                    </div>
                    <span className="auth-account-chevron">→</span>
                  </div>

                  {/* Quick switch between accounts */}
                  <div style={{ display: "flex", gap: 6, margin: "-4px 0 8px" }}>
                    {AVAILABLE_GOOGLE_ACCOUNTS.map((acc) => (
                      <button
                        key={acc.email}
                        type="button"
                        style={{
                          padding: "3px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          background: selectedGoogleAccount.email === acc.email ? "rgba(244, 215, 121, 0.2)" : "#222222",
                          border: `1px solid ${selectedGoogleAccount.email === acc.email ? "var(--accent)" : "#333333"}`,
                          color: selectedGoogleAccount.email === acc.email ? "var(--accent)" : "var(--text-secondary)",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                        onClick={() => setSelectedGoogleAccount(acc)}
                      >
                        {acc.name.split(" ")[0]} ({acc.role === "admin" ? "Admin" : "Student"})
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "6px 0 8px" }}>
                  <input
                    type="text"
                    className="auth-input-field"
                    placeholder="Full Name (e.g. Priya Patel)"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    aria-label="Google Account Name"
                  />
                  <input
                    type="email"
                    className="auth-input-field"
                    placeholder="Google Email (e.g. priya@gmail.com)"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    aria-label="Google Account Email"
                  />
                </div>
              )}

              <button
                type="button"
                className="auth-google-continue-btn"
                onClick={() => handleGoogleSignIn(selectedGoogleAccount)}
              >
                {!isCustomGoogle ? `Continue as ${selectedGoogleAccount.name.split(" ")[0]}` : "Sign in with Google"}
              </button>

              <button
                type="button"
                className="auth-switch-account-link"
                onClick={() => setIsCustomGoogle(!isCustomGoogle)}
              >
                {!isCustomGoogle ? "Use another Google account" : "Back to default account"}
              </button>
            </div>

            {/* Alternative separator */}
            <div className="auth-divider">
              <span>or</span>
            </div>

            {/* Fallback to Phone OTP */}
            <button
              type="button"
              className="auth-alt-phone-btn"
              onClick={() => {
                setAuthMode("direct_phone");
                setMobileError("");
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
              <span>Continue with Phone Number</span>
            </button>

            {!requiredForAction && (
              <button
                type="button"
                className="auth-guest-link"
                onClick={onClose}
              >
                Skip for now · Continue as Guest
              </button>
            )}
          </div>
        )}

        {/* 2. Phone Number Collection (after Google Sign-In or Direct Phone) */}
        {(authMode === "phone_prompt" || authMode === "direct_phone") && (
          <form className="auth-flow-content" onSubmit={handleSendOtp}>
            <div className="auth-hero-copy">
              <h2 id="auth-modal-title" className="auth-title">Add Phone Number</h2>
              <p className="auth-subtitle">
                Enter your 10-digit mobile number for order pickup notifications.
              </p>
            </div>

            <div className="auth-input-group">
              <label htmlFor="auth-mobile-input" className="auth-input-label">Mobile Number</label>
              <div className="auth-phone-input-wrap">
                <span className="auth-country-prefix">+91</span>
                <input
                  id="auth-mobile-input"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  className="auth-phone-input"
                  placeholder="98765 43210"
                  value={mobileNumber}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setMobileNumber(cleaned);
                    setMobileError("");
                  }}
                  autoFocus
                  required
                />
              </div>
              {mobileError && <span className="auth-field-error" role="alert">{mobileError}</span>}
            </div>

            <button type="submit" className="auth-primary-action-btn">
              Send Verification Code
            </button>

            <button
              type="button"
              className="auth-back-link"
              onClick={() => {
                setAuthMode("google_picker");
                setMobileError("");
              }}
            >
              ← Back to Google Sign-In
            </button>
          </form>
        )}

        {/* 3. OTP Verification Screen */}
        {authMode === "otp_verify" && (
          <div className="auth-flow-content">
            <div className="auth-hero-copy">
              <h2 id="auth-modal-title" className="auth-title">Enter Verification Code</h2>
              <p className="auth-subtitle">
                Enter the 4-digit code sent to <strong>+91 {mobileNumber || "98765 43210"}</strong>
              </p>
            </div>

            <div className="auth-otp-row" onPaste={handleOtpPaste}>
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (otpInputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className="auth-otp-cell"
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                  aria-label={`Digit ${idx + 1}`}
                />
              ))}
            </div>

            {otpError && <div className="auth-field-error" role="alert" style={{ textAlign: "center" }}>{otpError}</div>}

            <div className="auth-otp-status-line">
              {isVerifying ? (
                <span className="auth-verifying-text">
                  <span className="auth-inline-spinner" /> Verifying code…
                </span>
              ) : resendSeconds > 0 ? (
                <span className="auth-resend-countdown">Resend code in {resendSeconds}s</span>
              ) : (
                <button
                  type="button"
                  className="auth-resend-active-btn"
                  onClick={() => {
                    setResendSeconds(30);
                    setOtpError("");
                    setOtpDigits(["", "", "", ""]);
                    window.setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
                  }}
                >
                  Resend code
                </button>
              )}
            </div>

            <button
              type="button"
              className="auth-primary-action-btn"
              disabled={otpDigits.join("").length !== 4 || isVerifying}
              onClick={() => handleVerifyOtp(otpDigits)}
            >
              {isVerifying ? "Verifying…" : "Confirm & Sign In"}
            </button>

            <button
              type="button"
              className="auth-back-link"
              onClick={() => {
                setAuthMode("direct_phone");
                setOtpError("");
              }}
            >
              Change phone number
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

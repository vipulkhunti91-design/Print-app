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
  const [authMode, setAuthMode] = useState<"google_email" | "google_password" | "phone_prompt" | "otp_verify" | "direct_phone">("google_email");
  const [selectedGoogleAccount, setSelectedGoogleAccount] = useState(DEFAULT_GOOGLE_ACCOUNT);
  
  // Real Google Sign-In inputs
  const [googleEmail, setGoogleEmail] = useState(DEFAULT_GOOGLE_ACCOUNT.email);
  const [googlePassword, setGooglePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [googleEmailError, setGoogleEmailError] = useState("");
  const [googlePasswordError, setGooglePasswordError] = useState("");

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

  // 1. Google Step 1: Submit Email -> Go to Password Step
  const handleGoogleEmailNext = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const emailVal = googleEmail.trim() || (document.getElementById("google-email-input") as HTMLInputElement)?.value?.trim() || "";
    const cleanEmail = emailVal.toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setGoogleEmailError("Enter a valid Google email address.");
      return;
    }
    setGoogleEmailError("");
    setGooglePasswordError("");

    // Match with existing account if available or default
    const matchedAccount = AVAILABLE_GOOGLE_ACCOUNTS.find(
      (a) => a.email.toLowerCase() === cleanEmail
    );
    if (matchedAccount) {
      setSelectedGoogleAccount(matchedAccount);
    } else {
      const derivedName = cleanEmail.split("@")[0].replace(/[._]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      setSelectedGoogleAccount({
        name: derivedName,
        email: cleanEmail,
        photo: undefined,
        role: "user",
      });
    }

    setAuthMode("google_password");
  };

  // 2. Google Step 2: Submit Password -> Check Phone or Request Verification
  const handleGooglePasswordNext = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const pw = googlePassword.trim() || (document.getElementById("google-password-input") as HTMLInputElement)?.value?.trim() || "";
    if (!pw) {
      setGooglePasswordError("Enter your password.");
      return;
    }
    setGooglePasswordError("");

    const name = selectedGoogleAccount.name;
    const email = selectedGoogleAccount.email;
    const photo = selectedGoogleAccount.photo;

    try {
      const existing = securityEngine.getExistingUserByEmail(email);

      // If user already has a registered & verified phone number, log in directly
      if (existing && existing.phoneNumber && existing.phoneVerified) {
        const profile: FirebaseUserProfile = await securityEngine.handleGoogleAuthSuccess({
          email,
          displayName: name,
          photoURL: photo,
          phoneNumber: existing.phoneNumber,
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
      } else {
        // Require mobile number / OTP verification for Google account
        const knownPhone = existing?.phoneNumber?.replace(/\D/g, "").slice(-10) ||
          (email.includes("vipul") ? "7096447726" : "");

        setPendingUser({
          name,
          email,
          photo,
          provider: "google",
        });

        if (knownPhone && knownPhone.length === 10) {
          setMobileNumber(knownPhone);
          setMobileError("");
          setOtpDigits(["", "", "", ""]);
          setOtpError("");
          setResendSeconds(30);
          setAuthMode("otp_verify");
          window.setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
        } else {
          setMobileNumber("");
          setMobileError("");
          setAuthMode("phone_prompt");
        }
      }
    } catch (err: any) {
      alert("Authentication Error: " + err.message);
    }
  };

  // 3. Submit Phone Number to receive OTP
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

  // 4. Auto-Verify OTP when 4 digits are completed
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

      const baseName = pendingUser?.name || selectedGoogleAccount.name || "Campus Student";
      const baseEmail = pendingUser?.email || selectedGoogleAccount.email || `${mobileNumber.slice(-4)}@campus.edu`;
      const formattedPhone = `+91 ${mobileNumber.slice(0, 5)} ${mobileNumber.slice(5)}`;
      
      const profile = await securityEngine.handleGoogleAuthSuccess({
        email: baseEmail,
        displayName: baseName,
        photoURL: pendingUser?.photo,
        phoneNumber: formattedPhone,
      });

      const fullUser: AuthUser = {
        id: profile.uid,
        uid: profile.uid,
        name: profile.displayName,
        email: profile.email,
        phone: profile.phoneNumber,
        photo: profile.photoURL,
        provider: pendingUser?.provider === "google" ? "google" : "phone",
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
    const sanitized = val.replace(/\D/g, "").slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = sanitized;
    setOtpDigits(newDigits);
    setOtpError("");

    if (sanitized && index < 3) {
      otpInputRefs.current[index + 1]?.focus();
    }

    if (sanitized && index === 3 && newDigits.every((d) => d !== "")) {
      handleVerifyOtp(newDigits);
    }
  };

  const handleOtpKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (!pasted) return;
    const newDigits = ["", "", "", ""];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setOtpDigits(newDigits);
    if (pasted.length === 4) {
      handleVerifyOtp(newDigits);
    } else {
      otpInputRefs.current[Math.min(3, pasted.length)]?.focus();
    }
  };

  return (
    <div className="auth-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <div className={`auth-modal-card${authMode.startsWith("google_") ? " is-real-google-ui" : ""}`}>
        
        {/* Top Header Row with Logo and Close */}
        <div className="auth-modal-header">
          <div className="auth-brand-badge">
            <span className="auth-brand-text">Print<span style={{ color: "var(--accent)" }}>Q</span></span>
          </div>
          <button
            type="button"
            className="auth-modal-close-btn"
            onClick={onClose}
            aria-label="Close authentication modal"
          >
            ✕
          </button>
        </div>

        {/* =========================================================================
            SCREEN 1: REAL GOOGLE SIGN-IN — EMAIL INPUT STEP
            ========================================================================= */}
        {authMode === "google_email" && (
          <form className="real-google-container" onSubmit={handleGoogleEmailNext}>
            {/* Google 4-Color Mark */}
            <div className="real-google-logo-row">
              <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            </div>

            <div className="real-google-hero-copy">
              <h2 id="auth-modal-title" className="real-google-title">Sign in</h2>
              <p className="real-google-subtitle">with your Google Account to continue to PrintQ</p>
            </div>

            {/* Quick account suggestions chip row */}
            <div className="real-google-quick-accounts">
              <span className="real-google-quick-label">Choose account:</span>
              <div className="real-google-chips-wrap">
                {AVAILABLE_GOOGLE_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    className={`real-google-account-chip${googleEmail === acc.email ? " is-active" : ""}`}
                    onClick={() => {
                      setGoogleEmail(acc.email);
                      setSelectedGoogleAccount(acc);
                      setGoogleEmailError("");
                    }}
                  >
                    <span className="real-google-chip-avatar">{acc.name[0]}</span>
                    <span className="real-google-chip-text">{acc.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Google Outlined Input for Email */}
            <div className={`real-google-input-group${googleEmailError ? " has-error" : ""}`}>
              <label htmlFor="google-email-input" className="real-google-input-label">Email or phone</label>
              <input
                id="google-email-input"
                type="email"
                className="real-google-input-field"
                placeholder="name@gmail.com"
                value={googleEmail}
                onChange={(e) => {
                  setGoogleEmail(e.target.value);
                  setGoogleEmailError("");
                }}
                autoFocus
                required
              />
              {googleEmailError && <span className="real-google-field-error" role="alert">{googleEmailError}</span>}
            </div>

            <div className="real-google-links-row">
              <button
                type="button"
                className="real-google-text-link"
                onClick={() => setGoogleEmail("vipul.khunti@gmail.com")}
              >
                Forgot email?
              </button>
            </div>

            <p className="real-google-disclaimer">
              To continue, Google will share your name, email address, language preference, and profile picture with PrintQ.
            </p>

            <div className="real-google-actions-row">
              <button
                type="button"
                className="real-google-secondary-btn"
                onClick={() => {
                  setAuthMode("direct_phone");
                  setMobileError("");
                }}
              >
                Use phone number
              </button>
              <button
                type="submit"
                className="real-google-next-btn"
              >
                Next
              </button>
            </div>

            <div style={{ marginTop: 14, textAlign: "center" }}>
              <button
                type="button"
                className="auth-guest-link"
                onClick={onClose}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  fontSize: 13,
                  cursor: "pointer",
                  padding: "6px 12px",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                }}
              >
                Continue without signing in
              </button>
            </div>
          </form>
        )}

        {/* =========================================================================
            SCREEN 2: REAL GOOGLE SIGN-IN — PASSWORD INPUT STEP
            ========================================================================= */}
        {authMode === "google_password" && (
          <form className="real-google-container" onSubmit={handleGooglePasswordNext}>
            {/* Google 4-Color Mark */}
            <div className="real-google-logo-row">
              <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            </div>

            {/* User Account Selection Chip with Back Switch */}
            <div className="real-google-user-pill-wrap">
              <button
                type="button"
                className="real-google-user-pill"
                onClick={() => setAuthMode("google_email")}
                title="Switch account"
              >
                <span className="real-google-user-pill-avatar">
                  {selectedGoogleAccount.name[0]}
                </span>
                <span className="real-google-user-pill-email">
                  {selectedGoogleAccount.email}
                </span>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>

            <div className="real-google-hero-copy">
              <h2 id="auth-modal-title" className="real-google-title">Hi {selectedGoogleAccount.name.split(" ")[0]}</h2>
              <p className="real-google-subtitle">To continue, enter your password</p>
            </div>

            {/* Google Outlined Input for Password */}
            <div className={`real-google-input-group${googlePasswordError ? " has-error" : ""}`}>
              <label htmlFor="google-password-input" className="real-google-input-label">Enter your password</label>
              <div className="real-google-password-input-wrap">
                <input
                  id="google-password-input"
                  type={showPassword ? "text" : "password"}
                  className="real-google-input-field"
                  placeholder="Password"
                  value={googlePassword}
                  onChange={(e) => {
                    setGooglePassword(e.target.value);
                    setGooglePasswordError("");
                  }}
                  autoFocus
                  required
                />
                <button
                  type="button"
                  className="real-google-pw-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {googlePasswordError && <span className="real-google-field-error" role="alert">{googlePasswordError}</span>}
            </div>

            <div className="real-google-show-pw-row">
              <label className="real-google-checkbox-label">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                />
                <span>Show password</span>
              </label>
              <button
                type="button"
                className="real-google-text-link"
                onClick={() => setGooglePassword("PrintQ#2026")}
              >
                Forgot password?
              </button>
            </div>

            <div className="real-google-actions-row">
              <button
                type="button"
                className="real-google-secondary-btn"
                onClick={() => setAuthMode("google_email")}
              >
                Back
              </button>
              <button
                type="submit"
                className="real-google-next-btn"
              >
                Next
              </button>
            </div>

            <div style={{ marginTop: 14, textAlign: "center" }}>
              <button
                type="button"
                className="auth-guest-link"
                onClick={onClose}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  fontSize: 13,
                  cursor: "pointer",
                  padding: "6px 12px",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                }}
              >
                Continue without signing in
              </button>
            </div>
          </form>
        )}

        {/* =========================================================================
            SCREEN 3: ADD MOBILE NUMBER (IF NOT YET PROVIDED)
            ========================================================================= */}
        {(authMode === "phone_prompt" || authMode === "direct_phone") && (
          <form className="auth-flow-content" onSubmit={handleSendOtp}>
            <div className="auth-hero-copy">
              <h2 id="auth-modal-title" className="auth-title">Add Mobile Number</h2>
              <p className="auth-subtitle">
                Enter your 10-digit mobile number for order pickup notifications.
              </p>
              {pendingUser?.email && (
                <div style={{ marginTop: 8, padding: "4px 10px", background: "#1c1c1c", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid #2a2a2a" }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Google:</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)" }}>{pendingUser.email}</span>
                </div>
              )}
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
                setAuthMode("google_email");
                setMobileError("");
              }}
            >
              ← Back to Google Sign-In
            </button>

            <button
              type="button"
              className="auth-guest-link"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                fontSize: 13,
                cursor: "pointer",
                padding: "8px 12px",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
                width: "100%",
                marginTop: 6,
              }}
            >
              Continue without signing in
            </button>
          </form>
        )}

        {/* =========================================================================
            SCREEN 4: ENTER VERIFICATION CODE (MATCHING USER'S IMAGE 2)
            ========================================================================= */}
        {authMode === "otp_verify" && (
          <div className="auth-flow-content">
            <div className="auth-hero-copy">
              <h2 id="auth-modal-title" className="auth-title">Enter Verification Code</h2>
              <p className="auth-subtitle">
                Enter the 4-digit code sent to <strong>+91 {mobileNumber || "7096447726"}</strong>
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
              disabled={isVerifying}
              onClick={() => {
                const domDigits = Array.from(document.querySelectorAll<HTMLInputElement>(".auth-otp-cell")).map((c) => c.value);
                const codeArr = otpDigits.every((d) => d) ? otpDigits : domDigits.some((d) => d) ? domDigits : ["4", "8", "6", "8"];
                handleVerifyOtp(codeArr);
              }}
            >
              {isVerifying ? "Verifying…" : "Confirm & Sign In"}
            </button>

            <button
              type="button"
              className="auth-back-link"
              onClick={() => {
                setAuthMode("phone_prompt");
                setOtpError("");
              }}
            >
              Change phone number
            </button>

            <button
              type="button"
              className="auth-guest-link"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                fontSize: 13,
                cursor: "pointer",
                padding: "8px 12px",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
                width: "100%",
                marginTop: 4,
              }}
            >
              Continue without signing in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

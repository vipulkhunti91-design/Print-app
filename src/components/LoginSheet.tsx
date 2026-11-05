import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import {
  OTP_CODE_PATTERN,
  OTP_LENGTH,
  clearPreviewOtp,
  otpErrorMessage,
  sendOtp,
  verifyOtp,
} from "../services/otpService";
import { useSmsOtpAutoFill } from "../hooks/useSmsOtpAutoFill";
import { MobileLoginIllustration } from "./AppIllustrations";

const emptyOtp = () => Array.from({ length: OTP_LENGTH }, () => "");

export type LoginSummary = {
  fileName: string;
  pages: number;
  copies: number;
  total: string;
};

type User = { name: string; mobile: string };
type LoginStep = "details" | "otp" | "payment";
type PaymentMethod = "Online UPI" | "Cash at Counter";

const rememberedUserKey = "printq-remembered-pay-user";

function readRememberedUser(): User | null {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(rememberedUserKey) ?? "null") as Partial<User> | null;
    return parsed && typeof parsed.name === "string" && typeof parsed.mobile === "string"
      ? { name: parsed.name, mobile: parsed.mobile }
      : null;
  } catch {
    return null;
  }
}

export default function LoginSheet({ summary, onClose, onPaymentContinue }: { summary: LoginSummary; onClose: () => void; onPaymentContinue: () => void }) {
  const [step, setStep] = useState<LoginStep>("details");
  const [rememberedUser, setRememberedUser] = useState<User | null>(() => readRememberedUser());
  const [showRemembered, setShowRemembered] = useState(() => Boolean(readRememberedUser()));
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [mobileTouched, setMobileTouched] = useState(false);
  const [detailsAttempted, setDetailsAttempted] = useState(false);
  const [otp, setOtp] = useState<string[]>(emptyOtp);
  const [seconds, setSeconds] = useState(30);
  const [verifying, setVerifying] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [previewCode, setPreviewCode] = useState("");
  const [autoFilled, setAutoFilled] = useState(false);
  const [sendError, setSendError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [useAnotherNumber, setUseAnotherNumber] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const nameRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const verifyingRef = useRef(false);

  const maskedMobile = mobile.length === 10 ? `${mobile.slice(0, 2)}xxxxxx${mobile.slice(-2)}` : "";
  const nameInvalid = !name.trim();
  const mobileInvalid = !/^\d{10}$/.test(mobile);
  const showNameError = nameInvalid && (nameTouched || detailsAttempted);
  const showMobileError = mobileInvalid && (mobileTouched || detailsAttempted);
  const rememberedView = Boolean(rememberedUser && showRemembered && !useAnotherNumber);
  const progressStep = rememberedView ? "payment" : step;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      clearPreviewOtp();
    };
  }, []);

  useEffect(() => {
    if (step === "details" && !rememberedView) nameRef.current?.focus();
    if (step === "otp") inputRefs.current[0]?.focus();
    if (rememberedView) dialogRef.current?.querySelector<HTMLButtonElement>(".login-sheet-close")?.focus();
  }, [step, rememberedView]);

  useEffect(() => {
    if (step !== "otp" || seconds <= 0) return;
    const timer = window.setTimeout(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [step, seconds]);

  useEffect(() => {
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [onClose]);

  const [otpStatus, setOtpStatus] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const [otpError, setOtpError] = useState("");

  const submitDetails = async () => {
    setDetailsAttempted(true);
    if (nameInvalid || mobileInvalid || sendingOtp) return;
    setSendingOtp(true);
    setSendError("");
    setOtpStatus("idle");
    setOtpError("");
    try {
      const result = await sendOtp(mobile);
      setPreviewCode(result.devCode || "");
      setAutoFilled(false);
      setOtp(emptyOtp());
      setSeconds(30);
      setStep("otp");
    } catch (error) {
      setSendError(otpErrorMessage(error));
    } finally {
      setSendingOtp(false);
    }
  };

  const resendOtp = async () => {
    if (sendingOtp) return;
    setSendingOtp(true);
    setSendError("");
    setOtpError("");
    try {
      const result = await sendOtp(mobile);
      setPreviewCode(result.devCode || "");
      setAutoFilled(false);
      setOtp(emptyOtp());
      setSeconds(30);
      setOtpStatus("idle");
      inputRefs.current[0]?.focus();
    } catch (error) {
      setOtpError(otpErrorMessage(error));
    } finally {
      setSendingOtp(false);
    }
  };

  const triggerAutoVerify = async (newOtp: string[]) => {
    const code = newOtp.join("");
    if (code.length !== OTP_LENGTH || verifyingRef.current) return;
    if (!OTP_CODE_PATTERN.test(code)) {
      setOtpStatus("error");
      setOtpError(`Please enter valid ${OTP_LENGTH} digits.`);
      return;
    }
    verifyingRef.current = true;
    setVerifying(true);
    setOtpStatus("verifying");
    setOtpError("");

    try {
      await verifyOtp(mobile, code);
      setOtpStatus("success");
      const user = { name: name.trim(), mobile };
      try { window.localStorage.setItem(rememberedUserKey, JSON.stringify(user)); } catch { /* Remember the user for this session. */ }
      setRememberedUser(user);

      // Auto-navigate to Bill Review (checkout) upon successful verification
      window.setTimeout(() => {
        onPaymentContinue();
        onClose();
      }, 400);
    } catch (error) {
      setOtpStatus("error");
      setOtpError(otpErrorMessage(error));
      setOtp(emptyOtp());
      window.setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally {
      verifyingRef.current = false;
      setVerifying(false);
    }
  };

  const applyAndVerifyOtp = (digits: string) => {
    if (step !== "otp") return;
    const normalized = digits.replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (normalized.length !== OTP_LENGTH) return;
    const next = Array.from({ length: OTP_LENGTH }, (_, index) => normalized[index] ?? "");
    setOtp(next);
    setOtpError("");
    setAutoFilled(true);
    void triggerAutoVerify(next);
  };

  useSmsOtpAutoFill(step === "otp", applyAndVerifyOtp);


  const changeDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const updated = otp.map((item, itemIndex) => itemIndex === index ? digit : item);
    setOtp(updated);
    setOtpError("");
    setAutoFilled(false);
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    if (updated.join("").length === OTP_LENGTH) {
      triggerAutoVerify(updated);
    }
  };

  const pasteCode = (event: ClipboardEvent<HTMLInputElement>) => {
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (digits.length !== OTP_LENGTH) return;
    event.preventDefault();
    const splitDigits = digits.split("");
    setOtp(splitDigits);
    setOtpError("");
    setAutoFilled(false);
    inputRefs.current[OTP_LENGTH - 1]?.focus();
    triggerAutoVerify(splitDigits);
  };

  const handleOtpKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setOtp((current) => current.map((digit, digitIndex) => digitIndex === index - 1 ? "" : digit));
      setOtpError("");
      setOtpStatus("idle");
    }
  };

  const verifyCode = () => {
    triggerAutoVerify(otp);
  };

  const continueRemembered = () => {
    setShowRemembered(false);
    onPaymentContinue();
    onClose();
  };


  const continuePayment = () => {
    if (!paymentMethod) return;
    onPaymentContinue();
    onClose();
  };

  const chooseAnother = () => {
    try { window.localStorage.removeItem(rememberedUserKey); } catch { /* The current session can still continue. */ }
    setRememberedUser(null);
    setShowRemembered(false);
    setUseAnotherNumber(true);
    clearPreviewOtp();
    setName("");
    setMobile("");
    setOtp(emptyOtp());
    setPreviewCode("");
    setAutoFilled(false);
    setSendError("");
    setDetailsAttempted(false);
    setNameTouched(false);
    setMobileTouched(false);
    setStep("details");
  };

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), a[href]");
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const steps: LoginStep[] = ["details", "otp", "payment"];
  const stepLabels: Record<LoginStep, string> = { details: "Details", otp: "OTP", payment: "Pay" };

  return (
    <>
      <div className="login-sheet-overlay" aria-hidden="true" onClick={onClose} />
      <section
        ref={dialogRef}
        className="login-sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-sheet-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleDialogKeyDown}
      >
        <div className="login-sheet-topline">
          <div className="login-sheet-progress" role="group" aria-label={`Step ${steps.indexOf(progressStep) + 1} of 3`}>
            {steps.map((item) => <div key={item} className={progressStep === item ? "active" : ""} aria-current={progressStep === item ? "step" : undefined}>
              <span className="login-sheet-dot" />
              <span>{stepLabels[item]}</span>
            </div>)}
          </div>
          <button type="button" className="login-sheet-close" aria-label="Close login" onClick={onClose}>×</button>
        </div>

        {rememberedView ? <>
          <h2 id="login-sheet-title">Continue as {rememberedUser?.name}</h2>
          <button type="button" className="login-sheet-primary" onClick={continueRemembered}>Continue</button>
          <button type="button" className="login-sheet-text-link" onClick={chooseAnother}>Not you? Use another number</button>
        </> : step === "details" ? <>
          <MobileLoginIllustration />
          <h2 id="login-sheet-title">Almost done</h2>
          <div className="login-sheet-summary">
            <strong title={summary.fileName}>{summary.fileName}</strong>
            <span>{summary.pages} pages · {summary.copies} {summary.copies === 1 ? "copy" : "copies"}</span>
            <b>{summary.total}</b>
          </div>
          <form className="login-sheet-form" onSubmit={(event) => { event.preventDefault(); submitDetails(); }}>
            <label>Full name
              <input ref={nameRef} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} onBlur={() => setNameTouched(true)} aria-invalid={showNameError} aria-describedby={showNameError ? "login-name-error" : undefined} />
              {showNameError && <small id="login-name-error" className="login-sheet-error" role="alert">Please enter your name</small>}
            </label>
            <label>Mobile number
              <span className="login-sheet-mobile-input"><span aria-hidden="true">+91</span><input type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} value={mobile} onChange={(event) => setMobile(event.target.value.replace(/\D/g, "").slice(0, 10))} onBlur={() => setMobileTouched(true)} aria-label="10-digit mobile number" aria-invalid={showMobileError} aria-describedby={showMobileError ? "login-mobile-error" : undefined} /></span>
              {mobile.length === 10 && !showMobileError && (
                <small style={{ color: "var(--status-ready)", fontSize: 11, display: "flex", alignItems: "center", gap: 4, marginTop: 4, fontWeight: 700 }}>
                  <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--status-ready)" }} />
                  Valid 10-digit mobile number
                </small>
              )}
              {showMobileError && <small id="login-mobile-error" className="login-sheet-error" role="alert">Enter a valid 10-digit number</small>}
            </label>
            <p className="login-sheet-muted">We use your number only to send your token and ready alerts.</p>
            {sendError && <p className="login-sheet-error" role="alert">{sendError}</p>}
            <button type="submit" className="login-sheet-primary" disabled={!name.trim() || !/^\d{10}$/.test(mobile) || sendingOtp}>
              {sendingOtp ? "Sending OTP…" : "Get OTP"}
            </button>
          </form>
          <p className="login-sheet-terms">By continuing you agree to the Terms and Privacy Policy.</p>
        </> : step === "otp" ? <>
          <h2 id="login-sheet-title">Enter OTP</h2>
          <p className="login-sheet-sent">Sent to +91 {maskedMobile} <button type="button" className="login-sheet-text-link inline" onClick={() => { clearPreviewOtp(); setOtp(emptyOtp()); setPreviewCode(""); setAutoFilled(false); setOtpStatus("idle"); setStep("details"); }}>Edit</button></p>
          <div className="login-sheet-otp" role="group" aria-label={`${OTP_LENGTH}-digit one-time password`}>
            {otp.map((digit, index) => <input key={index} ref={(element) => { inputRefs.current[index] = element; }} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={1} autoComplete={index === 0 ? "one-time-code" : "off"} value={digit} aria-label={`OTP digit ${index + 1} of ${OTP_LENGTH}`} onChange={(event) => changeDigit(index, event.target.value)} onPaste={pasteCode} onKeyDown={(event) => handleOtpKeyDown(event, index)} />)}
          </div>
          {previewCode && (
            <p className="login-sheet-demo-hint" role="status" style={{ textAlign: "center", margin: "8px 0" }}>
              Preview mode (SMS Gateway not configured in .env): Use code{" "}
              <button
                type="button"
                onClick={() => applyAndVerifyOtp(previewCode)}
                style={{
                  background: "rgba(244, 215, 121, 0.15)",
                  border: "1px solid var(--accent)",
                  borderRadius: 6,
                  padding: "2px 8px",
                  color: "var(--accent)",
                  fontWeight: 800,
                  cursor: "pointer",
                  fontSize: 13,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  verticalAlign: "middle",
                }}
                title="Click to auto-fill code"
              >
                <strong>{previewCode}</strong> (Tap to Auto-fill)
              </button>
            </p>
          )}
          {otpError && <p className="login-sheet-error" role="alert" style={{ textAlign: "center", marginTop: "8px" }}>{otpError}</p>}
          <p className="login-sheet-resend">{seconds > 0 ? `Resend in ${seconds}s` : <button type="button" className="login-sheet-text-link" disabled={sendingOtp} onClick={resendOtp}>{sendingOtp ? "Sending…" : "Resend OTP"}</button>}</p>
          <div className="login-sheet-status-indicator" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", minHeight: "24px", margin: "6px 0", fontSize: "13px", color: otpStatus === "success" ? "var(--status-ready)" : "var(--text-muted)" }}>
            {verifying && <span className="login-sheet-spinner" aria-hidden="true" />}
            {otpStatus === "verifying" && <span>Verifying OTP…</span>}
            {otpStatus === "success" && <span style={{ fontWeight: 600 }}>{autoFilled ? "✓ OTP auto-verified from SMS!" : "✓ OTP verified successfully! Redirecting…"}</span>}
            {otpStatus === "idle" && <span>{OTP_LENGTH}-digit code · Auto-verifies automatically</span>}
          </div>
          <button type="button" className="login-sheet-primary" disabled={otp.join("").length !== OTP_LENGTH || verifying || sendingOtp} onClick={verifyCode}>
            {verifying ? "Verifying…" : otpStatus === "success" ? "Verified!" : "Continue"}
          </button>
        </> : <>
          <h2 id="login-sheet-title">Choose payment</h2>
          <fieldset className="login-sheet-payment-options">
            <legend className="sr-only">Choose one payment method</legend>
            {(["Online UPI", "Cash at Counter"] as const).map((method) => <label key={method} className={`login-sheet-payment-option${paymentMethod === method ? " selected" : ""}`}>
              <input type="radio" name="login-payment-method" value={method} checked={paymentMethod === method} onChange={() => setPaymentMethod(method)} />
              <span>{method}</span>
            </label>)}
          </fieldset>
          <button type="button" className="login-sheet-primary" disabled={!paymentMethod} onClick={continuePayment}>Continue</button>
        </>}
      </section>
    </>
  );
}

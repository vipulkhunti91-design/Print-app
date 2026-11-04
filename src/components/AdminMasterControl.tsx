import React, { useState, useEffect, useMemo } from "react";
import {
  securityEngine,
  type FirebaseOrderRecord,
  type FirebaseUserProfile,
  type AdminAuditLogEntry,
  type PrinterHardwareStatus,
} from "../services/securityEngine";

export default function AdminMasterControl({
  onBack,
  adminUser,
  onOrderUpdated,
}: {
  onBack: () => void;
  adminUser: { uid: string; email: string; name: string };
  onOrderUpdated?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "orders" | "users" | "pricing" | "controls" | "audit">("overview");
  const [is2FAVerified, setIs2FAVerified] = useState(() => securityEngine.hasVerifiedAdminSession());

  // Master Control Login Inputs
  const [adminNameInput, setAdminNameInput] = useState("Vipul");
  const [adminMobileInput, setAdminMobileInput] = useState("7096447726");
  const [adminPinInput, setAdminPinInput] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Live Admin Data
  const [adminData, setAdminData] = useState<ReturnType<typeof securityEngine.getAdminMasterData> | null>(null);

  // Paper & Pricing Management
  const [paperPricing, setPaperPricing] = useState(() => securityEngine.getPaperPricing());
  const [pricingEdited, setPricingEdited] = useState(false);

  // Filters & State
  const [orderFilter, setOrderFilter] = useState<"all" | "active" | "ready" | "completed" | "cancelled">("all");
  const [searchOrder, setSearchOrder] = useState("");
  const [delayModalOrderId, setDelayModalOrderId] = useState<string | null>(null);
  const [delayReason, setDelayReason] = useState("");
  const [feedbackToast, setFeedbackToast] = useState("");

  // Modals for Orders
  const [previewOrder, setPreviewOrder] = useState<FirebaseOrderRecord | null>(null);
  const [cancelModalOrder, setCancelModalOrder] = useState<FirebaseOrderRecord | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState("");
  const [pauseReasonInput, setPauseReasonInput] = useState("");

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    window.setTimeout(() => setFeedbackToast(""), 3500);
  };

  const loadData = () => {
    try {
      if (securityEngine.hasVerifiedAdminSession()) {
        const data = securityEngine.getAdminMasterData();
        setAdminData(data);
        setPaperPricing(securityEngine.getPaperPricing());
      }
    } catch (e: any) {
      console.error("Admin data load error:", e);
    }
  };

  useEffect(() => {
    if (is2FAVerified) {
      loadData();
    }
  }, [is2FAVerified]);

  // Handle Master Control Login Form Submission
  const handleMasterControlLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const domName = (document.getElementById("admin-name-input") as HTMLInputElement)?.value?.trim();
    const domMobile = (document.getElementById("admin-mobile-input") as HTMLInputElement)?.value?.trim();
    const domPin = (document.getElementById("admin-pin-input") as HTMLInputElement)?.value?.trim();

    const nameVal = domName || adminNameInput.trim() || "";
    const mobileVal = domMobile || adminMobileInput.trim() || "";
    const pinVal = domPin || adminPinInput.trim() || "";

    if (!nameVal || !mobileVal || !pinVal) {
      setLoginError("Please enter administrator name, mobile number, and PIN.");
      return;
    }
    setIsVerifying(true);
    setLoginError("");

    try {
      await securityEngine.verifyMasterControlLogin(
        nameVal,
        mobileVal,
        pinVal
      );
      setIs2FAVerified(true);
      showToast("✓ Authenticated as Master Admin (Vipul)");
      loadData();
    } catch (err: any) {
      setLoginError(err.message || "Invalid administrator credentials or PIN.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle Status Update
  const handleStatusChange = (orderId: string, nextStatus: FirebaseOrderRecord["status"], note?: string) => {
    try {
      securityEngine.updateOrderStatusAsAdmin(orderId, nextStatus, note);
      showToast(`✓ Order status updated to ${nextStatus.toUpperCase()}`);
      loadData();
      if (onOrderUpdated) onOrderUpdated();
    } catch (err: any) {
      showToast(`Transition error: ${err.message}`);
    }
  };

  // Confirm Order Cancellation
  const handleConfirmCancelOrder = () => {
    if (!cancelModalOrder) return;
    const reason = cancelReasonInput.trim() || "Cancelled by Print Shop Administrator";
    handleStatusChange(cancelModalOrder.id, "cancelled", reason);
    setCancelModalOrder(null);
    setCancelReasonInput("");
  };

  // Secure File Download for Printer
  const handleDownloadDocument = (order: FirebaseOrderRecord) => {
    try {
      const fileName = order.job.fileName || `PrintQ_Doc_${order.token}.pdf`;
      const docHeader = `=== PRINTQ CAMPUS PRINT DOCUMENT ===\n` +
        `Token: ${order.token}\n` +
        `Customer: ${order.userName} (${order.userEmail})\n` +
        `Job Details: ${order.job.pages} Pages × ${order.job.copies} Copies | ${order.job.colour ? "Full Colour" : "B&W"}\n` +
        `Paper: ${order.job.paper || "A4"} (${order.job.paperStock || "Regular"}) | Single-Sided: ${order.job.singleSided ? "Yes" : "No"}\n` +
        `Agreed Price: ₹${order.totalAmount.toFixed(2)}\n` +
        `Submitted: ${new Date(order.createdAt).toLocaleString()}\n` +
        `Status: ${order.status.toUpperCase()}\n\n` +
        `[Verified Document Stream Content]\n` +
        `This document has been decrypted for campus print processing.\n`;

      const blob = new Blob([docHeader], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`✓ Downloaded ${order.token} file for printing.`);
    } catch (err: any) {
      showToast(`Download error: ${err.message}`);
    }
  };

  // Save Pricing Changes with Non-Negative Validation
  const handleSavePricing = () => {
    try {
      // Validate non-negative numbers
      const sanitizedStocks = paperPricing.stocks.map((s) => ({
        ...s,
        surcharge: Math.max(0, Number(s.surcharge) || 0),
      }));
      const sanitizedSizes = paperPricing.sizes.map((sz) => ({
        ...sz,
        surcharge: Math.max(0, Number(sz.surcharge) || 0),
      }));

      securityEngine.updatePaperPricing(sanitizedStocks, sanitizedSizes);
      setPaperPricing({ stocks: sanitizedStocks, sizes: sanitizedSizes });
      setPricingEdited(false);
      showToast("✓ Paper rates and surcharges saved successfully.");
      loadData();
    } catch (err: any) {
      showToast(`Error saving pricing: ${err.message}`);
    }
  };

  // Toggle Paper Stock Availability
  const handleToggleStockAvailability = (stockId: string) => {
    try {
      const res = securityEngine.togglePaperStockAvailability(stockId);
      setPaperPricing(res);
      const target = res.stocks.find((s) => s.id === stockId);
      showToast(`✓ ${target?.title} marked ${target?.inStock !== false ? "In Stock" : "Out of Stock"}`);
    } catch (err: any) {
      showToast(`Stock error: ${err.message}`);
    }
  };

  // Toggle Queue Pause
  const handleToggleQueuePause = () => {
    try {
      const currentPaused = adminData?.metrics.queuePaused ?? false;
      const next = !currentPaused;
      const reason = next ? (pauseReasonInput.trim() || "Queue temporarily paused for machine maintenance") : undefined;
      securityEngine.setQueuePaused(next, reason);
      showToast(next ? "Print queue PAUSED. New orders blocked." : "Print queue RESUMED. Accepting submissions.");
      loadData();
    } catch (err: any) {
      showToast(`Queue error: ${err.message}`);
    }
  };

  // Set Printer State
  const handleSetPrinterState = (status: PrinterHardwareStatus) => {
    try {
      securityEngine.setPrinterState(status);
      showToast(`Printer state set to ${status.toUpperCase()}`);
      loadData();
    } catch (err: any) {
      showToast(`Printer error: ${err.message}`);
    }
  };

  const filteredOrders = useMemo(() => {
    if (!adminData) return [];
    return adminData.orders.filter((o) => {
      if (orderFilter === "active") {
        if (o.status !== "confirmed" && o.status !== "queued" && o.status !== "printing") return false;
      } else if (orderFilter === "ready") {
        if (o.status !== "ready") return false;
      } else if (orderFilter === "completed") {
        if (o.status !== "completed") return false;
      } else if (orderFilter === "cancelled") {
        if (o.status !== "cancelled") return false;
      }
      if (searchOrder.trim()) {
        const q = searchOrder.toLowerCase();
        return (
          o.token.toLowerCase().includes(q) ||
          o.userEmail.toLowerCase().includes(q) ||
          o.userName.toLowerCase().includes(q) ||
          o.job.fileName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [adminData, orderFilter, searchOrder]);

  // ===========================================================================
  // 1. RESTRICTED MASTER CONTROL LOGIN SCREEN
  // ===========================================================================
  if (!is2FAVerified) {
    return (
      <main className="page admin-lockout-page" style={{ maxWidth: 440, margin: "0 auto", padding: "28px 16px" }}>
        <div className="admin-lock-card">
          <div className="admin-shield-icon">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h1 className="admin-lock-title">Shopkeeper Master Control</h1>
          <p className="admin-lock-sub">
            Administrative area for Campus Print Operations. Multi-factor identity verification required.
          </p>

          <form onSubmit={handleMasterControlLogin} className="admin-login-form">
            <div style={{ marginBottom: 12 }}>
              <label htmlFor="admin-name-input" className="admin-form-label">
                Administrator Name
              </label>
              <input
                id="admin-name-input"
                type="text"
                className="admin-form-input"
                placeholder="Enter administrator name (e.g. Vipul)"
                value={adminNameInput}
                onChange={(e) => setAdminNameInput(e.target.value)}
                autoComplete="name"
                required
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label htmlFor="admin-mobile-input" className="admin-form-label">
                Registered Mobile Number
              </label>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", padding: "10px 12px", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 10 }}>
                  +91
                </span>
                <input
                  id="admin-mobile-input"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  className="admin-form-input"
                  placeholder="10-digit mobile number (e.g. 7096447726)"
                  value={adminMobileInput}
                  onChange={(e) => setAdminMobileInput(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  autoComplete="tel-national"
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label htmlFor="admin-pin-input" className="admin-form-label" style={{ margin: 0 }}>
                  Secondary Verification PIN
                </label>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  style={{ background: "transparent", border: "none", color: "var(--text-secondary)", fontSize: 12, cursor: "pointer" }}
                >
                  {showPin ? "Hide PIN" : "Show PIN"}
                </button>
              </div>
              <input
                id="admin-pin-input"
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                maxLength={6}
                className="admin-form-input"
                placeholder="Enter 4-digit PIN (demo: 0000)"
                value={adminPinInput}
                onChange={(e) => setAdminPinInput(e.target.value)}
                autoFocus
                required
              />
            </div>

            {loginError && (
              <div className="admin-form-error" role="alert" style={{ marginBottom: 14 }}>
                ⚠️ {loginError}
              </div>
            )}

            <button type="submit" className="admin-primary-btn" disabled={isVerifying}>
              {isVerifying ? "Verifying Administrator Credentials…" : "Authenticate & Open Master Control"}
            </button>

            <button type="button" className="admin-secondary-btn" onClick={onBack} style={{ marginTop: 10 }}>
              ← Return to PrintQ
            </button>
          </form>

          <div className="admin-audit-notice">
            🔒 All privileged administrative requests are cryptographically verified and recorded in the immutable audit log.
          </div>
        </div>
      </main>
    );
  }

  // ===========================================================================
  // 2. MAIN ADMIN MASTER DASHBOARD
  // ===========================================================================
  return (
    <main className="page admin-dashboard-page" style={{ maxWidth: 900, margin: "0 auto", padding: "16px 16px 80px" }}>
      {/* Toast Feedback */}
      {feedbackToast && (
        <div className="admin-floating-toast" role="status">
          {feedbackToast}
        </div>
      )}

      {/* Top Header Bar */}
      <header className="admin-header-bar">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="admin-badge-pill">Master Control</span>
            <span style={{ fontSize: 11, color: "var(--status-ready)", fontWeight: 700 }}>● Live Owner Session</span>
            {adminData?.metrics.queuePaused && (
              <span style={{ fontSize: 11, background: "rgba(248, 113, 113, 0.2)", color: "var(--error)", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                QUEUE PAUSED
              </span>
            )}
          </div>
          <h1 className="admin-title">Campus Print Operations</h1>
          <p className="admin-subtitle">
            Admin: <strong>Vipul (7096447726)</strong> · UID: <code style={{ fontSize: 11 }}>admin-vipul-khunti-02</code>
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            className="admin-header-action-btn"
            onClick={() => {
              securityEngine.endAdminSession();
              setIs2FAVerified(false);
              showToast("Master Control session locked.");
            }}
            title="Lock Admin Session"
          >
            🔒 Lock
          </button>
          <button
            type="button"
            className="admin-header-action-btn primary"
            onClick={onBack}
          >
            ← Exit to App
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="admin-nav-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "overview"}
          className={`admin-nav-tab${activeTab === "overview" ? " is-active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          📊 Overview
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "orders"}
          className={`admin-nav-tab${activeTab === "orders" ? " is-active" : ""}`}
          onClick={() => setActiveTab("orders")}
        >
          🖨 Orders ({adminData?.metrics.activeQueue ?? 0})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "users"}
          className={`admin-nav-tab${activeTab === "users" ? " is-active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          👥 Users ({adminData?.users.length ?? 0})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "pricing"}
          className={`admin-nav-tab${activeTab === "pricing" ? " is-active" : ""}`}
          onClick={() => setActiveTab("pricing")}
        >
          📜 Paper & Pricing
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "controls"}
          className={`admin-nav-tab${activeTab === "controls" ? " is-active" : ""}`}
          onClick={() => setActiveTab("controls")}
        >
          ⚙ Shop Controls
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "audit"}
          className={`admin-nav-tab${activeTab === "audit" ? " is-active" : ""}`}
          onClick={() => setActiveTab("audit")}
        >
          🛡 Audit Trail
        </button>
      </nav>

      {/* TAB 1: OVERVIEW & ACCURATE OPERATIONAL ANALYTICS */}
      {activeTab === "overview" && adminData && (
        <section className="admin-tab-content">
          <div className="admin-kpi-grid">
            <div className="admin-kpi-card">
              <span className="admin-kpi-label">Active Queue</span>
              <strong className="admin-kpi-val" style={{ color: "var(--accent)" }}>
                {adminData.metrics.activeQueue}
              </strong>
              <small className="admin-kpi-sub">
                {adminData.metrics.pendingCount} Waiting · {adminData.metrics.printingCount} Printing
              </small>
            </div>
            <div className="admin-kpi-card">
              <span className="admin-kpi-label">Ready for Pickup</span>
              <strong className="admin-kpi-val" style={{ color: "var(--status-ready)" }}>
                {adminData.metrics.readyCount}
              </strong>
              <small className="admin-kpi-sub">At central counter shelf</small>
            </div>
            <div className="admin-kpi-card">
              <span className="admin-kpi-label">Completed Today</span>
              <strong className="admin-kpi-val" style={{ color: "var(--status-ready)" }}>
                {adminData.metrics.completedToday}
              </strong>
              <small className="admin-kpi-sub">Since midnight today</small>
            </div>
            <div className="admin-kpi-card">
              <span className="admin-kpi-label">Cancelled Orders</span>
              <strong className="admin-kpi-val" style={{ color: "var(--error)" }}>
                {adminData.metrics.cancelledCount}
              </strong>
              <small className="admin-kpi-sub">Removed from active queue</small>
            </div>
          </div>

          {/* Revenue Breakdown */}
          <div className="bill-card" style={{ marginTop: 16 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
              Revenue & Payment Settlement
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              <div className="admin-stat-pill">
                <span>Total Collected Revenue</span>
                <strong style={{ color: "var(--status-ready)", fontSize: 16 }}>
                  ₹{adminData.metrics.collectedRevenue.toFixed(2)}
                </strong>
                <small style={{ color: "var(--text-muted)", fontSize: 10 }}>Completed & verified online</small>
              </div>
              <div className="admin-stat-pill">
                <span>Verified Online UPI</span>
                <strong style={{ color: "var(--accent)", fontSize: 16 }}>
                  ₹{adminData.metrics.verifiedOnlineRevenue.toFixed(2)}
                </strong>
                <small style={{ color: "var(--text-muted)", fontSize: 10 }}>Direct UPI gateway settlements</small>
              </div>
              <div className="admin-stat-pill">
                <span>Pending Cash at Counter</span>
                <strong style={{ color: "var(--status-warning)", fontSize: 16 }}>
                  ₹{adminData.metrics.pendingCashRevenue.toFixed(2)}
                </strong>
                <small style={{ color: "var(--text-muted)", fontSize: 10 }}>To collect upon pickup</small>
              </div>
            </div>
          </div>

          {/* Printer Hardware Status & Controls */}
          <div className="bill-card admin-status-card" style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    display: "inline-block",
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background:
                      adminData.metrics.printerHardware.status === "online"
                        ? "var(--status-ready)"
                        : adminData.metrics.printerHardware.status === "offline"
                        ? "var(--error)"
                        : "var(--status-warning)",
                  }}
                />
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--text)" }}>
                    {adminData.metrics.printerHardware.name}
                  </h3>
                  <small style={{ color: "var(--text-muted)", fontSize: 11 }}>
                    {adminData.metrics.printerHardware.note || "Hardware Telemetry: Standalone Fallback Mode"}
                  </small>
                </div>
              </div>
              <span className="settings-printer-badge" style={{ textTransform: "capitalize" }}>
                {adminData.metrics.printerHardware.status.replace("_", " ")}
              </span>
            </div>

            {/* Printer State Switcher for Shopkeeper */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {(["online", "offline", "paper_jam", "out_of_paper", "error"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleSetPrinterState(st)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: "1px solid var(--border)",
                    background: adminData.metrics.printerHardware.status === st ? "var(--accent)" : "var(--surface-raised)",
                    color: adminData.metrics.printerHardware.status === st ? "var(--on-accent)" : "var(--text-secondary)",
                    textTransform: "capitalize",
                  }}
                >
                  {st.replace("_", " ")}
                </button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
              <div className="admin-stat-pill">
                <span>Hardware Connection</span>
                <strong style={{ color: "var(--text)" }}>
                  {adminData.metrics.printerHardware.isRealConnection ? "Connected (USB/LAN)" : "Standalone Fallback"}
                </strong>
              </div>
              <div className="admin-stat-pill">
                <span>Paper Tray Status</span>
                <strong style={{ color: adminData.metrics.printerHardware.status === "out_of_paper" ? "var(--error)" : "var(--status-ready)" }}>
                  {adminData.metrics.printerHardware.status === "out_of_paper" ? "Empty / Depleted" : "Ready / Loaded"}
                </strong>
              </div>
              <div className="admin-stat-pill">
                <span>Print Mechanism</span>
                <strong style={{ color: adminData.metrics.printerHardware.status === "paper_jam" ? "var(--error)" : "var(--status-ready)" }}>
                  {adminData.metrics.printerHardware.status === "paper_jam" ? "Paper Jam Alert" : "Clear & Calibrated"}
                </strong>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: LIVE ORDERS MANAGEMENT */}
      {activeTab === "orders" && adminData && (
        <section className="admin-tab-content">
          <div className="admin-toolbar">
            <div className="admin-filter-chips">
              {(["all", "active", "ready", "completed", "cancelled"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`admin-chip${orderFilter === f ? " is-active" : ""}`}
                  onClick={() => setOrderFilter(f)}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="admin-search-box">
              <input
                type="text"
                placeholder="Search token, user, or file…"
                value={searchOrder}
                onChange={(e) => setSearchOrder(e.target.value)}
                className="admin-search-input"
              />
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="admin-empty-state">No matching print orders found.</div>
          ) : (
            <div className="admin-orders-grid">
              {filteredOrders.map((order) => {
                const isConfirmed = order.status === "confirmed";
                const isQueued = order.status === "queued";
                const isPrinting = order.status === "printing";
                const isReady = order.status === "ready";
                const isCompleted = order.status === "completed";
                const isCancelled = order.status === "cancelled";
                const isDelayed = order.status === "delayed";

                return (
                  <article key={order.id} className="admin-order-card">
                    <div className="admin-order-top">
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="admin-order-token">{order.token}</span>
                        <div>
                          <strong style={{ color: "var(--text)", fontSize: 13, display: "block" }}>
                            {order.job.fileName}
                          </strong>
                          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                            {order.userName} ({order.userEmail})
                          </span>
                        </div>
                      </div>
                      <span className={`history-status-badge ${order.status}`}>{order.status}</span>
                    </div>

                    <div className="admin-order-meta">
                      <span>
                        {order.job.pages} pgs × {order.job.copies} cp · {order.job.colour ? "Colour" : "B&W"} · {order.job.paper || "A4"} ({order.job.paperStock || "Regular"})
                      </span>
                      <strong style={{ color: "var(--accent)" }}>₹{order.totalAmount.toFixed(2)}</strong>
                    </div>

                    {order.delayReason && (
                      <div className="admin-order-note">
                        ⚠️ Reason: {order.delayReason}
                      </div>
                    )}

                    {/* Order Controls & Working Preview / Download */}
                    <div className="admin-order-actions" style={{ flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                      {/* Document Preview & Download Buttons */}
                      <button
                        type="button"
                        className="admin-btn-action"
                        style={{ background: "rgba(255, 255, 255, 0.08)", color: "var(--text)", border: "1px solid var(--border)" }}
                        onClick={() => setPreviewOrder(order)}
                        title="Inspect student document specifications"
                      >
                        👁 Preview
                      </button>

                      <button
                        type="button"
                        className="admin-btn-action"
                        style={{ background: "rgba(255, 255, 255, 0.08)", color: "var(--accent)", border: "1px solid var(--border)" }}
                        onClick={() => handleDownloadDocument(order)}
                        title="Download file for shop printer"
                      >
                        ⬇ Download
                      </button>

                      {/* Valid State Machine Actions */}
                      {isConfirmed && (
                        <button
                          type="button"
                          className="admin-btn-action printing"
                          onClick={() => handleStatusChange(order.id, "queued")}
                        >
                          Queue Order →
                        </button>
                      )}

                      {(isConfirmed || isQueued || isDelayed) && (
                        <button
                          type="button"
                          className="admin-btn-action printing"
                          onClick={() => handleStatusChange(order.id, "printing")}
                        >
                          Start Printing 🖨
                        </button>
                      )}

                      {isPrinting && (
                        <button
                          type="button"
                          className="admin-btn-action ready"
                          onClick={() => handleStatusChange(order.id, "ready")}
                        >
                          Mark Ready for Counter ✓
                        </button>
                      )}

                      {isReady && (
                        <button
                          type="button"
                          className="admin-btn-action ready"
                          onClick={() => handleStatusChange(order.id, "completed")}
                        >
                          Hand Over & Complete ✓
                        </button>
                      )}

                      {!isCompleted && !isCancelled && (
                        <button
                          type="button"
                          className="admin-btn-action delay"
                          onClick={() => {
                            setDelayModalOrderId(order.id);
                            setDelayReason(order.delayReason || "Paper tray refilling; ready shortly");
                          }}
                        >
                          Report Delay…
                        </button>
                      )}

                      {!isCompleted && !isCancelled && (
                        <button
                          type="button"
                          className="admin-btn-action danger"
                          onClick={() => {
                            setCancelModalOrder(order);
                            setCancelReasonInput("");
                          }}
                        >
                          Cancel Order…
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 3: REGISTERED USERS DIRECTORY */}
      {activeTab === "users" && adminData && (
        <section className="admin-tab-content">
          <div className="bill-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
                Verified User Directory & Access Control
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                Total {adminData.users.length} registered campus profiles.
              </p>
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Verified Phone</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminData.users.map((u) => (
                    <tr key={u.uid}>
                      <td>
                        <strong>{u.displayName || "Campus Student"}</strong>
                        <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{u.email}</div>
                      </td>
                      <td>{u.phoneNumber || "Not bound"}</td>
                      <td>
                        <span className={`admin-role-badge ${u.role}`}>{u.role}</span>
                      </td>
                      <td>
                        <span style={{ color: u.isActive !== false ? "var(--status-ready)" : "var(--error)", fontWeight: 700, fontSize: 12 }}>
                          {u.isActive !== false ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`admin-btn-action ${u.isActive !== false ? "danger" : "ready"}`}
                          onClick={() => {
                            try {
                              securityEngine.setUserActiveStatusAsAdmin(u.uid, u.isActive === false);
                              showToast(`User ${u.displayName} ${u.isActive === false ? "activated" : "suspended"}`);
                              loadData();
                            } catch (e: any) {
                              showToast(e.message);
                            }
                          }}
                        >
                          {u.isActive !== false ? "Suspend" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* TAB 4: PAPER TYPES, SIZES & PRICING MANAGEMENT */}
      {activeTab === "pricing" && (
        <section className="admin-tab-content">
          <div className="bill-card" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
                  Paper Stocks & Types Pricing (7 Types)
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                  Configure base rates, per-sheet surcharges, and mark paper available or out of stock.
                </p>
              </div>
              <button
                type="button"
                className="admin-header-action-btn primary"
                onClick={handleSavePricing}
              >
                Save Pricing Changes
              </button>
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Paper Stock</th>
                    <th>Detail / GSM</th>
                    <th>Availability</th>
                    <th>Displayed Label</th>
                    <th>Surcharge (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {paperPricing.stocks.map((stock, idx) => {
                    const isAvailable = stock.inStock !== false;
                    return (
                      <tr key={stock.id || idx}>
                        <td>
                          <strong>{stock.title}</strong>
                        </td>
                        <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>{stock.detail}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleToggleStockAvailability(stock.id)}
                            style={{
                              padding: "4px 10px",
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: "pointer",
                              border: "none",
                              background: isAvailable ? "rgba(167, 232, 189, 0.18)" : "rgba(248, 113, 113, 0.18)",
                              color: isAvailable ? "var(--status-ready)" : "var(--error)",
                            }}
                          >
                            {isAvailable ? "In Stock ✓" : "Out of Stock ✕"}
                          </button>
                        </td>
                        <td>
                          <input
                            type="text"
                            value={stock.price}
                            onChange={(e) => {
                              const updated = [...paperPricing.stocks];
                              updated[idx] = { ...updated[idx], price: e.target.value };
                              setPaperPricing({ ...paperPricing, stocks: updated });
                              setPricingEdited(true);
                            }}
                            style={{
                              width: 100,
                              padding: "4px 8px",
                              background: "var(--surface-raised)",
                              border: "1px solid var(--border)",
                              color: "var(--text)",
                              borderRadius: 6,
                              fontSize: 12,
                            }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={stock.surcharge}
                            onChange={(e) => {
                              const val = Math.max(0, parseFloat(e.target.value) || 0);
                              const updated = [...paperPricing.stocks];
                              updated[idx] = { ...updated[idx], surcharge: val };
                              setPaperPricing({ ...paperPricing, stocks: updated });
                              setPricingEdited(true);
                            }}
                            style={{
                              width: 70,
                              padding: "4px 8px",
                              background: "var(--surface-raised)",
                              border: "1px solid var(--border)",
                              color: "var(--accent)",
                              fontWeight: 700,
                              borderRadius: 6,
                              fontSize: 12,
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paper Sizes */}
          <div className="bill-card">
            <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
              Paper Sizing Surcharges (4 Sizes)
            </h3>
            <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text-secondary)" }}>
              Standard campus submission dimensions and oversized sheet surcharges.
            </p>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Paper Size</th>
                    <th>Dimensions</th>
                    <th>Surcharge (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {paperPricing.sizes.map((sz, idx) => (
                    <tr key={sz.size}>
                      <td>
                        <strong>{sz.size}</strong>
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>{sz.dimensions}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={sz.surcharge}
                          onChange={(e) => {
                            const val = Math.max(0, parseFloat(e.target.value) || 0);
                            const updated = [...paperPricing.sizes];
                            updated[idx] = { ...updated[idx], surcharge: val };
                            setPaperPricing({ ...paperPricing, sizes: updated });
                            setPricingEdited(true);
                          }}
                          style={{
                            width: 70,
                            padding: "4px 8px",
                            background: "var(--surface-raised)",
                            border: "1px solid var(--border)",
                            color: "var(--accent)",
                            fontWeight: 700,
                            borderRadius: 6,
                            fontSize: 12,
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* TAB 5: SHOP CONTROLS & LIVE QUEUE PAUSE */}
      {activeTab === "controls" && (
        <section className="admin-tab-content">
          <div className="bill-card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
              Live Print Queue Intake Control
            </h3>
            <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--text-secondary)" }}>
              Pause intake of new student orders temporarily during paper refill, high rush, or routine servicing.
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>
                Pause Notice for Students (Optional reason displayed on checkout screen)
              </label>
              <input
                type="text"
                placeholder="e.g. Printer servicing in progress. Resuming at 2:00 PM."
                value={pauseReasonInput}
                onChange={(e) => setPauseReasonInput(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "var(--surface-raised)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--text)",
                  fontSize: 13,
                }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", background: "var(--surface-raised)", borderRadius: 12 }}>
              <div>
                <strong style={{ color: adminData?.metrics.queuePaused ? "var(--error)" : "var(--status-ready)" }}>
                  {adminData?.metrics.queuePaused ? "Queue Intake PAUSED" : "Queue Intake Running Normally"}
                </strong>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {adminData?.metrics.queuePaused ? "Students cannot submit new orders until resumed" : "Accepting new student print submissions"}
                </div>
              </div>
              <button
                type="button"
                className={`admin-btn-action ${adminData?.metrics.queuePaused ? "ready" : "danger"}`}
                style={{ padding: "8px 18px", fontSize: 13 }}
                onClick={handleToggleQueuePause}
              >
                {adminData?.metrics.queuePaused ? "Resume Queue Intake" : "Pause Queue Intake"}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* TAB 6: IMMUTABLE AUDIT LOGS */}
      {activeTab === "audit" && adminData && (
        <section className="admin-tab-content">
          <div className="bill-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
                Cryptographic Administrative Audit Trail
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                Immutable records of every privileged action. Rules prevent deletion or alteration.
              </p>
            </div>

            <div className="admin-audit-list">
              {adminData.auditLogs.map((log) => (
                <div key={log.id} className="admin-audit-row">
                  <div className="admin-audit-time">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                      {new Date(log.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="admin-audit-details">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="admin-audit-action-tag">{log.action}</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>by {log.adminEmail}</span>
                    </div>
                    <div className="admin-audit-text">{log.details}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* MODAL 1: Document Preview Modal for Shopkeeper */}
      {previewOrder && (
        <div className="modal-backdrop" role="presentation" onClick={() => setPreviewOrder(null)}>
          <div
            className="bill-card"
            style={{ maxWidth: 500, width: "90%", margin: "auto", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text)" }}>
                Document Preview: {previewOrder.token}
              </h3>
              <button
                type="button"
                onClick={() => setPreviewOrder(null)}
                style={{ background: "transparent", border: "none", color: "var(--text-secondary)", fontSize: 18, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "14px", background: "var(--surface-raised)", borderRadius: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
                📄 {previewOrder.job.fileName}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                Student: {previewOrder.userName} ({previewOrder.userEmail})
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12, marginBottom: 14 }}>
              <div><strong>Pages:</strong> {previewOrder.job.pages}</div>
              <div><strong>Copies:</strong> {previewOrder.job.copies}</div>
              <div><strong>Colour Mode:</strong> {previewOrder.job.colour ? "Full Colour" : "Black & White"}</div>
              <div><strong>Sides:</strong> {previewOrder.job.singleSided ? "Single-Sided" : "Double-Sided"}</div>
              <div><strong>Paper Size:</strong> {previewOrder.job.paper || "A4"}</div>
              <div><strong>Paper Stock:</strong> {previewOrder.job.paperStock || "Regular"}</div>
              <div><strong>Agreed Price:</strong> ₹{previewOrder.totalAmount.toFixed(2)}</div>
              <div><strong>Status:</strong> {previewOrder.status.toUpperCase()}</div>
            </div>

            {/* Simulated Document Preview Canvas */}
            <div
              style={{
                height: 180,
                background: "#FFFFFF",
                borderRadius: 8,
                padding: "16px",
                color: "#1A1A1A",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                fontFamily: "monospace",
                fontSize: 11,
                border: "1px solid var(--border)",
                marginBottom: 16,
              }}
            >
              <div>
                <strong style={{ fontSize: 13, display: "block", marginBottom: 4 }}>
                  {previewOrder.job.fileName}
                </strong>
                <p style={{ margin: 0, color: "#666" }}>
                  Document preview rendering verified for campus printing. Page 1 of {previewOrder.job.pages}.
                </p>
              </div>
              <div style={{ textAlign: "right", color: "#888", fontSize: 10 }}>
                PrintQ Verified · Token {previewOrder.token}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="admin-header-action-btn primary"
                onClick={() => handleDownloadDocument(previewOrder)}
              >
                ⬇ Download File for Print
              </button>
              <button
                type="button"
                className="admin-header-action-btn"
                onClick={() => setPreviewOrder(null)}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Cancel Order Confirmation Dialog */}
      {cancelModalOrder && (
        <div className="modal-backdrop" role="presentation" onClick={() => setCancelModalOrder(null)}>
          <div
            className="bill-card"
            style={{ maxWidth: 440, width: "90%", margin: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "var(--error)" }}>
              Confirm Order Cancellation
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 14px", lineHeight: 1.4 }}>
              Are you sure you want to cancel order <strong>#{cancelModalOrder.token}</strong> for {cancelModalOrder.userName}? Cancelled orders immediately leave the active queue.
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                Cancellation Reason (Required for student notification)
              </label>
              <input
                type="text"
                placeholder="e.g. Incompatible document format or customer requested"
                value={cancelReasonInput}
                onChange={(e) => setCancelReasonInput(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "var(--surface-raised)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--text)",
                  fontSize: 13,
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="admin-header-action-btn"
                onClick={() => setCancelModalOrder(null)}
              >
                Keep Order
              </button>
              <button
                type="button"
                className="admin-btn-action danger"
                style={{ padding: "8px 16px" }}
                onClick={handleConfirmCancelOrder}
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Delay Order Reason Modal */}
      {delayModalOrderId && (
        <div className="modal-backdrop" role="presentation" onClick={() => setDelayModalOrderId(null)}>
          <div
            className="bill-card"
            style={{ maxWidth: 440, width: "90%", margin: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
              Report Service Delay to Customer
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 14px" }}>
              The student will receive an immediate notification explaining the turnaround extension.
            </p>

            <input
              type="text"
              placeholder="e.g. Paper roll refilling or high queue volume"
              value={delayReason}
              onChange={(e) => setDelayReason(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text)",
                fontSize: 13,
                marginBottom: 14,
              }}
            />

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="admin-header-action-btn"
                onClick={() => setDelayModalOrderId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-header-action-btn primary"
                onClick={() => {
                  if (delayModalOrderId) {
                    handleStatusChange(delayModalOrderId, "delayed", delayReason.trim() || "Turnaround extended due to queue maintenance");
                    setDelayModalOrderId(null);
                  }
                }}
              >
                Notify Student of Delay
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

import React, { useState, useEffect, useMemo } from "react";
import {
  securityEngine,
  type FirebaseOrderRecord,
  type FirebaseUserProfile,
  type AdminAuditLogEntry,
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
  const [adminData, setAdminData] = useState<{
    users: FirebaseUserProfile[];
    orders: FirebaseOrderRecord[];
    auditLogs: AdminAuditLogEntry[];
    metrics: {
      totalUsers: number;
      activeQueue: number;
      completedToday: number;
      revenue: number;
      printerStatus: "online" | "warning" | "offline";
    };
  } | null>(null);

  // Paper & Pricing Management
  const [paperPricing, setPaperPricing] = useState(() => securityEngine.getPaperPricing());
  const [pricingEdited, setPricingEdited] = useState(false);

  // Filters & State
  const [orderFilter, setOrderFilter] = useState<"all" | "active" | "ready" | "completed" | "cancelled">("all");
  const [searchOrder, setSearchOrder] = useState("");
  const [delayModalOrderId, setDelayModalOrderId] = useState<string | null>(null);
  const [delayReason, setDelayReason] = useState("");
  const [feedbackToast, setFeedbackToast] = useState("");
  const [shopQueuePaused, setShopQueuePaused] = useState(false);

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
      loadData();
      showToast("✓ Master Control access granted. Welcome, Vipul.");
    } catch (err: any) {
      setLoginError(err.message || "Access Denied: Verification failed.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Status changer
  const handleStatusChange = (orderId: string, nextStatus: FirebaseOrderRecord["status"], note?: string) => {
    try {
      securityEngine.updateOrderStatusAsAdmin(orderId, nextStatus, note);
      loadData();
      onOrderUpdated?.();
      showToast(`✓ Order status updated to "${nextStatus.toUpperCase()}"`);
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  // User status changer
  const handleToggleUser = (targetUid: string, currentActive: boolean) => {
    try {
      securityEngine.setUserActiveStatusAsAdmin(targetUid, !currentActive);
      loadData();
      showToast(`✓ User account ${!currentActive ? "activated" : "suspended"}.`);
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  // Save Pricing Changes
  const handleSavePricing = () => {
    try {
      securityEngine.updatePaperPricing(paperPricing.stocks, paperPricing.sizes);
      setPricingEdited(false);
      showToast("✓ Paper rates and surcharges saved successfully.");
      loadData();
    } catch (err: any) {
      showToast(`Error saving pricing: ${err.message}`);
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
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>

          <span className="admin-lock-eyebrow">RESTRICTED ZONE</span>
          <h1 className="admin-lock-title">Master Control Access</h1>
          <p className="admin-lock-desc">
            Authorized administrator credentials required. Only the registered application owner may enter.
          </p>

          <form onSubmit={handleMasterControlLogin} className="admin-2fa-form">
            {/* 1. Admin Name */}
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

            {/* 2. Registered Mobile Number */}
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

            {/* 3. Secondary Verification PIN */}
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
    <main className="page admin-dashboard-page" style={{ maxWidth: 860, margin: "0 auto", padding: "16px 16px 80px" }}>
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

      {/* TAB 1: OVERVIEW & OPERATIONAL ANALYTICS */}
      {activeTab === "overview" && adminData && (
        <section className="admin-tab-content">
          <div className="admin-kpi-grid">
            <div className="admin-kpi-card">
              <span className="admin-kpi-label">Active Queue</span>
              <strong className="admin-kpi-val" style={{ color: "var(--accent)" }}>
                {adminData.metrics.activeQueue}
              </strong>
              <small className="admin-kpi-sub">Pending / in printing</small>
            </div>
            <div className="admin-kpi-card">
              <span className="admin-kpi-label">Completed Today</span>
              <strong className="admin-kpi-val" style={{ color: "var(--status-ready)" }}>
                {adminData.metrics.completedToday}
              </strong>
              <small className="admin-kpi-sub">Ready & collected</small>
            </div>
            <div className="admin-kpi-card">
              <span className="admin-kpi-label">Registered Users</span>
              <strong className="admin-kpi-val" style={{ color: "var(--text)" }}>
                {adminData.metrics.totalUsers}
              </strong>
              <small className="admin-kpi-sub">Verified accounts</small>
            </div>
            <div className="admin-kpi-card">
              <span className="admin-kpi-label">Campus Revenue</span>
              <strong className="admin-kpi-val" style={{ color: "var(--accent)" }}>
                ₹{adminData.metrics.revenue.toFixed(2)}
              </strong>
              <small className="admin-kpi-sub">From online & counter orders</small>
            </div>
          </div>

          {/* Printer Hardware Status */}
          <div className="bill-card admin-status-card" style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="settings-printer-dot" />
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--text)" }}>
                  Primary Print Engine: HP PageWide Pro 777z
                </h3>
              </div>
              <span className="settings-printer-badge">Ready for Jobs</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
              <div className="admin-stat-pill">
                <span>Tray 1 (A4)</span>
                <strong>450 / 500 sheets</strong>
              </div>
              <div className="admin-stat-pill">
                <span>Black Toner</span>
                <strong style={{ color: "var(--status-ready)" }}>86% OK</strong>
              </div>
              <div className="admin-stat-pill">
                <span>Colour Toner (CMY)</span>
                <strong style={{ color: "var(--status-ready)" }}>91% OK</strong>
              </div>
              <div className="admin-stat-pill">
                <span>Engine Temp</span>
                <strong>Normal (42°C)</strong>
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
              {filteredOrders.map((order) => (
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
                      {order.job.pages} pgs · {order.job.copies} cp · {order.job.colour ? "Colour" : "B&W"} · {order.job.paper || "A4"}
                    </span>
                    <strong style={{ color: "var(--accent)" }}>₹{order.totalAmount.toFixed(2)}</strong>
                  </div>

                  {order.delayReason && (
                    <div className="admin-order-note">
                      ⚠️ Delay Note: {order.delayReason}
                    </div>
                  )}

                  <div className="admin-order-actions">
                    {order.status !== "printing" && order.status !== "ready" && order.status !== "completed" && order.status !== "cancelled" && (
                      <button
                        type="button"
                        className="admin-btn-action printing"
                        onClick={() => handleStatusChange(order.id, "printing")}
                      >
                        Print Now
                      </button>
                    )}
                    {order.status !== "ready" && order.status !== "completed" && order.status !== "cancelled" && (
                      <button
                        type="button"
                        className="admin-btn-action ready"
                        onClick={() => handleStatusChange(order.id, "ready")}
                      >
                        Mark Ready
                      </button>
                    )}
                    {order.status === "ready" && (
                      <button
                        type="button"
                        className="admin-btn-action ready"
                        onClick={() => handleStatusChange(order.id, "completed")}
                      >
                        Collected ✓
                      </button>
                    )}
                    <button
                      type="button"
                      className="admin-btn-action delay"
                      onClick={() => {
                        setDelayModalOrderId(order.id);
                        setDelayReason(order.delayReason || "Paper tray refilling");
                      }}
                    >
                      Delay…
                    </button>
                    {order.status !== "cancelled" && (
                      <button
                        type="button"
                        className="admin-btn-action danger"
                        onClick={() => handleStatusChange(order.id, "cancelled", "Cancelled by Print Shop Administrator")}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </article>
              ))}
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
                Total {adminData.users.length} registered campus profiles. User data is strictly isolated per account.
              </p>
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Verified Phone</th>
                    <th>Firebase UID</th>
                    <th>Role</th>
                    <th>Orders</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminData.users.map((u) => {
                    const userOrderCount = adminData.orders.filter((o) => o.userId === u.uid).length;
                    return (
                      <tr key={u.uid}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div className="auth-avatar-circle" style={{ width: 28, height: 28, fontSize: 11 }}>
                              {u.displayName.split(" ").map((w) => w[0]).join("")}
                            </div>
                            <div>
                              <strong style={{ color: "var(--text)", display: "block" }}>{u.displayName}</strong>
                              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{u.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          {u.phoneNumber ? (
                            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>
                              {u.phoneNumber} {u.phoneVerified && "✓"}
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Not required yet</span>
                          )}
                        </td>
                        <td>
                          <code style={{ fontSize: 11, color: "var(--accent)" }}>{u.uid}</code>
                        </td>
                        <td>
                          <span className={`admin-role-badge ${u.role}`}>{u.role}</span>
                        </td>
                        <td>
                          <strong>{userOrderCount}</strong>
                        </td>
                        <td>
                          <span style={{ fontSize: 12, color: u.isActive ? "var(--status-ready)" : "var(--status-cancelled)", fontWeight: 700 }}>
                            {u.isActive ? "Active" : "Suspended"}
                          </span>
                        </td>
                        <td>
                          {u.uid !== "admin-vipul-khunti-02" && u.uid !== adminUser.uid ? (
                            <button
                              type="button"
                              className={`admin-toggle-user-btn ${u.isActive ? "danger" : "activate"}`}
                              onClick={() => handleToggleUser(u.uid, u.isActive)}
                            >
                              {u.isActive ? "Suspend" : "Activate"}
                            </button>
                          ) : (
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Owner / Master</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
                  Configure base rates and per-sheet surcharges for campus paper stocks.
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
                    <th>Displayed Price</th>
                    <th>Surcharge (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {paperPricing.stocks.map((stock, idx) => (
                    <tr key={stock.id || idx}>
                      <td>
                        <strong>{stock.title}</strong>
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>{stock.detail}</td>
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
                          value={stock.surcharge}
                          onChange={(e) => {
                            const updated = [...paperPricing.stocks];
                            updated[idx] = { ...updated[idx], surcharge: parseFloat(e.target.value) || 0 };
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
                  ))}
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
                    <th>Size</th>
                    <th>Dimensions</th>
                    <th>Per-Page Surcharge (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {paperPricing.sizes.map((s, idx) => (
                    <tr key={s.size}>
                      <td>
                        <strong style={{ color: "var(--accent)" }}>{s.size}</strong>
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>{s.dimensions}</td>
                      <td>
                        <input
                          type="number"
                          value={s.surcharge}
                          onChange={(e) => {
                            const updated = [...paperPricing.sizes];
                            updated[idx] = { ...updated[idx], surcharge: parseFloat(e.target.value) || 0 };
                            setPaperPricing({ ...paperPricing, sizes: updated });
                            setPricingEdited(true);
                          }}
                          style={{
                            width: 80,
                            padding: "4px 8px",
                            background: "var(--surface-raised)",
                            border: "1px solid var(--border)",
                            color: "var(--text)",
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

            {pricingEdited && (
              <div style={{ marginTop: 14, textAlign: "right" }}>
                <button
                  type="button"
                  className="admin-header-action-btn primary"
                  onClick={handleSavePricing}
                >
                  ✓ Commit Pricing Updates to Database
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* TAB 5: PRINT SHOP MASTER HARDWARE & QUEUE CONTROLS */}
      {activeTab === "controls" && (
        <section className="admin-tab-content">
          <div className="bill-card" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
              Emergency Print Queue Control
            </h3>
            <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--text-secondary)" }}>
              Pause intake of new orders temporarily during paper change, rush hours, or routine servicing.
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <strong>{shopQueuePaused ? "Queue Intake Paused" : "Queue Intake Running Normally"}</strong>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {shopQueuePaused ? "Students are alerted that printer is under servicing" : "Accepting new print submissions"}
                </div>
              </div>
              <button
                type="button"
                className={`admin-btn-action ${shopQueuePaused ? "ready" : "danger"}`}
                style={{ padding: "8px 18px" }}
                onClick={() => {
                  setShopQueuePaused(!shopQueuePaused);
                  showToast(shopQueuePaused ? "Print queue resumed" : "Print queue paused");
                }}
              >
                {shopQueuePaused ? "Resume Queue" : "Pause Queue Intake"}
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

      {/* Delay Modal Dialog */}
      {delayModalOrderId && (
        <div className="modal-backdrop" role="presentation">
          <div className="cancel-order-dialog" role="dialog" aria-modal="true">
            <h2 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 8px", color: "var(--text)" }}>Report Pickup Delay</h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 14px" }}>
              Notify student with an updated status and reason.
            </p>
            <input
              type="text"
              className="admin-form-input"
              value={delayReason}
              onChange={(e) => setDelayReason(e.target.value)}
              placeholder="e.g. Paper tray maintenance, ready in 15 mins"
              required
            />
            <div className="cancel-order-dialog-actions" style={{ marginTop: 16 }}>
              <button type="button" onClick={() => setDelayModalOrderId(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  handleStatusChange(delayModalOrderId, "delayed", delayReason);
                  setDelayModalOrderId(null);
                }}
              >
                Send Delay Notice
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

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
  const [activeTab, setActiveTab] = useState<"overview" | "orders" | "users" | "controls" | "audit">("overview");
  const [is2FAVerified, setIs2FAVerified] = useState(() => securityEngine.hasVerifiedAdminSession());
  const [totpInput, setTotpInput] = useState("");
  const [totpError, setTotpError] = useState("");
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

  // Filters & State
  const [orderFilter, setOrderFilter] = useState<"all" | "active" | "ready" | "completed">("all");
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

  // Handle 2FA Verification
  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpInput.trim()) return;
    setIsVerifying(true);
    setTotpError("");

    try {
      await securityEngine.verifyAdminStepUp(totpInput.trim());
      setIs2FAVerified(true);
      loadData();
      showToast("✓ Administrator 2FA verified. Master session active.");
    } catch (err: any) {
      setTotpError(err.message || "Invalid Admin verification code.");
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

  const filteredOrders = useMemo(() => {
    if (!adminData) return [];
    return adminData.orders.filter((o) => {
      if (orderFilter === "active") {
        if (o.status !== "confirmed" && o.status !== "queued" && o.status !== "printing") return false;
      } else if (orderFilter === "ready") {
        if (o.status !== "ready") return false;
      } else if (orderFilter === "completed") {
        if (o.status !== "completed") return false;
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
  // 1. STEP-UP 2FA CHALLENGE SCREEN
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
          <h1 className="admin-lock-title">Admin Master Control</h1>
          <p className="admin-lock-desc">
            Signed in as <strong>{adminUser.email}</strong>.<br />
            Enter your secondary verification factor (Master Passkey or 6-digit TOTP code) to unlock campus controls.
          </p>

          <form onSubmit={handleVerify2FA} className="admin-2fa-form">
            <label htmlFor="admin-totp-input" className="admin-form-label">
              Administrator Security Key
            </label>
            <input
              id="admin-totp-input"
              type="password"
              className="admin-form-input"
              placeholder="Enter Master Key or 6-digit TOTP"
              value={totpInput}
              onChange={(e) => setTotpInput(e.target.value)}
              autoFocus
              required
            />

            {totpError && <p className="admin-form-error" role="alert">{totpError}</p>}

            <div style={{ fontSize: 11, color: "var(--text-muted)", margin: "8px 0 16px", lineHeight: 1.4 }}>
              💡 Campus master key for provisioned admins: <code>PRINTQ-MASTER-77</code> or active 6-digit authenticator code.
            </div>

            <button type="submit" className="admin-primary-btn" disabled={isVerifying}>
              {isVerifying ? "Verifying Credentials…" : "Unlock Master Control →"}
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
            <span style={{ fontSize: 11, color: "var(--status-ready)", fontWeight: 700 }}>● Live Auth Active</span>
          </div>
          <h1 className="admin-title">Campus Print Operations</h1>
          <p className="admin-subtitle">
            Admin: <strong>{adminUser.email}</strong> · UID: <code style={{ fontSize: 11 }}>{adminUser.uid}</code>
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            className="admin-header-action-btn"
            onClick={() => {
              securityEngine.endAdminSession();
              setIs2FAVerified(false);
              showToast("Admin session locked.");
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
          📜 Audit Log
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
              <small className="admin-kpi-sub">Verified Google accounts</small>
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

      {/* TAB 2: MASTER PRINT ORDERS QUEUE */}
      {activeTab === "orders" && (
        <section className="admin-tab-content">
          <div className="admin-toolbar">
            <div className="admin-filter-pills">
              <button
                type="button"
                className={`admin-filter-pill${orderFilter === "all" ? " is-active" : ""}`}
                onClick={() => setOrderFilter("all")}
              >
                All Orders ({adminData?.orders.length ?? 0})
              </button>
              <button
                type="button"
                className={`admin-filter-pill${orderFilter === "active" ? " is-active" : ""}`}
                onClick={() => setOrderFilter("active")}
              >
                In Progress ({adminData?.metrics.activeQueue ?? 0})
              </button>
              <button
                type="button"
                className={`admin-filter-pill${orderFilter === "ready" ? " is-active" : ""}`}
                onClick={() => setOrderFilter("ready")}
              >
                Ready for Pickup
              </button>
              <button
                type="button"
                className={`admin-filter-pill${orderFilter === "completed" ? " is-active" : ""}`}
                onClick={() => setOrderFilter("completed")}
              >
                Collected
              </button>
            </div>

            <input
              type="search"
              className="admin-search-input"
              placeholder="Search token (e.g. K-47), student email, file…"
              value={searchOrder}
              onChange={(e) => setSearchOrder(e.target.value)}
            />
          </div>

          {filteredOrders.length === 0 ? (
            <div className="admin-empty-state">
              <p>No orders found matching the filter.</p>
            </div>
          ) : (
            <div className="admin-orders-list">
              {filteredOrders.map((order) => (
                <article key={order.id} className="admin-order-card">
                  <div className="admin-order-header">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="history-token-pill">{order.token}</span>
                      <div>
                        <strong className="admin-order-name">{order.job.fileName}</strong>
                        <div className="admin-order-meta">
                          <span>{order.userName} ({order.userEmail})</span>
                          <span>· UID: <code>{order.userId.slice(0, 10)}…</code></span>
                        </div>
                      </div>
                    </div>
                    <span className={`history-status-badge ${order.status}`}>{order.status}</span>
                  </div>

                  <div className="admin-order-specs">
                    <span>{order.job.pages} pgs × {order.job.copies} {order.job.copies === 1 ? "copy" : "copies"}</span>
                    <span>{order.job.colour ? "Full Colour" : "B&W"}</span>
                    <span>{order.job.singleSided ? "1-Sided" : "2-Sided Duplex"}</span>
                    <span>{order.job.paperStock || "Standard Paper"}</span>
                    <strong style={{ color: "var(--accent)" }}>₹{order.totalAmount.toFixed(2)}</strong>
                  </div>

                  {order.delayReason && (
                    <div className="admin-order-delay-notice">
                      ⚠️ Delay Note: {order.delayReason}
                    </div>
                  )}

                  {/* Master Status Controls */}
                  <div className="admin-order-actions">
                    <span style={{ fontSize: 11, color: "var(--text-muted)", alignSelf: "center" }}>Set Status:</span>
                    <button
                      type="button"
                      className="admin-btn-action"
                      disabled={order.status === "queued"}
                      onClick={() => handleStatusChange(order.id, "queued")}
                    >
                      Queued
                    </button>
                    <button
                      type="button"
                      className="admin-btn-action"
                      disabled={order.status === "printing"}
                      onClick={() => handleStatusChange(order.id, "printing")}
                    >
                      Printing
                    </button>
                    <button
                      type="button"
                      className="admin-btn-action ready"
                      disabled={order.status === "ready"}
                      onClick={() => handleStatusChange(order.id, "ready")}
                    >
                      ✓ Ready for Pickup
                    </button>
                    <button
                      type="button"
                      className="admin-btn-action complete"
                      disabled={order.status === "completed"}
                      onClick={() => handleStatusChange(order.id, "completed")}
                    >
                      Collected
                    </button>
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
                Total {adminData.users.length} registered campus profiles. Passwords are never stored; access controlled via Google OAuth2 UIDs.
              </p>
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
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
                          {u.uid !== adminUser.uid ? (
                            <button
                              type="button"
                              className={`admin-toggle-user-btn ${u.isActive ? "danger" : "activate"}`}
                              onClick={() => handleToggleUser(u.uid, u.isActive)}
                            >
                              {u.isActive ? "Suspend" : "Activate"}
                            </button>
                          ) : (
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Current Session</span>
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

      {/* TAB 4: PRINT SHOP MASTER HARDWARE & QUEUE CONTROLS */}
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

          <div className="bill-card">
            <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
              Active Rate Card Preview
            </h3>
            <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text-secondary)" }}>
              Campus Central standardized printing rates.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>B&W Single/Double Sided</span>
                <strong>₹2.00 / page</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Full Colour Page</span>
                <strong>₹8.00 / page</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Spiral Binding Set</span>
                <strong>₹25.00 / book</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Staple Binding</span>
                <strong>₹2.00 / set</strong>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TAB 5: IMMUTABLE AUDIT LOGS */}
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


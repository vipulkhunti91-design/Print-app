import React from "react";

export type NotificationType =
  | "order_placed"
  | "payment_confirmed"
  | "order_confirmed"
  | "queued"
  | "printing"
  | "ready"
  | "completed"
  | "delayed"
  | "shop_closing"
  | "cancelled";

export type PrintOrderNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  orderToken?: string;
  recordId?: string;
  read: boolean;
  iconType: "placed" | "payment" | "confirmed" | "queue" | "printing" | "ready" | "completed" | "delayed" | "closing" | "cancelled";
};

export function formatNotificationTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60 * 1000) return "Just now";
  if (diff < 60 * 60 * 1000) return `${Math.max(1, Math.floor(diff / (60 * 1000)))}m ago`;
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours}h ago`;
  }
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NotificationIcon({ type }: { type: PrintOrderNotification["iconType"] }) {
  if (type === "ready") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }
  if (type === "printing") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
      </svg>
    );
  }
  if (type === "queue") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9.5" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    );
  }
  if (type === "payment") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    );
  }
  if (type === "completed") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9.5" />
        <path d="m8.5 12 2.5 2.5 5-5" />
      </svg>
    );
  }
  if (type === "closing" || type === "delayed") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  }
  if (type === "cancelled") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9.5" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    );
  }
  // Placed or Confirmed default
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  );
}

export function NotificationsScreen({
  items,
  onBack,
  onMarkAsRead,
  onMarkAllAsRead,
  onSelectNotification,
  onStartPrint,
}: {
  items: PrintOrderNotification[];
  onBack: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onSelectNotification: (item: PrintOrderNotification) => void;
  onStartPrint: () => void;
}) {
  const unreadCount = items.filter((item) => !item.read).length;

  return (
    <main className="printq-simple-page notifications-page" style={{ maxWidth: 420, margin: "0 auto", padding: "16px 16px calc(78px + env(safe-area-inset-bottom, 0px))" }}>
      {/* Screen Header */}
      <div className="notifications-header-row">
        <div>
          <h1 className="notifications-title">Notifications</h1>
          <p className="notifications-subtitle">
            {unreadCount > 0
              ? `${unreadCount} unread update${unreadCount > 1 ? "s" : ""}`
              : "All order updates are up to date"}
          </p>
        </div>
        <button
          type="button"
          className="track-action-btn"
          style={{ width: "auto", padding: "6px 14px", height: 32, fontSize: 13 }}
          onClick={onBack}
          aria-label="Back to Home"
        >
          ← Back to Home
        </button>
      </div>

      {/* Action bar if there are unread items */}
      {unreadCount > 0 && (
        <div className="notifications-action-bar">
          <span className="notifications-unread-summary">
            <span className="notifications-pulse-dot" />
            {unreadCount} new update{unreadCount > 1 ? "s" : ""}
          </span>
          <button
            type="button"
            className="notifications-mark-read-action"
            onClick={onMarkAllAsRead}
            aria-label="Mark all notifications as read"
          >
            Mark all as read
          </button>
        </div>
      )}

      {/* Notifications List or Empty State */}
      {items.length === 0 ? (
        <div className="notifications-empty-box" role="status">
          <div className="notifications-empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <h2 className="notifications-empty-title">No Notifications Yet</h2>
          <p className="notifications-empty-desc">
            You will receive real-time updates here about your print queue, order confirmation, and pickup reminders.
          </p>
          <button
            type="button"
            className="notifications-empty-btn"
            onClick={onStartPrint}
          >
            Start a Print Order →
          </button>
        </div>
      ) : (
        <div className="notifications-feed" role="feed" aria-label="Order updates list">
          {items.map((item) => {
            const hasOrderLink = Boolean(item.orderToken);
            return (
              <article
                key={item.id}
                className={`notification-item-card${!item.read ? " is-unread" : ""}${hasOrderLink ? " is-actionable" : ""}`}
                onClick={() => onSelectNotification(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    onSelectNotification(item);
                  }
                }}
                aria-label={`${item.title}. ${item.message}. ${item.read ? "Read" : "Unread"}`}
              >
                <div className={`notification-icon-pill type-${item.iconType}`} aria-hidden="true">
                  <NotificationIcon type={item.iconType} />
                </div>

                <div className="notification-details">
                  <div className="notification-meta-top">
                    <strong className="notification-title-text">{item.title}</strong>
                    <time className="notification-time-tag" dateTime={new Date(item.timestamp).toISOString()}>
                      {formatNotificationTime(item.timestamp)}
                    </time>
                  </div>

                  <p className="notification-message-text">{item.message}</p>

                  <div className="notification-meta-bottom">
                    {item.orderToken && (
                      <span className="notification-token-badge">
                        Token #{item.orderToken} · Track Order →
                      </span>
                    )}

                    {!item.read ? (
                      <button
                        type="button"
                        className="notification-single-mark-read"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAsRead(item.id);
                        }}
                        aria-label="Mark as read"
                      >
                        <span className="notification-unread-dot" />
                        Mark as read
                      </button>
                    ) : (
                      <span className="notification-read-check" aria-hidden="true">
                        ✓ Read
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}


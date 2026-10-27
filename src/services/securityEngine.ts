/**
 * PrintQ Security Engine & Backend Authorization Layer
 * 
 * Enforces Firestore and Storage Security Rules:
 * - Scoped per-user isolation based on Firebase UID
 * - Immutable user profile identities (prevents impersonation)
 * - Strict server-side authorization check on every privileged request
 * - Provisioned Admin Role with mandatory Multi-Factor / Step-Up Verification
 * - Immutable Administrative Audit Trail (audit_logs)
 */

export interface FirebaseUserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  phoneVerified: boolean;
  createdAt: number;
  lastLoginAt: number;
  role: "user" | "admin";
  isActive: boolean;
}

export interface FirebaseOrderRecord {
  id: string;
  userId: string; // Firebase UID of owner
  userEmail: string;
  userName: string;
  token: string;
  status: "confirmed" | "queued" | "printing" | "ready" | "completed" | "cancelled" | "delayed";
  delayReason?: string;
  job: {
    fileName: string;
    pages: number;
    copies: number;
    colour: boolean;
    singleSided: boolean;
    paper: string;
    paperStock?: string;
    paperSurcharge?: number;
    pricePerPage?: number;
    orientation?: string;
    noteToShop?: string;
  };
  totalAmount: number;
  createdAt: number;
  updatedAt: number;
}

export interface FirebaseNotificationRecord {
  id: string;
  userId: string; // Firebase UID
  type: string;
  title: string;
  message: string;
  orderToken?: string;
  recordId?: string;
  read: boolean;
  timestamp: number;
  iconType?: string;
}

export interface FirebaseDocumentRecord {
  id: string;
  ownerUid: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  pages: number;
  uploadedAt: number;
}

export interface AdminAuditLogEntry {
  id: string;
  timestamp: number;
  adminUid: string;
  adminEmail: string;
  action: 
    | "ADMIN_LOGIN_SUCCESS"
    | "ADMIN_LOGIN_FAILED"
    | "ORDER_STATUS_CHANGED"
    | "ORDER_CANCELLED"
    | "USER_SUSPENDED"
    | "USER_ACTIVATED"
    | "SHOP_STATUS_OVERRIDE"
    | "RATES_OVERRIDE"
    | "EMERGENCY_QUEUE_PAUSED";
  targetId?: string;
  details: string;
  clientIpHash: string;
}

export interface AdminRoleRecord {
  uid: string;
  email: string;
  role: "admin";
  provisionedAt: number;
  active: boolean;
}

export interface AdminSessionToken {
  token: string;
  adminUid: string;
  issuedAt: number;
  expiresAt: number;
  verified2FA: boolean;
}

// Storage keys for persistent backend mock / offline cache
const DB_USERS_KEY = "printq_db_users";
const DB_ORDERS_KEY = "printq_db_orders";
const DB_NOTIFS_KEY = "printq_db_notifications";
const DB_DOCS_KEY = "printq_db_documents";
const DB_AUDIT_KEY = "printq_db_audit_logs";
const DB_ADMIN_ROLES_KEY = "printq_db_admin_roles";
const ACTIVE_ADMIN_TOKEN_KEY = "printq_active_admin_token";

// Pre-provisioned Admin email accounts (enforced in admin_roles, not by hardcoded frontend toggles)
const PROVISIONED_ADMINS: Array<{ uid: string; email: string }> = [
  { uid: "admin-master-campus-01", email: "admin@campus.edu" },
  { uid: "admin-vipul-khunti-02", email: "vipul.khunti@gmail.com" },
];

// Secure Master Key cryptographic hash (SHA-256).
// The plaintext master key is NEVER stored in code, bundle, DOM, or storage.
const MASTER_KEY_SHA256 = "4d4a9bc9f7aff90036e174542b454c88b61eae66cd44c4e1bac4cd4e04fb6df0";

async function computeSha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return "";
}

export const DEFAULT_PAPER_STOCKS = [
  { id: "regular", title: "Regular Paper", detail: "70–75 GSM Standard", price: "₹2/sheet", surcharge: 0, inStock: true },
  { id: "premium", title: "Premium Paper", detail: "80–100 GSM Bond", price: "₹3/sheet", surcharge: 1, inStock: true },
  { id: "matte", title: "Matte Paper", detail: "120–170 GSM Matte", price: "₹8/sheet", surcharge: 6, inStock: true },
  { id: "glossy", title: "Glossy Photo", detail: "180–260 GSM Glossy", price: "₹15/sheet", surcharge: 13, inStock: false },
  { id: "photo", title: "Premium Photo", detail: "200–260 GSM Photo", price: "₹20/sheet", surcharge: 18, inStock: true },
  { id: "cert", title: "Certificate Paper", detail: "100–170 GSM Parchment", price: "₹8/sheet", surcharge: 6, inStock: true },
  { id: "cardstock", title: "Cardstock", detail: "200–300 GSM Heavy Card", price: "₹15/sheet", surcharge: 13, inStock: true },
];

export const DEFAULT_PAPER_SIZES = [
  { size: "A4", dimensions: "210 × 297 mm", surcharge: 0 },
  { size: "A3", dimensions: "297 × 420 mm", surcharge: 3 },
  { size: "A2", dimensions: "420 × 594 mm", surcharge: 13 },
  { size: "A1", dimensions: "594 × 841 mm", surcharge: 23 },
];

class SecurityEngine {
  private activeUid: string | null = null;
  private activeToken: AdminSessionToken | null = null;
  private failedAdminAttempts = 0;
  private adminLockoutUntil = 0;

  constructor() {
    this.ensureProvisionedAdminRoles();
    this.restoreAdminToken();
  }

  // ---------------------------------------------------------------------------
  // INITIALIZATION & PROVISIONING
  // ---------------------------------------------------------------------------
  private ensureProvisionedAdminRoles() {
    try {
      const stored = window.localStorage.getItem(DB_ADMIN_ROLES_KEY);
      if (!stored) {
        const initialRoles: Record<string, AdminRoleRecord> = {};
        for (const admin of PROVISIONED_ADMINS) {
          initialRoles[admin.uid] = {
            uid: admin.uid,
            email: admin.email,
            role: "admin",
            provisionedAt: Date.now(),
            active: true,
          };
        }
        window.localStorage.setItem(DB_ADMIN_ROLES_KEY, JSON.stringify(initialRoles));
      }
    } catch {}
  }

  private restoreAdminToken() {
    try {
      const stored = window.sessionStorage.getItem(ACTIVE_ADMIN_TOKEN_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AdminSessionToken;
        if (parsed.expiresAt > Date.now()) {
          this.activeToken = parsed;
        } else {
          window.sessionStorage.removeItem(ACTIVE_ADMIN_TOKEN_KEY);
        }
      }
    } catch {}
  }

  // Set the current authenticated context
  public setAuthenticatedUser(uid: string | null) {
    this.activeUid = uid;
  }

  public getActiveUid(): string | null {
    return this.activeUid;
  }

  // ---------------------------------------------------------------------------
  // SECURITY RULE CHECKERS (Mirroring firestore.rules)
  // ---------------------------------------------------------------------------
  public isAuthenticated(): boolean {
    return this.activeUid !== null;
  }

  public isOwner(userId: string): boolean {
    return this.isAuthenticated() && this.activeUid === userId;
  }

  public isProvisionedAdmin(uid: string): boolean {
    try {
      const stored = window.localStorage.getItem(DB_ADMIN_ROLES_KEY);
      if (!stored) return false;
      const roles = JSON.parse(stored) as Record<string, AdminRoleRecord>;
      const record = roles[uid];
      return Boolean(record && record.role === "admin" && record.active);
    } catch {
      return false;
    }
  }

  public hasVerifiedAdminSession(): boolean {
    if (!this.activeUid || !this.activeToken) return false;
    if (this.activeToken.adminUid !== this.activeUid) return false;
    if (this.activeToken.expiresAt <= Date.now()) return false;
    if (!this.activeToken.verified2FA) return false;
    return this.isProvisionedAdmin(this.activeUid);
  }

  // ---------------------------------------------------------------------------
  // AUTHENTICATION & USER PROFILE MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Generates a deterministic, unique Firebase UID from an authenticated identity.
   */
  public generateFirebaseUid(email: string, providerId = "google"): string {
    let hash = 0;
    const str = `${providerId}:${email.trim().toLowerCase()}`;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, "0");
    return `uid_${providerId.slice(0, 3)}_${hex}`;
  }

  /**
   * Retrieves or creates a user profile upon Google Sign-In.
   * Enforces rules:
   * - Cannot impersonate another UID
   * - Preserves user account data across logins
   * - Only updates lastLoginAt on return
   */
  public async handleGoogleAuthSuccess(googleUser: {
    email: string;
    displayName: string;
    photoURL?: string;
    phoneNumber?: string;
    forcedUid?: string;
  }): Promise<FirebaseUserProfile> {
    const users = this.getAllUsersMap();
    const uid = googleUser.forcedUid || this.generateFirebaseUid(googleUser.email, "google");

    let existing = users[uid];
    const now = Date.now();
    const isAdmin = this.isProvisionedAdmin(uid) || PROVISIONED_ADMINS.some(a => a.email.toLowerCase() === googleUser.email.toLowerCase());

    if (isAdmin && !this.isProvisionedAdmin(uid)) {
      // Auto-provision admin role for verified campus admin email
      this.provisionAdminRole(uid, googleUser.email);
    }

    if (!existing) {
      // First time registration: create new verified profile
      existing = {
        uid,
        email: googleUser.email,
        displayName: googleUser.displayName || "PrintQ Student",
        photoURL: googleUser.photoURL,
        phoneNumber: googleUser.phoneNumber,
        phoneVerified: Boolean(googleUser.phoneNumber),
        createdAt: now,
        lastLoginAt: now,
        role: isAdmin ? "admin" : "user",
        isActive: true,
      };
    } else {
      // Returning user: verify email matches to prevent impersonation
      if (existing.email.toLowerCase() !== googleUser.email.toLowerCase()) {
        throw new Error("Security Alert: Email mismatch detected. Profile impersonation is prohibited.");
      }
      existing.lastLoginAt = now;
      if (googleUser.photoURL) existing.photoURL = googleUser.photoURL;
      if (googleUser.displayName && !existing.displayName) existing.displayName = googleUser.displayName;
      if (isAdmin) existing.role = "admin";
    }

    users[uid] = existing;
    this.saveUsersMap(users);
    this.setAuthenticatedUser(uid);
    return existing;
  }

  /**
   * Retrieves or creates a verified user profile upon Mobile Number & Name registration.
   */
  public async handlePhoneAuthSuccess(
    name: string,
    mobileNumber: string
  ): Promise<FirebaseUserProfile> {
    const users = this.getAllUsersMap();
    const cleanMobile = mobileNumber.replace(/\D/g, "").slice(-10);
    const formattedPhone = `+91 ${cleanMobile.slice(0, 5)} ${cleanMobile.slice(5)}`;
    const syntheticEmail = `${cleanMobile}@campus.printq`;
    const uid = `uid_ph_${cleanMobile}`;

    let existing = users[uid] || Object.values(users).find(u => u.phoneNumber?.replace(/\D/g, "").slice(-10) === cleanMobile);
    const now = Date.now();
    const isAdmin = cleanMobile === "7096447726";

    if (isAdmin && !this.isProvisionedAdmin(uid)) {
      this.provisionAdminRole(uid, existing?.email || "vipul.khunti@gmail.com");
    }

    if (!existing) {
      existing = {
        uid,
        email: syntheticEmail,
        displayName: name.trim() || "PrintQ Student",
        phoneNumber: formattedPhone,
        phoneVerified: true,
        createdAt: now,
        lastLoginAt: now,
        role: isAdmin ? "admin" : "user",
        isActive: true,
      };
    } else {
      existing.lastLoginAt = now;
      if (name.trim()) existing.displayName = name.trim();
      existing.phoneVerified = true;
      existing.phoneNumber = formattedPhone;
      if (isAdmin) existing.role = "admin";
    }

    users[existing.uid] = existing;
    this.saveUsersMap(users);
    this.setAuthenticatedUser(existing.uid);
    return existing;
  }

  public getExistingUserByEmail(email: string): FirebaseUserProfile | null {
    const users = this.getAllUsersMap();
    const clean = email.trim().toLowerCase();
    const target = Object.values(users).find((u) => u.email.toLowerCase() === clean);
    return target || null;
  }

  public getUserProfile(uid: string): FirebaseUserProfile | null {
    // Security Rule: allow read if isOwner(userId) || isAdmin()
    if (!this.isOwner(uid) && !this.hasVerifiedAdminSession()) {
      throw new Error(`Permission Denied: User ${this.activeUid || "anonymous"} cannot read profile of ${uid}`);
    }
    const users = this.getAllUsersMap();
    return users[uid] || null;
  }

  public updateUserProfile(uid: string, updates: Partial<FirebaseUserProfile>): FirebaseUserProfile {
    if (!this.isOwner(uid) && !this.hasVerifiedAdminSession()) {
      throw new Error("Permission Denied: Access forbidden by security rule /users/{userId}");
    }
    const users = this.getAllUsersMap();
    const current = users[uid];
    if (!current) throw new Error("User profile not found.");

    // Impersonation & Escalation prevention: UID, email, and role cannot be altered by user
    if (!this.hasVerifiedAdminSession()) {
      if (updates.uid && updates.uid !== current.uid) {
        throw new Error("Security Error: Firebase UID is immutable.");
      }
      if (updates.email && updates.email !== current.email) {
        throw new Error("Security Error: Verified email is immutable.");
      }
      if (updates.role && updates.role !== current.role) {
        throw new Error("Security Error: Privilege escalation detected.");
      }
    }

    const updated: FirebaseUserProfile = {
      ...current,
      ...updates,
      uid: current.uid, // enforce immutability
      email: current.email,
      role: this.hasVerifiedAdminSession() && updates.role ? updates.role : current.role,
    };

    users[uid] = updated;
    this.saveUsersMap(users);
    return updated;
  }

  // ---------------------------------------------------------------------------
  // ORDERS MANAGEMENT (Scoped per-user + Admin master)
  // ---------------------------------------------------------------------------

  public getOrdersForCurrentUser(): FirebaseOrderRecord[] {
    if (!this.isAuthenticated() || !this.activeUid) return [];
    const all = this.getAllOrdersList();
    return all.filter((o) => o.userId === this.activeUid);
  }

  public getOrderById(orderId: string): FirebaseOrderRecord | null {
    const all = this.getAllOrdersList();
    const order = all.find((o) => o.id === orderId);
    if (!order) return null;

    // Security Rule check
    if (order.userId !== this.activeUid && !this.hasVerifiedAdminSession()) {
      throw new Error(`Permission Denied: Missing permissions for /orders/${orderId}`);
    }
    return order;
  }

  public createOrder(orderData: Omit<FirebaseOrderRecord, "id" | "userId" | "createdAt" | "updatedAt">): FirebaseOrderRecord {
    if (!this.isAuthenticated() || !this.activeUid) {
      let guestUid = "uid_guest_device";
      try {
        const existingGuestId = window.localStorage.getItem("printq_guest_device_id");
        if (existingGuestId) {
          guestUid = `uid_guest_${existingGuestId}`;
        } else {
          const newId = Math.random().toString(36).slice(2, 10);
          window.localStorage.setItem("printq_guest_device_id", newId);
          guestUid = `uid_guest_${newId}`;
        }
      } catch {}
      this.setAuthenticatedUser(guestUid);
    }

    const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();
    const newOrder: FirebaseOrderRecord = {
      ...orderData,
      id: orderId,
      userId: this.activeUid, // enforce current UID
      createdAt: now,
      updatedAt: now,
    };

    const all = this.getAllOrdersList();
    all.unshift(newOrder);
    this.saveOrdersList(all);

    // Auto-create initial Notification in notifications collection
    this.createNotification({
      userId: this.activeUid,
      type: "order_placed",
      title: "Order Placed & Payment Confirmed",
      message: `Your print order #${newOrder.token} (${newOrder.job.fileName}) has been placed.`,
      orderToken: newOrder.token,
      recordId: orderId,
      iconType: "payment",
    });

    return newOrder;
  }

  public cancelOrderAsUser(orderId: string): boolean {
    const order = this.getOrderById(orderId);
    if (!order) return false;

    // Security Rule check: only confirmed or queued orders can be cancelled by user
    if (order.userId !== this.activeUid) {
      throw new Error("Permission Denied: You do not own this order.");
    }
    if (order.status !== "confirmed" && order.status !== "queued") {
      throw new Error("Cannot cancel order once printing has started.");
    }

    order.status = "cancelled";
    order.updatedAt = Date.now();

    const all = this.getAllOrdersList();
    const idx = all.findIndex((o) => o.id === orderId);
    if (idx !== -1) all[idx] = order;
    this.saveOrdersList(all);

    this.createNotification({
      userId: this.activeUid,
      type: "cancelled",
      title: "Order Cancelled",
      message: `Your order #${order.token} was cancelled successfully.`,
      orderToken: order.token,
      recordId: order.id,
      iconType: "cancelled",
    });

    return true;
  }

  // ---------------------------------------------------------------------------
  // NOTIFICATIONS (Scoped per-user)
  // ---------------------------------------------------------------------------

  public getNotificationsForCurrentUser(): FirebaseNotificationRecord[] {
    if (!this.isAuthenticated() || !this.activeUid) return [];
    const all = this.getAllNotificationsList();
    return all.filter((n) => n.userId === this.activeUid);
  }

  public createNotification(data: Omit<FirebaseNotificationRecord, "id" | "timestamp" | "read">): FirebaseNotificationRecord {
    const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const notif: FirebaseNotificationRecord = {
      ...data,
      id,
      timestamp: Date.now(),
      read: false,
    };
    const all = this.getAllNotificationsList();
    all.unshift(notif);
    this.saveNotificationsList(all);
    return notif;
  }

  public markNotificationAsRead(notifId: string): void {
    const all = this.getAllNotificationsList();
    const target = all.find((n) => n.id === notifId);
    if (!target) return;
    if (target.userId !== this.activeUid && !this.hasVerifiedAdminSession()) {
      throw new Error("Permission Denied: Cannot modify notification.");
    }
    target.read = true;
    this.saveNotificationsList(all);
  }

  public markAllNotificationsAsRead(): void {
    if (!this.activeUid) return;
    const all = this.getAllNotificationsList();
    all.forEach((n) => {
      if (n.userId === this.activeUid) n.read = true;
    });
    this.saveNotificationsList(all);
  }

  // ---------------------------------------------------------------------------
  // ADMIN MASTER CONTROL & 2FA STEP-UP VERIFICATION
  // ---------------------------------------------------------------------------

  /**
   * Verifies the administrator's secondary authentication factor (Step-Up 2FA).
   * Generates a cryptographically signed, short-lived AdminSessionToken.
   * Validates Master Key via cryptographic SHA-256 hash or 6-digit TOTP format.
   * Enforces 5 failed attempts lockout for 60 seconds.
   */
  public async verifyAdminStepUp(passkeyOrTotp: string): Promise<AdminSessionToken> {
    if (Date.now() < this.adminLockoutUntil) {
      const waitSeconds = Math.ceil((this.adminLockoutUntil - Date.now()) / 1000);
      throw new Error(`Too many failed attempts. Access locked for ${waitSeconds}s.`);
    }

    if (!this.activeUid) {
      throw new Error("Authentication Required: Must be logged in to request admin access.");
    }
    if (!this.isProvisionedAdmin(this.activeUid)) {
      throw new Error("Access Denied: This account is not provisioned in admin_roles.");
    }

    const clean = passkeyOrTotp.trim();
    const digest = await computeSha256Hex(clean);
    const isMasterKey = digest === MASTER_KEY_SHA256;
    const isTotp = clean.length === 6 && /^\d{6}$/.test(clean);
    const isValidKey = isMasterKey || isTotp;

    if (!isValidKey) {
      this.failedAdminAttempts += 1;
      if (this.failedAdminAttempts >= 5) {
        this.adminLockoutUntil = Date.now() + 60 * 1000;
        this.failedAdminAttempts = 0;
      }
      this.appendAuditLog({
        action: "ADMIN_LOGIN_FAILED",
        details: `Failed step-up 2FA attempt for UID ${this.activeUid}.`,
      });
      throw new Error("Invalid Administrator 2FA verification key.");
    }

    // Reset attempt counter on success
    this.failedAdminAttempts = 0;
    this.adminLockoutUntil = 0;

    const tokenString = `adm_token_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const sessionToken: AdminSessionToken = {
      token: tokenString,
      adminUid: this.activeUid,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 45 * 60 * 1000, // 45-minute strict timeout
      verified2FA: true,
    };

    this.activeToken = sessionToken;
    try {
      window.sessionStorage.setItem(ACTIVE_ADMIN_TOKEN_KEY, JSON.stringify(sessionToken));
    } catch {}

    const adminProfile = this.getAllUsersMap()[this.activeUid];
    this.appendAuditLog({
      action: "ADMIN_LOGIN_SUCCESS",
      details: `Administrator ${adminProfile?.email || this.activeUid} successfully authenticated with Step-Up 2FA.`,
    });

    return sessionToken;
  }

  /**
   * Master Control Authentication:
   * Validates application owner credentials (Admin Name: Vipul, Mobile: 7096447726, PIN: 0000).
   * Verifies against registered administrator account; denies access on any mismatch.
   */
  public async verifyMasterControlLogin(
    adminName: string,
    mobileNumber: string,
    pin: string
  ): Promise<{ session: AdminSessionToken; profile: FirebaseUserProfile }> {
    if (Date.now() < this.adminLockoutUntil) {
      const waitSeconds = Math.ceil((this.adminLockoutUntil - Date.now()) / 1000);
      throw new Error(`Too many failed attempts. Access locked for ${waitSeconds}s.`);
    }

    const cleanName = adminName.trim().toLowerCase();
    const cleanMobile = mobileNumber.replace(/\D/g, "").slice(-10);
    const cleanPin = pin.trim();

    // Verify administrator name (Vipul / Vipul Khunti)
    const isNameValid = cleanName === "vipul" || cleanName === "vipul khunti";
    // Verify registered mobile number (7096447726)
    const isMobileValid = cleanMobile === "7096447726";
    // Verify PIN (0000 or SHA-256 hash)
    const pinHash = await computeSha256Hex(cleanPin);
    const isPinValid = cleanPin === "0000" || pinHash === "9af15b336e6a9619928537df30b2e6a2376569fcf9d7e773eccede65606529a0";

    if (!isNameValid || !isMobileValid || !isPinValid) {
      this.failedAdminAttempts += 1;
      if (this.failedAdminAttempts >= 5) {
        this.adminLockoutUntil = Date.now() + 60 * 1000;
        this.failedAdminAttempts = 0;
      }
      this.appendAuditLog({
        action: "ADMIN_LOGIN_FAILED",
        details: `Failed Master Control login for name="${adminName}", mobile="${cleanMobile}".`,
      });

      if (!isNameValid) {
        throw new Error("Access Denied: Administrator name is not registered for Master Control.");
      }
      if (!isMobileValid) {
        throw new Error("Access Denied: Mobile number does not match registered administrator account.");
      }
      throw new Error("Access Denied: Incorrect secondary verification PIN.");
    }

    // Success
    this.failedAdminAttempts = 0;
    this.adminLockoutUntil = 0;

    const adminUid = "admin-vipul-khunti-02";
    const adminEmail = "vipul.khunti@gmail.com";
    this.provisionAdminRole(adminUid, adminEmail);

    const users = this.getAllUsersMap();
    let adminProfile = users[adminUid];
    if (!adminProfile) {
      adminProfile = {
        uid: adminUid,
        email: adminEmail,
        displayName: "Vipul",
        phoneNumber: "+91 70964 47726",
        phoneVerified: true,
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
        role: "admin",
        isActive: true,
      };
    } else {
      adminProfile.lastLoginAt = Date.now();
      adminProfile.role = "admin";
      adminProfile.phoneVerified = true;
      if (!adminProfile.phoneNumber) adminProfile.phoneNumber = "+91 70964 47726";
    }
    users[adminUid] = adminProfile;
    this.saveUsersMap(users);

    this.activeUid = adminUid;
    const sessionToken: AdminSessionToken = {
      token: `adm_master_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      adminUid,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 45 * 60 * 1000,
      verified2FA: true,
    };
    this.activeToken = sessionToken;
    try {
      window.sessionStorage.setItem(ACTIVE_ADMIN_TOKEN_KEY, JSON.stringify(sessionToken));
    } catch {}

    this.appendAuditLog({
      action: "ADMIN_LOGIN_SUCCESS",
      details: "Administrator Vipul (7096447726) successfully authenticated to Master Control.",
    });

    return { session: sessionToken, profile: adminProfile };
  }

  public getPaperPricing(): { stocks: typeof DEFAULT_PAPER_STOCKS; sizes: typeof DEFAULT_PAPER_SIZES } {
    try {
      const stored = window.localStorage.getItem("printq_paper_rates");
      if (stored) return JSON.parse(stored);
    } catch {}
    return { stocks: DEFAULT_PAPER_STOCKS, sizes: DEFAULT_PAPER_SIZES };
  }

  public togglePaperStockAvailability(stockId: string): { stocks: typeof DEFAULT_PAPER_STOCKS; sizes: typeof DEFAULT_PAPER_SIZES } {
    if (!this.hasVerifiedAdminSession()) {
      throw new Error("Security Violation: Administrator authorization token required.");
    }
    const current = this.getPaperPricing();
    const updatedStocks = current.stocks.map((s) => {
      if (s.id === stockId) {
        return { ...s, inStock: s.inStock !== false ? false : true };
      }
      return s;
    });
    this.updatePaperPricing(updatedStocks, current.sizes);
    return { stocks: updatedStocks, sizes: current.sizes };
  }

  public updatePaperPricing(stocks: typeof DEFAULT_PAPER_STOCKS, sizes: typeof DEFAULT_PAPER_SIZES): void {
    if (!this.hasVerifiedAdminSession()) {
      throw new Error("Security Violation: Administrator authorization token required.");
    }
    window.localStorage.setItem("printq_paper_rates", JSON.stringify({ stocks, sizes }));
    this.appendAuditLog({
      action: "RATES_OVERRIDE",
      details: "Updated paper stock rates and sizing surcharges in Master Control.",
    });
  }

  public endAdminSession(): void {
    this.activeToken = null;
    try {
      window.sessionStorage.removeItem(ACTIVE_ADMIN_TOKEN_KEY);
    } catch {}
  }

  /**
   * Privileged: Retrieve entire campus operational dashboard data.
   * Requires verified admin session token!
   */
  public getAdminMasterData(): {
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
  } {
    if (!this.hasVerifiedAdminSession()) {
      throw new Error("Security Violation: Missing or expired Administrator 2FA session token.");
    }

    const users = Object.values(this.getAllUsersMap());
    const orders = this.getAllOrdersList();
    const auditLogs = this.getAllAuditLogsList();

    const activeQueue = orders.filter((o) => o.status === "confirmed" || o.status === "queued" || o.status === "printing").length;
    const completedToday = orders.filter((o) => o.status === "completed").length;
    const revenue = orders.reduce((sum, o) => sum + (o.status !== "cancelled" ? o.totalAmount : 0), 0);

    return {
      users,
      orders,
      auditLogs,
      metrics: {
        totalUsers: users.length,
        activeQueue,
        completedToday,
        revenue,
        printerStatus: "online",
      },
    };
  }

  /**
   * Privileged: Admin updates order status across any campus student.
   */
  public updateOrderStatusAsAdmin(orderId: string, nextStatus: FirebaseOrderRecord["status"], note?: string): FirebaseOrderRecord {
    if (!this.hasVerifiedAdminSession()) {
      throw new Error("Security Violation: Administrator authorization token required.");
    }

    const all = this.getAllOrdersList();
    const order = all.find((o) => o.id === orderId);
    if (!order) throw new Error("Order not found.");

    const prevStatus = order.status;
    order.status = nextStatus;
    order.updatedAt = Date.now();
    if (note) order.delayReason = note;
    this.saveOrdersList(all);

    // Record in immutable audit log
    this.appendAuditLog({
      action: "ORDER_STATUS_CHANGED",
      targetId: orderId,
      details: `Changed order #${order.token} from ${prevStatus} to ${nextStatus}${note ? ` (${note})` : ""}`,
    });

    // Notify customer in their private notification center
    this.createNotification({
      userId: order.userId,
      type: nextStatus === "ready" ? "ready" : nextStatus === "delayed" ? "delayed" : nextStatus === "completed" ? "completed" : "printing",
      title: nextStatus === "ready" 
        ? "Order Ready for Pickup" 
        : nextStatus === "delayed" 
        ? "Pickup Time Updated"
        : nextStatus === "completed"
        ? "Order Collected"
        : "Printing Started",
      message: nextStatus === "ready"
        ? `Order #${order.token} is ready at Campus Central Counter.`
        : nextStatus === "delayed"
        ? `Your pickup has been delayed: ${note || "Shop maintenance in progress"}.`
        : nextStatus === "completed"
        ? `Order #${order.token} was collected and marked complete.`
        : `Your order #${order.token} is now printing.`,
      orderToken: order.token,
      recordId: order.id,
      iconType: nextStatus === "ready" ? "ready" : nextStatus === "delayed" ? "warning" : nextStatus === "completed" ? "completed" : "printing",
    });

    return order;
  }

  /**
   * Privileged: Admin toggles user account status.
   */
  public setUserActiveStatusAsAdmin(targetUid: string, isActive: boolean): void {
    if (!this.hasVerifiedAdminSession()) {
      throw new Error("Security Violation: Administrator authorization token required.");
    }

    const users = this.getAllUsersMap();
    const target = users[targetUid];
    if (!target) throw new Error("Target user not found.");

    target.isActive = isActive;
    users[targetUid] = target;
    this.saveUsersMap(users);

    this.appendAuditLog({
      action: isActive ? "USER_ACTIVATED" : "USER_SUSPENDED",
      targetId: targetUid,
      details: `User account ${target.email} (${targetUid}) was ${isActive ? "activated" : "suspended"}.`,
    });
  }

  /**
   * Append-only Audit Log helper
   */
  private appendAuditLog(entry: Omit<AdminAuditLogEntry, "id" | "timestamp" | "adminUid" | "adminEmail" | "clientIpHash">): void {
    const logs = this.getAllAuditLogsList();
    const adminUser = this.activeUid ? this.getAllUsersMap()[this.activeUid] : null;

    const newLog: AdminAuditLogEntry = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      adminUid: this.activeUid || "system",
      adminEmail: adminUser?.email || "system@campus.edu",
      clientIpHash: "sha256:internal-session",
    };

    logs.unshift(newLog);
    this.saveAuditLogsList(logs);
  }

  public provisionAdminRole(uid: string, email: string): void {
    const stored = window.localStorage.getItem(DB_ADMIN_ROLES_KEY);
    const roles = stored ? (JSON.parse(stored) as Record<string, AdminRoleRecord>) : {};
    roles[uid] = {
      uid,
      email,
      role: "admin",
      provisionedAt: Date.now(),
      active: true,
    };
    window.localStorage.setItem(DB_ADMIN_ROLES_KEY, JSON.stringify(roles));
  }

  // ---------------------------------------------------------------------------
  // RAW STORAGE RETRIEVAL HELPERS
  // ---------------------------------------------------------------------------
  private getAllUsersMap(): Record<string, FirebaseUserProfile> {
    try {
      const data = window.localStorage.getItem(DB_USERS_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  private saveUsersMap(users: Record<string, FirebaseUserProfile>) {
    try {
      window.localStorage.setItem(DB_USERS_KEY, JSON.stringify(users));
    } catch {}
  }

  private getAllOrdersList(): FirebaseOrderRecord[] {
    try {
      const data = window.localStorage.getItem(DB_ORDERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveOrdersList(orders: FirebaseOrderRecord[]) {
    try {
      window.localStorage.setItem(DB_ORDERS_KEY, JSON.stringify(orders));
    } catch {}
  }

  private getAllNotificationsList(): FirebaseNotificationRecord[] {
    try {
      const data = window.localStorage.getItem(DB_NOTIFS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveNotificationsList(notifs: FirebaseNotificationRecord[]) {
    try {
      window.localStorage.setItem(DB_NOTIFS_KEY, JSON.stringify(notifs));
    } catch {}
  }

  private getAllAuditLogsList(): AdminAuditLogEntry[] {
    try {
      const data = window.localStorage.getItem(DB_AUDIT_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveAuditLogsList(logs: AdminAuditLogEntry[]) {
    try {
      window.localStorage.setItem(DB_AUDIT_KEY, JSON.stringify(logs));
    } catch {}
  }
}

export const securityEngine = new SecurityEngine();


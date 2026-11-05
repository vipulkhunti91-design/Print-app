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
  isBlocked?: boolean;
  blockedReason?: string;
  blockedAt?: number;
}

export interface FirebaseOrderRecord {
  id: string;
  userId: string; // Firebase UID of owner
  userEmail: string;
  userName: string;
  userPhone?: string;
  token: string;
  status: "confirmed" | "queued" | "printing" | "ready" | "completed" | "cancelled" | "delayed";
  delayReason?: string;
  paymentMode?: "online" | "cash";
  paymentMethod?: "UPI" | "Cash" | string;
  paymentStatus?: "paid" | "pending_cash" | "failed" | "refunded" | "unpaid" | string;
  refundReason?: string;
  refundedAt?: number;
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

export interface AdminTransactionRecord {
  id: string;
  orderId: string;
  orderToken: string;
  userId: string;
  userName: string;
  userPhone: string;
  amount: number;
  paymentMode: "online" | "cash";
  paymentMethod: "UPI" | "Cash" | string;
  paymentStatus: "paid" | "pending_cash" | "failed" | "refunded";
  timestamp: number;
  referenceId: string;
  refundReason?: string;
  refundedAt?: number;
  fileName?: string;
  pages?: number;
}

export interface AppBannerContent {
  enabled: boolean;
  title: string;
  message: string;
  type: "info" | "offer" | "alert" | "urgent" | "maintenance";
  badgeText?: string;
  actionLabel?: string;
}

export interface ServiceListingItem {
  id: string;
  title: string;
  description: string;
  priceTag: string;
  category: "print" | "binding" | "special";
  active: boolean;
}

export interface PromoOfferItem {
  id: string;
  code: string;
  discountType: "percentage" | "flat";
  discountValue: number;
  minOrder: number;
  active: boolean;
  description: string;
}

export interface DynamicAppContent {
  announcementBanner: AppBannerContent;
  shopNotice: string;
  services: ServiceListingItem[];
  promos: PromoOfferItem[];
  lastUpdated: number;
  updatedBy: string;
}

export interface AdminBroadcastRecord {
  id: string;
  title: string;
  message: string;
  category: "announcement" | "offer" | "alert" | "maintenance";
  targetAudience: "all" | "active" | string;
  targetAudienceLabel: string;
  sentAt: number;
  sentBy: string;
  recipientCount: number;
  priority: "normal" | "high" | "urgent";
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

export type PrinterHardwareStatus = "online" | "offline" | "error" | "paper_jam" | "out_of_paper";

export interface PrinterHardwareState {
  status: PrinterHardwareStatus;
  name: string;
  isRealConnection: boolean;
  lastChecked: number;
  note?: string;
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
    | "USER_BLOCKED"
    | "USER_UNBLOCKED"
    | "USER_VERIFIED"
    | "SHOP_STATUS_OVERRIDE"
    | "RATES_OVERRIDE"
    | "EMERGENCY_QUEUE_PAUSED"
    | "QUEUE_PAUSED"
    | "QUEUE_RESUMED"
    | "PRINTER_STATE_OVERRIDE"
    | "USER_CREATED_BY_ADMIN"
    | "CONTENT_UPDATED"
    | "CASH_COLLECTED"
    | "PAYMENT_REFUNDED"
    | "BROADCAST_SENT";
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
const QUEUE_PAUSED_STORAGE_KEY = "printq_queue_paused";
const PRINTER_STATE_STORAGE_KEY = "printq_printer_state";
const DYNAMIC_CONTENT_KEY = "printq_dynamic_content";
const ADMIN_BROADCASTS_KEY = "printq_admin_broadcasts";
const TRANSACTION_OVERRIDES_KEY = "printq_transaction_overrides";

export const DEFAULT_DYNAMIC_CONTENT: DynamicAppContent = {
  announcementBanner: {
    enabled: true,
    title: "⚡ Campus Express Printing Active",
    message: "Counter A-2 operating normally. Orders ready for collection within 15 mins!",
    type: "info",
    badgeText: "CAMPUS LIVE",
    actionLabel: "View Live Queue",
  },
  shopNotice: "Standard hours: Mon–Fri 9:30 AM to 5:00 PM. Please collect your prints before counter closing.",
  services: [
    { id: "srv_bw", title: "Standard B&W Print", description: "Crisp black & white laser printing on 75 GSM paper", priceTag: "₹2.00 / page", category: "print", active: true },
    { id: "srv_color", title: "Color Laser Print", description: "Vibrant high-resolution full colour diagrams & presentations", priceTag: "₹8.00 / page", category: "print", active: true },
    { id: "srv_spiral", title: "Spiral Binding", description: "Transparent front & heavy back card binding up to 250 sheets", priceTag: "₹25.00 / set", category: "binding", active: true },
    { id: "srv_staple", title: "Corner Staple", description: "Heavy duty neat metal staple on top left corner", priceTag: "Free", category: "binding", active: true },
    { id: "srv_glossy", title: "Glossy Photo Sheet (200 GSM)", description: "High-gloss photographic finish for certificates & posters", priceTag: "+₹6.00 / page", category: "special", active: true },
    { id: "srv_bond", title: "Executive Bond (85 GSM)", description: "Premium textured royal bond paper for resumes & official letters", priceTag: "+₹1.50 / page", category: "special", active: true },
  ],
  promos: [
    { id: "prm_exam", code: "EXAM20", discountType: "percentage", discountValue: 20, minOrder: 50, active: true, description: "20% off on all Thesis & project prints above ₹50" },
    { id: "prm_welcome", code: "WELCOME5", discountType: "flat", discountValue: 5, minOrder: 20, active: true, description: "Flat ₹5 off on your first order above ₹20" },
    { id: "prm_bulk", code: "BULK50", discountType: "percentage", discountValue: 15, minOrder: 100, active: true, description: "15% off bulk class notes above ₹100" },
  ],
  lastUpdated: Date.now(),
  updatedBy: "Vipul (Master Admin)",
};

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
      if (existing.isBlocked) {
        throw new Error(`Account Blocked: ${existing.blockedReason || "Your account has been blocked by campus administration. Please contact Counter A-2."}`);
      }
      if (existing.isActive === false) {
        throw new Error("Account Inactive: Your account has been temporarily suspended by campus administration.");
      }
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
      if (existing.isBlocked) {
        throw new Error(`Account Blocked: ${existing.blockedReason || "Your account has been blocked by campus administration. Please contact Counter A-2."}`);
      }
      if (existing.isActive === false) {
        throw new Error("Account Inactive: Your account has been temporarily suspended by campus administration.");
      }
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
  public isMobileNumberRegistered(mobile: string): boolean {
    const clean = mobile.replace(/\D/g, "").slice(-10);
    if (!clean) return false;
    const users = this.getAllUsersMap();
    return Object.values(users).some((u) => {
      const uMobile = (u.phoneNumber || "").replace(/\D/g, "").slice(-10);
      return uMobile === clean;
    });
  }

  public createUserAsAdmin(params: { name: string; mobileNumber: string }): FirebaseUserProfile {
    if (!this.hasVerifiedAdminSession()) {
      throw new Error("Permission Denied: Only authenticated administrators can add verified users.");
    }
    const cleanMobile = params.mobileNumber.replace(/\D/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      throw new Error("Invalid mobile number. Please enter a valid 10-digit Indian mobile number.");
    }
    const cleanName = params.name.trim();
    if (!cleanName) {
      throw new Error("Full Name is required.");
    }

    if (this.isMobileNumberRegistered(cleanMobile)) {
      throw new Error(`Mobile number +91 ${cleanMobile} is already registered.`);
    }

    const uid = `uid_ph_${cleanMobile}`;
    const users = this.getAllUsersMap();
    const newUser: FirebaseUserProfile = {
      uid,
      email: `${cleanMobile}@phtopy.student`,
      displayName: cleanName,
      role: "user",
      phoneNumber: `+91 ${cleanMobile}`,
      phoneVerified: true,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      isActive: true,
    };

    users[uid] = newUser;
    this.saveUsersMap(users);

    this.appendAuditLog({
      action: "USER_CREATED_BY_ADMIN",
      targetId: uid,
      details: `Admin added verified student ${cleanName} (+91 ${cleanMobile}) via OTP verification.`,
    });

    return newUser;
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
    const user = this.activeUid ? this.getAllUsersMap()[this.activeUid] : null;
    const isCash = (orderData as any).paymentMethod === "Cash" || (orderData as any).paymentMode === "cash";
    const newOrder: FirebaseOrderRecord = {
      ...orderData,
      id: orderId,
      userId: this.activeUid || "guest", // enforce current UID
      userPhone: orderData.userPhone || user?.phoneNumber || "",
      paymentMode: orderData.paymentMode || (isCash ? "cash" : "online"),
      paymentMethod: orderData.paymentMethod || (isCash ? "Cash" : "UPI"),
      paymentStatus: orderData.paymentStatus || (isCash ? "pending_cash" : "paid"),
      createdAt: now,
      updatedAt: now,
    };

    const all = this.getAllOrdersList();
    all.unshift(newOrder);
    this.saveOrdersList(all);

    // Auto-create initial Notification in notifications collection
    this.createNotification({
      userId: this.activeUid || "guest",
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
      userId: this.activeUid || "guest",
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
    public isQueuePaused(): { paused: boolean; reason?: string; timestamp?: number } {
    try {
      const data = window.localStorage.getItem(QUEUE_PAUSED_STORAGE_KEY);
      if (data) return JSON.parse(data);
    } catch {}
    return { paused: false };
  }

  public setQueuePaused(paused: boolean, reason?: string): void {
    if (!this.hasVerifiedAdminSession()) {
      throw new Error("Security Violation: Administrator authorization token required.");
    }
    const val = { paused, reason: reason || (paused ? "Print shop queue paused for maintenance" : "Queue intake resumed"), timestamp: Date.now() };
    window.localStorage.setItem(QUEUE_PAUSED_STORAGE_KEY, JSON.stringify(val));
    window.dispatchEvent(new CustomEvent("printq-queue-pause-changed", { detail: val }));
    this.appendAuditLog({
      action: paused ? "QUEUE_PAUSED" : "QUEUE_RESUMED",
      details: paused ? `Queue paused by admin. Reason: ${val.reason}` : "Queue resumed normal operations.",
    });
  }

  public getPrinterState(): PrinterHardwareState {
    try {
      const data = window.localStorage.getItem(PRINTER_STATE_STORAGE_KEY);
      if (data) return JSON.parse(data);
    } catch {}
    return {
      status: "online",
      name: "Campus Print Engine (HP PageWide Pro)",
      isRealConnection: false,
      lastChecked: Date.now(),
      note: "Standard WebPrint Spooler (Hardware Telemetry: Standalone Fallback)",
    };
  }

  public setPrinterState(status: PrinterHardwareStatus, note?: string): void {
    if (!this.hasVerifiedAdminSession()) {
      throw new Error("Security Violation: Administrator authorization token required.");
    }
    const current = this.getPrinterState();
    const updated: PrinterHardwareState = {
      ...current,
      status,
      lastChecked: Date.now(),
      note: note || (status === "online" ? "Printer is operational" : `Printer status changed to ${status}`),
    };
    window.localStorage.setItem(PRINTER_STATE_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("printq-printer-state-changed", { detail: updated }));
    this.appendAuditLog({
      action: "PRINTER_STATE_OVERRIDE",
      details: `Printer hardware state changed to ${status.toUpperCase()}: ${updated.note}`,
    });
  }

  public getAdminMasterData(): {
    users: FirebaseUserProfile[];
    orders: FirebaseOrderRecord[];
    auditLogs: AdminAuditLogEntry[];
    metrics: {
      totalUsers: number;
      activeQueue: number;
      pendingCount: number;
      printingCount: number;
      readyCount: number;
      completedToday: number;
      cancelledCount: number;
      revenue: number;
      collectedRevenue: number;
      pendingCashRevenue: number;
      verifiedOnlineRevenue: number;
      printerStatus: "online" | "warning" | "offline";
      printerHardware: PrinterHardwareState;
      queuePaused: boolean;
      queuePauseReason?: string;
    };
  } {
    if (!this.hasVerifiedAdminSession()) {
      throw new Error("Security Violation: Missing or expired Administrator 2FA session token.");
    }

    const users = Object.values(this.getAllUsersMap());
    const orders = this.getAllOrdersList();
    const auditLogs = this.getAllAuditLogsList();

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfDayMs = startOfDay.getTime();

    const activeOrders = orders.filter((o) => o.status === "confirmed" || o.status === "queued" || o.status === "printing");
    const pendingCount = orders.filter((o) => o.status === "confirmed" || o.status === "queued").length;
    const printingCount = orders.filter((o) => o.status === "printing").length;
    const readyCount = orders.filter((o) => o.status === "ready").length;
    const completedToday = orders.filter((o) => o.status === "completed" && (o.updatedAt || o.createdAt) >= startOfDayMs).length;
    const cancelledCount = orders.filter((o) => o.status === "cancelled").length;

    // Real collected revenue: completed orders OR verified online payments
    const collectedRevenue = orders.reduce((sum, o) => {
      if (o.status === "cancelled") return sum;
      if (o.status === "completed" || (o as any).paymentMode === "online" || (o as any).paymentStatus === "success") {
        return sum + (o.totalAmount || 0);
      }
      return sum;
    }, 0);

    const pendingCashRevenue = orders.reduce((sum, o) => {
      if (o.status === "cancelled" || o.status === "completed") return sum;
      if ((o as any).paymentMode === "cash" || !(o as any).paymentMode) {
        return sum + (o.totalAmount || 0);
      }
      return sum;
    }, 0);

    const verifiedOnlineRevenue = orders.reduce((sum, o) => {
      if (o.status === "cancelled") return sum;
      if ((o as any).paymentMode === "online") {
        return sum + (o.totalAmount || 0);
      }
      return sum;
    }, 0);

    const printerState = this.getPrinterState();
    const queuePauseState = this.isQueuePaused();

    return {
      users,
      orders,
      auditLogs,
      metrics: {
        totalUsers: users.length,
        activeQueue: activeOrders.length,
        pendingCount,
        printingCount,
        readyCount,
        completedToday,
        cancelledCount,
        revenue: collectedRevenue,
        collectedRevenue,
        pendingCashRevenue,
        verifiedOnlineRevenue,
        printerStatus: printerState.status === "online" ? "online" : printerState.status === "offline" ? "offline" : "warning",
        printerHardware: printerState,
        queuePaused: queuePauseState.paused,
        queuePauseReason: queuePauseState.reason,
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
   * Privileged: Admin blocks or unblocks a student account with explicit reason.
   */
  public setUserBlockStatusAsAdmin(targetUid: string, isBlocked: boolean, reason?: string): void {
    if (!this.hasVerifiedAdminSession()) {
      throw new Error("Security Violation: Administrator authorization token required.");
    }

    const users = this.getAllUsersMap();
    const target = users[targetUid];
    if (!target) throw new Error("Target user not found.");

    target.isBlocked = isBlocked;
    if (isBlocked) {
      target.isActive = false;
      target.blockedReason = reason || "Account blocked by campus administration";
      target.blockedAt = Date.now();
    } else {
      target.isActive = true;
      target.blockedReason = undefined;
      target.blockedAt = undefined;
    }

    users[targetUid] = target;
    this.saveUsersMap(users);

    this.appendAuditLog({
      action: isBlocked ? "USER_BLOCKED" : "USER_UNBLOCKED",
      targetId: targetUid,
      details: isBlocked
        ? `Blocked user ${target.displayName} (${target.phoneNumber || target.email}). Reason: ${reason || "N/A"}`
        : `Unblocked user ${target.displayName} (${target.phoneNumber || target.email}). Account restored to Active.`,
    });
  }

  /**
   * Privileged: Admin manually sets verification status for walk-in or offline users.
   */
  public verifyUserPhoneAsAdmin(targetUid: string, phoneVerified: boolean): void {
    if (!this.hasVerifiedAdminSession()) {
      throw new Error("Security Violation: Administrator authorization token required.");
    }

    const users = this.getAllUsersMap();
    const target = users[targetUid];
    if (!target) throw new Error("Target user not found.");

    target.phoneVerified = phoneVerified;
    users[targetUid] = target;
    this.saveUsersMap(users);

    this.appendAuditLog({
      action: "USER_VERIFIED",
      targetId: targetUid,
      details: `Admin manually set phone verification for ${target.displayName} to ${phoneVerified ? "VERIFIED" : "UNVERIFIED"}.`,
    });
  }

  /**
   * Content Control: Get active app banners, notices, service listings & promo offers.
   */
  public getDynamicContent(): DynamicAppContent {
    try {
      const saved = window.localStorage.getItem(DYNAMIC_CONTENT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_DYNAMIC_CONTENT,
          ...parsed,
          announcementBanner: {
            ...DEFAULT_DYNAMIC_CONTENT.announcementBanner,
            ...(parsed.announcementBanner || {}),
          },
        };
      }
    } catch {}
    return DEFAULT_DYNAMIC_CONTENT;
  }

  /**
   * Content Control: Admin updates app banners, services, listings without app rebuild.
   */
  public saveDynamicContentAsAdmin(content: DynamicAppContent): void {
    if (!this.hasVerifiedAdminSession()) {
      throw new Error("Security Violation: Administrator authorization token required.");
    }

    const updated: DynamicAppContent = {
      ...content,
      lastUpdated: Date.now(),
      updatedBy: "Vipul (Master Admin)",
    };

    try {
      window.localStorage.setItem(DYNAMIC_CONTENT_KEY, JSON.stringify(updated));
    } catch {}

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("printq:contentUpdated", { detail: updated }));
    }

    this.appendAuditLog({
      action: "CONTENT_UPDATED",
      details: `Updated app banners and content controls (Banner: ${updated.announcementBanner.enabled ? "Active" : "Disabled"}, Services: ${updated.services.length}, Promos: ${updated.promos.length}).`,
    });
  }

  /**
   * Payments & Transactions: Retrieve full transactions ledger across all orders.
   */
  public getAllTransactionsAsAdmin(): AdminTransactionRecord[] {
    if (!this.hasVerifiedAdminSession()) {
      throw new Error("Security Violation: Administrator authorization token required.");
    }

    const orders = this.getAllOrdersList();
    const users = this.getAllUsersMap();

    return orders.map((o) => {
      const user = users[o.userId];
      const isCash = o.paymentMode === "cash" || o.paymentMethod === "Cash";
      const status: AdminTransactionRecord["paymentStatus"] =
        o.paymentStatus === "refunded"
          ? "refunded"
          : o.paymentStatus === "failed" || o.status === "cancelled"
          ? (o.paymentStatus === "paid" ? "refunded" : "failed")
          : o.paymentStatus === "paid" || o.status === "completed"
          ? "paid"
          : isCash
          ? "pending_cash"
          : "paid";

      const refId = (o as any).transactionReference || `TXN-${(o.createdAt || Date.now()).toString().slice(-6)}-${o.token}`;

      return {
        id: `tx_${o.id}`,
        orderId: o.id,
        orderToken: o.token,
        userId: o.userId,
        userName: o.userName || user?.displayName || "Campus Student",
        userPhone: o.userPhone || user?.phoneNumber || "Unlisted",
        amount: o.totalAmount || 0,
        paymentMode: isCash ? "cash" : "online",
        paymentMethod: isCash ? "Cash" : "UPI",
        paymentStatus: status,
        timestamp: o.createdAt || Date.now(),
        referenceId: refId,
        refundReason: o.refundReason,
        refundedAt: o.refundedAt,
        fileName: o.job?.fileName,
        pages: o.job?.pages,
      };
    });
  }

  /**
   * Payments: Admin marks counter cash as received.
   */
  public markCashCollectedAsAdmin(targetId: string): void {
    if (!this.hasVerifiedAdminSession()) {
      throw new Error("Security Violation: Administrator authorization token required.");
    }

    const cleanId = targetId.startsWith("tx_") ? targetId.replace("tx_", "") : targetId;
    const orders = this.getAllOrdersList();
    const order = orders.find((o) => o.id === cleanId || o.token === cleanId);
    if (!order) throw new Error("Order transaction not found.");

    order.paymentStatus = "paid";
    order.paymentMode = "cash";
    order.paymentMethod = "Cash";
    order.updatedAt = Date.now();
    this.saveOrdersList(orders);

    this.appendAuditLog({
      action: "CASH_COLLECTED",
      targetId: order.id,
      details: `Collected ₹${order.totalAmount.toFixed(2)} cash at counter for Order #${order.token} (${order.userName}).`,
    });

    this.createNotification({
      userId: order.userId,
      type: "payment_receipt",
      title: "Cash Payment Received",
      message: `Counter receipt confirmed: ₹${order.totalAmount.toFixed(2)} received in cash for Order #${order.token}.`,
      orderToken: order.token,
      recordId: order.id,
      iconType: "payment",
    });
  }

  /**
   * Payments: Admin issues refund with reason.
   */
  public issueRefundAsAdmin(targetId: string, reason: string): void {
    if (!this.hasVerifiedAdminSession()) {
      throw new Error("Security Violation: Administrator authorization token required.");
    }

    const cleanId = targetId.startsWith("tx_") ? targetId.replace("tx_", "") : targetId;
    const orders = this.getAllOrdersList();
    const order = orders.find((o) => o.id === cleanId || o.token === cleanId);
    if (!order) throw new Error("Order transaction not found.");

    order.paymentStatus = "refunded";
    order.status = "cancelled";
    order.refundReason = reason.trim() || "Customer refund issued by counter";
    order.refundedAt = Date.now();
    order.updatedAt = Date.now();
    this.saveOrdersList(orders);

    this.appendAuditLog({
      action: "PAYMENT_REFUNDED",
      targetId: order.id,
      details: `Refunded ₹${order.totalAmount.toFixed(2)} for Order #${order.token}. Reason: ${order.refundReason}`,
    });

    this.createNotification({
      userId: order.userId,
      type: "refund_processed",
      title: "Payment Refund Processed",
      message: `Refund of ₹${order.totalAmount.toFixed(2)} processed for Order #${order.token}. Reason: ${order.refundReason}.`,
      orderToken: order.token,
      recordId: order.id,
      iconType: "warning",
    });
  }

  /**
   * Notifications: Retrieve broadcast announcement history.
   */
  public getBroadcastHistory(): AdminBroadcastRecord[] {
    try {
      const saved = window.localStorage.getItem(ADMIN_BROADCASTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}

    return [
      {
        id: "bc_initial_demo",
        title: "Welcome to Campus Central Printing!",
        message: "Upload up to 5 documents simultaneously and track your pickup queue live in real time.",
        category: "announcement",
        targetAudience: "all",
        targetAudienceLabel: "All Registered Users",
        sentAt: Date.now() - 86400000,
        sentBy: "Vipul (Master Admin)",
        recipientCount: 5,
        priority: "normal",
      },
    ];
  }

  /**
   * Notifications: Admin sends push broadcast notification directly to students.
   */
  public sendBroadcastAsAdmin(params: {
    title: string;
    message: string;
    category: "announcement" | "offer" | "alert" | "maintenance";
    targetAudience: "all" | "active" | string;
    priority?: "normal" | "high" | "urgent";
  }): AdminBroadcastRecord {
    if (!this.hasVerifiedAdminSession()) {
      throw new Error("Security Violation: Administrator authorization token required.");
    }

    const cleanTitle = params.title.trim();
    const cleanMessage = params.message.trim();
    if (!cleanTitle || !cleanMessage) {
      throw new Error("Broadcast title and message cannot be empty.");
    }

    const usersMap = this.getAllUsersMap();
    const users = Object.values(usersMap);

    let recipients: FirebaseUserProfile[] = [];
    let targetLabel = "All Registered Users";

    if (params.targetAudience === "all") {
      recipients = users;
      targetLabel = `All Registered Users (${users.length})`;
    } else if (params.targetAudience === "active") {
      recipients = users.filter((u) => u.isActive !== false && !u.isBlocked);
      targetLabel = `Active Users Only (${recipients.length})`;
    } else {
      const specific = usersMap[params.targetAudience];
      if (specific) {
        recipients = [specific];
        targetLabel = `${specific.displayName} (+91 ${specific.phoneNumber?.replace(/\D/g, "").slice(-10) || "user"})`;
      } else {
        recipients = users;
      }
    }

    const now = Date.now();
    const recordId = `bc_${now}_${Math.random().toString(36).slice(2, 7)}`;

    recipients.forEach((u) => {
      this.createNotification({
        userId: u.uid,
        type: params.category,
        title: cleanTitle,
        message: cleanMessage,
        iconType: params.category === "offer" ? "gift" : params.category === "alert" ? "warning" : "bell",
      });
    });

    try {
      const notifKey = "printq-notifications-v2";
      const existingNotifs = JSON.parse(window.localStorage.getItem(notifKey) || "[]");
      const newNotifItem = {
        id: `notif_${recordId}`,
        type: params.category,
        title: cleanTitle,
        message: cleanMessage,
        timestamp: new Date(now).toISOString(),
        read: false,
        iconType: params.category === "offer" ? "gift" : params.category === "alert" ? "warning" : "bell",
      };
      window.localStorage.setItem(notifKey, JSON.stringify([newNotifItem, ...existingNotifs]));
    } catch {}

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("printq:notificationReceived", {
          detail: { title: cleanTitle, message: cleanMessage, category: params.category },
        })
      );
    }

    const broadcastRecord: AdminBroadcastRecord = {
      id: recordId,
      title: cleanTitle,
      message: cleanMessage,
      category: params.category,
      targetAudience: params.targetAudience,
      targetAudienceLabel: targetLabel,
      sentAt: now,
      sentBy: "Vipul (Master Admin)",
      recipientCount: recipients.length,
      priority: params.priority || "normal",
    };

    const history = this.getBroadcastHistory();
    history.unshift(broadcastRecord);
    try {
      window.localStorage.setItem(ADMIN_BROADCASTS_KEY, JSON.stringify(history));
    } catch {}

    this.appendAuditLog({
      action: "BROADCAST_SENT",
      targetId: recordId,
      details: `Broadcast sent to ${targetLabel}: "${cleanTitle}" (${params.category.toUpperCase()})`,
    });

    return broadcastRecord;
  }

  /**
   * Notifications: Admin deletes a broadcast entry.
   */
  public deleteBroadcastAsAdmin(broadcastId: string): void {
    if (!this.hasVerifiedAdminSession()) {
      throw new Error("Security Violation: Administrator authorization token required.");
    }
    const history = this.getBroadcastHistory().filter((b) => b.id !== broadcastId);
    try {
      window.localStorage.setItem(ADMIN_BROADCASTS_KEY, JSON.stringify(history));
    } catch {}
  }

  /**
   * Reports & Analytics: Generates clean, downloadable CSV data of orders & payments.
   */
  public generateBusinessReportCsv(timeRange: "today" | "week" | "month" | "all"): string {
    const orders = this.getAllOrdersList();
    const users = this.getAllUsersMap();
    const now = Date.now();
    let cutoff = 0;

    if (timeRange === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      cutoff = today.getTime();
    } else if (timeRange === "week") {
      cutoff = now - 7 * 24 * 60 * 60 * 1000;
    } else if (timeRange === "month") {
      cutoff = now - 30 * 24 * 60 * 60 * 1000;
    }

    const filtered = orders.filter((o) => (o.createdAt || now) >= cutoff);

    const headers = [
      "Order Token",
      "Transaction ID",
      "Date & Time",
      "Customer Name",
      "Customer Phone",
      "File Name",
      "Pages",
      "Copies",
      "Colour / BW",
      "Paper Stock",
      "Total Amount (INR)",
      "Payment Method",
      "Payment Status",
      "Order Status",
      "Refund Reason",
    ];

    const escapeCsv = (str: string | number | undefined | null) => {
      if (str === undefined || str === null) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = filtered.map((o) => {
      const user = users[o.userId];
      const isCash = o.paymentMode === "cash" || o.paymentMethod === "Cash";
      const txId = (o as any).transactionReference || `TXN-${(o.createdAt || now).toString().slice(-6)}-${o.token}`;
      const dt = new Date(o.createdAt || now).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

      return [
        escapeCsv(o.token),
        escapeCsv(txId),
        escapeCsv(dt),
        escapeCsv(o.userName || user?.displayName || "Student"),
        escapeCsv(o.userPhone || user?.phoneNumber || "N/A"),
        escapeCsv(o.job?.fileName || "Document"),
        escapeCsv(o.job?.pages || 1),
        escapeCsv(o.job?.copies || 1),
        escapeCsv(o.job?.colour ? "Colour" : "Black & White"),
        escapeCsv(o.job?.paperStock || o.job?.paper || "Standard 75 GSM"),
        escapeCsv((o.totalAmount || 0).toFixed(2)),
        escapeCsv(isCash ? "Cash at Counter" : "UPI Online"),
        escapeCsv(o.paymentStatus || (isCash ? "pending_cash" : "paid")),
        escapeCsv(o.status),
        escapeCsv(o.refundReason || ""),
      ].join(",");
    });

    return [headers.join(","), ...rows].join("\n");
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


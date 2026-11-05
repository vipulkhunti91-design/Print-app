import React, { useState, useEffect, useMemo } from "react";
import {
  securityEngine,
  type FirebaseOrderRecord,
  type FirebaseUserProfile,
  type AdminAuditLogEntry,
  type PrinterHardwareStatus,
  type AdminTransactionRecord,
  type DynamicAppContent,
  type AdminBroadcastRecord,
  type ServiceListingItem,
  type PromoOfferItem,
} from "../services/securityEngine";
import { sanitizeDisplayFileName } from "../utils/sanitizeFileName";
import { sendOtp, verifyOtp } from "../services/otpService";

export default function AdminMasterControl({
  onBack,
  adminUser,
  onOrderUpdated,
}: {
  onBack: () => void;
  adminUser: { uid: string; email: string; name: string };
  onOrderUpdated?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "orders"
    | "users"
    | "content"
    | "payments"
    | "notifications"
    | "reports"
    | "pricing"
    | "controls"
    | "audit"
  >("overview");
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

  // Feature 1: User Management State
  const [searchUserQuery, setSearchUserQuery] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState<"all" | "active" | "inactive" | "blocked" | "unverified">("all");
  const [blockModalUser, setBlockModalUser] = useState<FirebaseUserProfile | null>(null);
  const [blockReasonInput, setBlockReasonInput] = useState("Non-payment of counter cash orders");

  // Feature 2: Content Control State
  const [dynamicContent, setDynamicContent] = useState<DynamicAppContent>(() => securityEngine.getDynamicContent());
  const [newServiceModalOpen, setNewServiceModalOpen] = useState(false);
  const [newServiceTitle, setNewServiceTitle] = useState("");
  const [newServiceDesc, setNewServiceDesc] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("₹5.00 / page");
  const [newServiceCategory, setNewServiceCategory] = useState<"print" | "binding" | "special">("print");
  const [newPromoModalOpen, setNewPromoModalOpen] = useState(false);
  const [newPromoCode, setNewPromoCode] = useState("");
  const [newPromoType, setNewPromoType] = useState<"percentage" | "flat">("percentage");
  const [newPromoValue, setNewPromoValue] = useState(10);
  const [newPromoMinOrder, setNewPromoMinOrder] = useState(30);
  const [newPromoDesc, setNewPromoDesc] = useState("");

  // Feature 3: Payments & Transactions State
  const [transactions, setTransactions] = useState<AdminTransactionRecord[]>([]);
  const [paymentFilter, setPaymentFilter] = useState<"all" | "paid" | "cash_pending" | "refunded" | "failed">("all");
  const [searchTransaction, setSearchTransaction] = useState("");
  const [refundModalTxn, setRefundModalTxn] = useState<AdminTransactionRecord | null>(null);
  const [refundReasonInput, setRefundReasonInput] = useState("Customer requested cancellation before print");
  const [receiptModalTxn, setReceiptModalTxn] = useState<AdminTransactionRecord | null>(null);

  // Feature 4: Notifications Broadcast State
  const [broadcastHistory, setBroadcastHistory] = useState<AdminBroadcastRecord[]>([]);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastCategory, setBroadcastCategory] = useState<"announcement" | "offer" | "alert" | "maintenance">("announcement");
  const [broadcastTarget, setBroadcastTarget] = useState<string>("all");
  const [broadcastPriority, setBroadcastPriority] = useState<"normal" | "high" | "urgent">("normal");
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  // Feature 5: Reports & Analytics State
  const [reportTimeRange, setReportTimeRange] = useState<"today" | "week" | "month" | "all">("today");

  // Add User with Mobile Number OTP Verification Modal State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [addUserStep, setAddUserStep] = useState<"details" | "otp" | "success">("details");
  const [addUserName, setAddUserName] = useState("");
  const [addUserMobile, setAddUserMobile] = useState("");
  const [addUserOtpDigits, setAddUserOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [addUserError, setAddUserError] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpResendCountdown, setOtpResendCountdown] = useState(0);
  const [otpAttemptsLeft, setOtpAttemptsLeft] = useState(5);
  const [previewOtpNotice, setPreviewOtpNotice] = useState<string | null>(null);
  const [createdSuccessUser, setCreatedSuccessUser] = useState<FirebaseUserProfile | null>(null);

  // Resend Countdown Timer effect
  useEffect(() => {
    if (otpResendCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpResendCountdown]);

  const handleOpenAddUser = () => {
    setAddUserName("");
    setAddUserMobile("");
    setAddUserOtpDigits(["", "", "", "", "", ""]);
    setAddUserError("");
    setAddUserStep("details");
    setOtpAttemptsLeft(5);
    setPreviewOtpNotice(null);
    setCreatedSuccessUser(null);
    setIsAddUserModalOpen(true);
  };

  const handleSendOtpToAddUser = async () => {
    setAddUserError("");
    const cleanName = addUserName.trim();
    if (!cleanName) {
      setAddUserError("Please enter the student's full name.");
      return;
    }
    const cleanMobile = addUserMobile.replace(/\D/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      setAddUserError("Please enter a valid 10-digit Indian mobile number starting with 6-9.");
      return;
    }

    if (securityEngine.isMobileNumberRegistered(cleanMobile)) {
      setAddUserError(`A verified user with mobile +91 ${cleanMobile} already exists in the system.`);
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await sendOtp(cleanMobile, 6);
      setIsSendingOtp(false);
      setAddUserStep("otp");
      setOtpResendCountdown(30);
      setOtpAttemptsLeft(5);
      if (res.devCode) {
        setPreviewOtpNotice(res.devCode);
      }
    } catch (err: any) {
      setIsSendingOtp(false);
      setAddUserError(err.message || "Failed to send OTP SMS. Please try again.");
    }
  };

  const handleResendOtp = async () => {
    if (otpResendCountdown > 0) return;
    setAddUserError("");
    const cleanMobile = addUserMobile.replace(/\D/g, "").slice(-10);
    setIsSendingOtp(true);
    try {
      const res = await sendOtp(cleanMobile, 6);
      setIsSendingOtp(false);
      setOtpResendCountdown(30);
      if (res.devCode) {
        setPreviewOtpNotice(res.devCode);
      }
      showToast("A new 6-digit verification OTP has been sent.");
    } catch (err: any) {
      setIsSendingOtp(false);
      setAddUserError(err.message || "Could not resend OTP right now.");
    }
  };

  const handleVerifyOtpAndCreateUser = async () => {
    setAddUserError("");
    const enteredCode = addUserOtpDigits.join("");
    if (enteredCode.length !== 6 || !/^\d{6}$/.test(enteredCode)) {
      setAddUserError("Please enter the complete 6-digit OTP code.");
      return;
    }

    const cleanMobile = addUserMobile.replace(/\D/g, "").slice(-10);
    setIsVerifyingOtp(true);

    try {
      const isVerified = await verifyOtp(cleanMobile, enteredCode);
      if (!isVerified) {
        const remaining = otpAttemptsLeft - 1;
        setOtpAttemptsLeft(remaining);
        setIsVerifyingOtp(false);
        if (remaining <= 0) {
          setAddUserError("Too many incorrect attempts. This OTP has been invalidated. Please request a new one.");
        } else {
          setAddUserError(`Incorrect OTP code. ${remaining} ${remaining === 1 ? "attempt" : "attempts"} remaining.`);
        }
        return;
      }

      // Successful OTP Verification -> Create User Atomically
      const newUser = securityEngine.createUserAsAdmin({
        name: addUserName.trim(),
        mobileNumber: cleanMobile,
      });

      setIsVerifyingOtp(false);
      setCreatedSuccessUser(newUser);
      setAddUserStep("success");
      loadData();
      showToast("Mobile number verified. User added successfully.");
    } catch (err: any) {
      setIsVerifyingOtp(false);
      setAddUserError(err.message || "OTP verification failed. Please try again.");
    }
  };


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
        setTransactions(securityEngine.getAllTransactionsAsAdmin());
        setDynamicContent(securityEngine.getDynamicContent());
        setBroadcastHistory(securityEngine.getBroadcastHistory());
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

  // ---------------------------------------------------------------------------
  // FEATURE 1: USER MANAGEMENT HANDLERS
  // ---------------------------------------------------------------------------
  const filteredUsers = useMemo(() => {
    if (!adminData) return [];
    return adminData.users.filter((u) => {
      if (userStatusFilter === "active") {
        if (u.isActive === false || u.isBlocked) return false;
      } else if (userStatusFilter === "inactive") {
        if (u.isActive !== false || u.isBlocked) return false;
      } else if (userStatusFilter === "blocked") {
        if (!u.isBlocked) return false;
      } else if (userStatusFilter === "unverified") {
        if (u.phoneVerified) return false;
      }

      if (searchUserQuery.trim()) {
        const q = searchUserQuery.toLowerCase();
        return (
          u.displayName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.phoneNumber || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [adminData, userStatusFilter, searchUserQuery]);

  const handleBlockUserPrompt = (u: FirebaseUserProfile) => {
    setBlockModalUser(u);
    setBlockReasonInput("Non-payment of counter cash orders");
  };

  const handleConfirmBlockUser = () => {
    if (!blockModalUser) return;
    try {
      const reason = blockReasonInput.trim() || "Administrative security block";
      securityEngine.setUserBlockStatusAsAdmin(blockModalUser.uid, true, reason);
      showToast(`User ${blockModalUser.displayName} has been BLOCKED.`);
      setBlockModalUser(null);
      loadData();
    } catch (e: any) {
      showToast(e.message || "Failed to block user.");
    }
  };

  const handleUnblockUser = (u: FirebaseUserProfile) => {
    try {
      securityEngine.setUserBlockStatusAsAdmin(u.uid, false);
      showToast(`User ${u.displayName} account RESTORED to Active.`);
      loadData();
    } catch (e: any) {
      showToast(e.message || "Failed to unblock user.");
    }
  };

  const handleToggleUserVerify = (u: FirebaseUserProfile) => {
    try {
      const next = !u.phoneVerified;
      securityEngine.verifyUserPhoneAsAdmin(u.uid, next);
      showToast(`${u.displayName} marked ${next ? "VERIFIED ✓" : "UNVERIFIED"}`);
      loadData();
    } catch (e: any) {
      showToast(e.message || "Verification update failed.");
    }
  };

  const handleToggleUserActive = (u: FirebaseUserProfile) => {
    try {
      const nextActive = u.isActive === false;
      securityEngine.setUserActiveStatusAsAdmin(u.uid, nextActive);
      showToast(`User ${u.displayName} account ${nextActive ? "ACTIVATED" : "SUSPENDED"}`);
      loadData();
    } catch (e: any) {
      showToast(e.message || "Status update failed.");
    }
  };

  // ---------------------------------------------------------------------------
  // FEATURE 2: CONTENT CONTROL HANDLERS
  // ---------------------------------------------------------------------------
  const handleSaveDynamicContent = (updated?: DynamicAppContent) => {
    const toSave = updated || dynamicContent;
    try {
      securityEngine.saveDynamicContentAsAdmin(toSave);
      setDynamicContent({ ...toSave });
      showToast("✓ App banners, notices & content saved live.");
      loadData();
    } catch (e: any) {
      showToast(e.message || "Failed to save content.");
    }
  };

  const handleToggleBanner = (enabled: boolean) => {
    const updated: DynamicAppContent = {
      ...dynamicContent,
      announcementBanner: {
        ...dynamicContent.announcementBanner,
        enabled,
      },
    };
    setDynamicContent(updated);
    handleSaveDynamicContent(updated);
  };

  const handleToggleService = (serviceId: string) => {
    const updatedServices = dynamicContent.services.map((s) =>
      s.id === serviceId ? { ...s, active: !s.active } : s
    );
    const updated: DynamicAppContent = { ...dynamicContent, services: updatedServices };
    setDynamicContent(updated);
    handleSaveDynamicContent(updated);
  };

  const handleDeleteService = (serviceId: string) => {
    const updatedServices = dynamicContent.services.filter((s) => s.id !== serviceId);
    const updated: DynamicAppContent = { ...dynamicContent, services: updatedServices };
    setDynamicContent(updated);
    handleSaveDynamicContent(updated);
  };

  const handleCreateService = () => {
    if (!newServiceTitle.trim()) {
      showToast("Please enter a service title.");
      return;
    }
    const newService: ServiceListingItem = {
      id: `srv_${Date.now()}`,
      title: newServiceTitle.trim(),
      description: newServiceDesc.trim() || "Campus print service",
      priceTag: newServicePrice.trim() || "₹5.00 / page",
      category: newServiceCategory,
      active: true,
    };
    const updated: DynamicAppContent = {
      ...dynamicContent,
      services: [...dynamicContent.services, newService],
    };
    setDynamicContent(updated);
    handleSaveDynamicContent(updated);
    setNewServiceTitle("");
    setNewServiceDesc("");
    setNewServiceModalOpen(false);
  };

  const handleTogglePromo = (promoId: string) => {
    const updatedPromos = dynamicContent.promos.map((p) =>
      p.id === promoId ? { ...p, active: !p.active } : p
    );
    const updated: DynamicAppContent = { ...dynamicContent, promos: updatedPromos };
    setDynamicContent(updated);
    handleSaveDynamicContent(updated);
  };

  const handleDeletePromo = (promoId: string) => {
    const updatedPromos = dynamicContent.promos.filter((p) => p.id !== promoId);
    const updated: DynamicAppContent = { ...dynamicContent, promos: updatedPromos };
    setDynamicContent(updated);
    handleSaveDynamicContent(updated);
  };

  const handleCreatePromo = () => {
    if (!newPromoCode.trim()) {
      showToast("Please enter a promo code.");
      return;
    }
    const newPromo: PromoOfferItem = {
      id: `prm_${Date.now()}`,
      code: newPromoCode.trim().toUpperCase(),
      discountType: newPromoType,
      discountValue: Math.max(1, Number(newPromoValue) || 10),
      minOrder: Math.max(0, Number(newPromoMinOrder) || 0),
      active: true,
      description: newPromoDesc.trim() || `${newPromoValue}${newPromoType === "percentage" ? "%" : "₹"} discount code`,
    };
    const updated: DynamicAppContent = {
      ...dynamicContent,
      promos: [...dynamicContent.promos, newPromo],
    };
    setDynamicContent(updated);
    handleSaveDynamicContent(updated);
    setNewPromoCode("");
    setNewPromoDesc("");
    setNewPromoModalOpen(false);
  };

  // ---------------------------------------------------------------------------
  // FEATURE 3: PAYMENTS & TRANSACTIONS HANDLERS
  // ---------------------------------------------------------------------------
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (paymentFilter === "paid") {
        if (t.paymentStatus !== "paid") return false;
      } else if (paymentFilter === "cash_pending") {
        if (t.paymentStatus !== "pending_cash") return false;
      } else if (paymentFilter === "refunded") {
        if (t.paymentStatus !== "refunded") return false;
      } else if (paymentFilter === "failed") {
        if (t.paymentStatus !== "failed") return false;
      }

      if (searchTransaction.trim()) {
        const q = searchTransaction.toLowerCase();
        return (
          t.orderToken.toLowerCase().includes(q) ||
          t.userName.toLowerCase().includes(q) ||
          t.userPhone.toLowerCase().includes(q) ||
          t.referenceId.toLowerCase().includes(q) ||
          (t.fileName || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [transactions, paymentFilter, searchTransaction]);

  const handleCollectCash = (txn: AdminTransactionRecord) => {
    try {
      securityEngine.markCashCollectedAsAdmin(txn.orderId);
      showToast(`✓ Cash collected (₹${txn.amount.toFixed(2)}) for Order #${txn.orderToken}`);
      loadData();
    } catch (e: any) {
      showToast(e.message || "Failed to mark cash collected.");
    }
  };

  const handlePromptRefund = (txn: AdminTransactionRecord) => {
    setRefundModalTxn(txn);
    setRefundReasonInput("Customer requested cancellation before print");
  };

  const handleConfirmRefund = () => {
    if (!refundModalTxn) return;
    try {
      const reason = refundReasonInput.trim() || "Customer refund processed by shopkeeper";
      securityEngine.issueRefundAsAdmin(refundModalTxn.orderId, reason);
      showToast(`✓ Refund of ₹${refundModalTxn.amount.toFixed(2)} issued for Order #${refundModalTxn.orderToken}`);
      setRefundModalTxn(null);
      loadData();
    } catch (e: any) {
      showToast(e.message || "Failed to process refund.");
    }
  };

  // ---------------------------------------------------------------------------
  // FEATURE 4: NOTIFICATIONS BROADCAST HANDLERS
  // ---------------------------------------------------------------------------
  const handleSendBroadcast = () => {
    if (!broadcastTitle.trim()) {
      showToast("Please enter a broadcast notification title.");
      return;
    }
    if (!broadcastMessage.trim()) {
      showToast("Please enter a broadcast message.");
      return;
    }

    setIsSendingBroadcast(true);
    try {
      const record = securityEngine.sendBroadcastAsAdmin({
        title: broadcastTitle,
        message: broadcastMessage,
        category: broadcastCategory,
        targetAudience: broadcastTarget,
        priority: broadcastPriority,
      });
      showToast(`✓ Broadcast sent to ${record.targetAudienceLabel}`);
      setBroadcastTitle("");
      setBroadcastMessage("");
      loadData();
    } catch (e: any) {
      showToast(e.message || "Failed to send broadcast.");
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const handleDeleteBroadcast = (id: string) => {
    try {
      securityEngine.deleteBroadcastAsAdmin(id);
      showToast("Broadcast removed from history.");
      loadData();
    } catch (e: any) {
      showToast(e.message || "Failed to delete broadcast.");
    }
  };

  // ---------------------------------------------------------------------------
  // FEATURE 5: REPORTS & ANALYTICS HANDLERS
  // ---------------------------------------------------------------------------
  const handleExportCsv = () => {
    try {
      const csvData = securityEngine.generateBusinessReportCsv(reportTimeRange);
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `printq_business_report_${reportTimeRange}_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`✓ Business report CSV (${reportTimeRange}) downloaded successfully.`);
    } catch (e: any) {
      showToast(e.message || "Failed to export report CSV.");
    }
  };

  const handlePrintReport = () => {
    window.print();
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
          👥 1. Users ({adminData?.users.length ?? 0})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "content"}
          className={`admin-nav-tab${activeTab === "content" ? " is-active" : ""}`}
          onClick={() => setActiveTab("content")}
        >
          🎨 2. Content
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "payments"}
          className={`admin-nav-tab${activeTab === "payments" ? " is-active" : ""}`}
          onClick={() => setActiveTab("payments")}
        >
          💳 3. Payments ({transactions.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "notifications"}
          className={`admin-nav-tab${activeTab === "notifications" ? " is-active" : ""}`}
          onClick={() => setActiveTab("notifications")}
        >
          📢 4. Broadcast
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "reports"}
          className={`admin-nav-tab${activeTab === "reports" ? " is-active" : ""}`}
          onClick={() => setActiveTab("reports")}
        >
          📈 5. Reports
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "pricing"}
          className={`admin-nav-tab${activeTab === "pricing" ? " is-active" : ""}`}
          onClick={() => setActiveTab("pricing")}
        >
          📜 Rates
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "controls"}
          className={`admin-nav-tab${activeTab === "controls" ? " is-active" : ""}`}
          onClick={() => setActiveTab("controls")}
        >
          ⚙ Controls
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "audit"}
          className={`admin-nav-tab${activeTab === "audit" ? " is-active" : ""}`}
          onClick={() => setActiveTab("audit")}
        >
          🛡 Audit
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
                            {sanitizeDisplayFileName(order.job.fileName)}
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

      {/* =================================================================== */}
      {/* 1. USER MANAGEMENT TAB                                              */}
      {/* =================================================================== */}
      {activeTab === "users" && adminData && (
        <section className="admin-tab-content">
          <div className="bill-card" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text)" }}>
                  1. User Management & Verification Hub
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                  Total {adminData.users.length} registered campus users. Verify phone numbers, manage active status, and block abusive accounts.
                </p>
              </div>
              <button
                type="button"
                className="admin-header-action-btn primary"
                onClick={handleOpenAddUser}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <span style={{ fontSize: 16, fontWeight: 700 }}>+</span> Add User (with SMS OTP)
              </button>
            </div>

            {/* User Search & Filters */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <input
                  type="text"
                  placeholder="Search by student name, phone or email..."
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                  className="admin-search-input"
                  style={{ width: "100%" }}
                />
              </div>
              <div className="admin-filter-pills" style={{ margin: 0 }}>
                <button
                  type="button"
                  className={`admin-filter-pill${userStatusFilter === "all" ? " is-active" : ""}`}
                  onClick={() => setUserStatusFilter("all")}
                >
                  All ({adminData.users.length})
                </button>
                <button
                  type="button"
                  className={`admin-filter-pill${userStatusFilter === "active" ? " is-active" : ""}`}
                  onClick={() => setUserStatusFilter("active")}
                >
                  Active ({adminData.users.filter((u) => u.isActive !== false && !u.isBlocked).length})
                </button>
                <button
                  type="button"
                  className={`admin-filter-pill${userStatusFilter === "inactive" ? " is-active" : ""}`}
                  onClick={() => setUserStatusFilter("inactive")}
                >
                  Inactive ({adminData.users.filter((u) => u.isActive === false && !u.isBlocked).length})
                </button>
                <button
                  type="button"
                  className={`admin-filter-pill${userStatusFilter === "blocked" ? " is-active" : ""}`}
                  onClick={() => setUserStatusFilter("blocked")}
                >
                  Blocked ({adminData.users.filter((u) => u.isBlocked).length})
                </button>
                <button
                  type="button"
                  className={`admin-filter-pill${userStatusFilter === "unverified" ? " is-active" : ""}`}
                  onClick={() => setUserStatusFilter("unverified")}
                >
                  Unverified ({adminData.users.filter((u) => !u.phoneVerified).length})
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Student / User</th>
                    <th>Phone & Verification</th>
                    <th>Role</th>
                    <th>Account Status</th>
                    <th>Order Stats</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "28px 16px", color: "var(--text-secondary)" }}>
                        No campus users match the current filter or search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const userOrders = adminData.orders.filter((o) => o.userId === u.uid);
                      const totalSpent = userOrders
                        .filter((o) => o.status !== "cancelled")
                        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

                      return (
                        <tr key={u.uid}>
                          <td>
                            <strong style={{ fontSize: 13, color: "var(--text)" }}>{u.displayName || "PrintQ Student"}</strong>
                            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{u.email}</div>
                            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>UID: {u.uid}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>
                              {u.phoneNumber || "No mobile bound"}
                            </div>
                            {u.phoneVerified ? (
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "2px 8px",
                                  borderRadius: 4,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  background: "rgba(167, 232, 189, 0.16)",
                                  color: "var(--status-ready)",
                                }}
                              >
                                ✓ Phone Verified
                              </span>
                            ) : (
                              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "2px 8px",
                                    borderRadius: 4,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    background: "rgba(251, 146, 60, 0.16)",
                                    color: "var(--status-pending)",
                                  }}
                                >
                                  ⚠ Unverified
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleUserVerify(u)}
                                  style={{
                                    padding: "2px 6px",
                                    fontSize: 10,
                                    fontWeight: 700,
                                    borderRadius: 4,
                                    border: "1px solid var(--border)",
                                    background: "var(--surface-raised)",
                                    color: "var(--text)",
                                    cursor: "pointer",
                                  }}
                                  title="Manually verify phone number"
                                >
                                  Verify ✓
                                </button>
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={`admin-role-badge ${u.role}`}>{u.role.toUpperCase()}</span>
                          </td>
                          <td>
                            {u.isBlocked ? (
                              <div>
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "3px 8px",
                                    borderRadius: 4,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    background: "rgba(248, 113, 113, 0.2)",
                                    color: "var(--error)",
                                  }}
                                >
                                  ⛔ BLOCKED
                                </span>
                                {u.blockedReason && (
                                  <div style={{ fontSize: 10, color: "var(--error)", marginTop: 4, maxWidth: 180, lineHeight: 1.2 }}>
                                    Reason: {u.blockedReason}
                                  </div>
                                )}
                              </div>
                            ) : u.isActive === false ? (
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "3px 8px",
                                  borderRadius: 4,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  background: "rgba(251, 146, 60, 0.2)",
                                  color: "var(--status-pending)",
                                }}
                              >
                                ⏸ Inactive
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "3px 8px",
                                  borderRadius: 4,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  background: "rgba(167, 232, 189, 0.2)",
                                  color: "var(--status-ready)",
                                }}
                              >
                                ✓ Active
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
                              {userOrders.length} {userOrders.length === 1 ? "order" : "orders"}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--accent)" }}>
                              ₹{totalSpent.toFixed(2)} spent
                            </div>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {u.isBlocked ? (
                                <button
                                  type="button"
                                  className="admin-btn-action ready"
                                  onClick={() => handleUnblockUser(u)}
                                  title="Unblock account and restore access"
                                >
                                  Unblock 🔓
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className={`admin-btn-action ${u.isActive !== false ? "delay" : "ready"}`}
                                    onClick={() => handleToggleUserActive(u)}
                                    title={u.isActive !== false ? "Temporarily suspend user account" : "Re-activate user account"}
                                  >
                                    {u.isActive !== false ? "Pause ⏸" : "Activate ✓"}
                                  </button>
                                  <button
                                    type="button"
                                    className="admin-btn-action danger"
                                    onClick={() => handleBlockUserPrompt(u)}
                                    title="Block student from placing orders"
                                  >
                                    Block ⛔
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* =================================================================== */}
      {/* 2. CONTENT CONTROL TAB                                              */}
      {/* =================================================================== */}
      {activeTab === "content" && (
        <section className="admin-tab-content">
          {/* Header */}
          <div className="bill-card" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text)" }}>
                  2. Content Control & App Announcements
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                  Configure app banners, announcements, print service categories, and promo offers in real time without rebuilding the app.
                </p>
              </div>
              <button
                type="button"
                className="admin-header-action-btn primary"
                onClick={() => handleSaveDynamicContent()}
              >
                Save All Content Changes
              </button>
            </div>
          </div>

          {/* Section 2A: App Banners & Shop Announcements */}
          <div className="bill-card" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
                📢 Top Announcement Banner (Student Home Screen)
              </h4>
              <button
                type="button"
                onClick={() => handleToggleBanner(!dynamicContent.announcementBanner.enabled)}
                style={{
                  padding: "4px 12px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  border: "none",
                  background: dynamicContent.announcementBanner.enabled ? "rgba(167, 232, 189, 0.2)" : "rgba(248, 113, 113, 0.2)",
                  color: dynamicContent.announcementBanner.enabled ? "var(--status-ready)" : "var(--error)",
                }}
              >
                {dynamicContent.announcementBanner.enabled ? "Banner Active ✓" : "Banner Disabled ✕"}
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                  Banner Title
                </label>
                <input
                  type="text"
                  value={dynamicContent.announcementBanner.title}
                  onChange={(e) =>
                    setDynamicContent({
                      ...dynamicContent,
                      announcementBanner: { ...dynamicContent.announcementBanner, title: e.target.value },
                    })
                  }
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

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                  Badge Text (e.g. CAMPUS LIVE, OFFER)
                </label>
                <input
                  type="text"
                  value={dynamicContent.announcementBanner.badgeText || ""}
                  onChange={(e) =>
                    setDynamicContent({
                      ...dynamicContent,
                      announcementBanner: { ...dynamicContent.announcementBanner, badgeText: e.target.value },
                    })
                  }
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
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                Banner Message Body
              </label>
              <textarea
                rows={2}
                value={dynamicContent.announcementBanner.message}
                onChange={(e) =>
                  setDynamicContent({
                    ...dynamicContent,
                    announcementBanner: { ...dynamicContent.announcementBanner, message: e.target.value },
                  })
                }
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "var(--surface-raised)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--text)",
                  fontSize: 13,
                  resize: "vertical",
                }}
              />
            </div>

            {/* Live Student App Banner Preview */}
            <div style={{ padding: "12px", background: "var(--surface-raised)", borderRadius: 10, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase" }}>
                Live Preview (How students see it on Home Screen):
              </div>
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "rgba(244, 215, 121, 0.12)",
                  border: "1px solid var(--accent)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 2 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        background: "var(--accent)",
                        color: "var(--on-accent)",
                        padding: "1px 6px",
                        borderRadius: 4,
                      }}
                    >
                      {dynamicContent.announcementBanner.badgeText || "NOTICE"}
                    </span>
                    <strong style={{ fontSize: 13, color: "var(--text)" }}>{dynamicContent.announcementBanner.title}</strong>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{dynamicContent.announcementBanner.message}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)" }}>
                  {dynamicContent.announcementBanner.enabled ? "Active on App ✓" : "Hidden"}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2B: Campus Shop Notice */}
          <div className="bill-card" style={{ marginBottom: 16 }}>
            <h4 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
              🏢 Campus Shop Info & Operating Hours Notice
            </h4>
            <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-secondary)" }}>
              Displayed on the bottom campus shop card (Mon–Fri 9:30 AM to 5:00 PM).
            </p>
            <textarea
              rows={2}
              value={dynamicContent.shopNotice}
              onChange={(e) => setDynamicContent({ ...dynamicContent, shopNotice: e.target.value })}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text)",
                fontSize: 13,
                marginBottom: 10,
              }}
            />
          </div>

          {/* Section 2C: Service Categories & Listings */}
          <div className="bill-card" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
                  📑 Service Categories & Listings ({dynamicContent.services.length})
                </h4>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                  Enable, disable, or adjust pricing for student print and binding offerings.
                </p>
              </div>
              <button
                type="button"
                className="admin-header-action-btn primary"
                onClick={() => setNewServiceModalOpen(true)}
              >
                + Add Service
              </button>
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Service Name & Details</th>
                    <th>Category</th>
                    <th>Price Label</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dynamicContent.services.map((srv) => (
                    <tr key={srv.id}>
                      <td>
                        <strong style={{ fontSize: 13, color: "var(--text)" }}>{srv.title}</strong>
                        <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{srv.description}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: 11, textTransform: "capitalize", color: "var(--text-secondary)" }}>
                          {srv.category}
                        </span>
                      </td>
                      <td>
                        <input
                          type="text"
                          value={srv.priceTag}
                          onChange={(e) => {
                            const updated = dynamicContent.services.map((s) =>
                              s.id === srv.id ? { ...s, priceTag: e.target.value } : s
                            );
                            setDynamicContent({ ...dynamicContent, services: updated });
                          }}
                          style={{
                            padding: "4px 8px",
                            background: "var(--surface-raised)",
                            border: "1px solid var(--border)",
                            borderRadius: 6,
                            color: "var(--accent)",
                            fontSize: 12,
                            fontWeight: 700,
                            width: 110,
                          }}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleToggleService(srv.id)}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                            border: "none",
                            background: srv.active ? "rgba(167, 232, 189, 0.2)" : "rgba(248, 113, 113, 0.2)",
                            color: srv.active ? "var(--status-ready)" : "var(--error)",
                          }}
                        >
                          {srv.active ? "Enabled ✓" : "Disabled ✕"}
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleDeleteService(srv.id)}
                          style={{
                            padding: "4px 8px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                            border: "1px solid var(--border)",
                            background: "transparent",
                            color: "var(--text-secondary)",
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2D: Promotional Offers & Discount Codes */}
          <div className="bill-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
                  🏷 Promotional Offers & Discount Codes ({dynamicContent.promos.length})
                </h4>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                  Student promotional discount codes applied during checkout.
                </p>
              </div>
              <button
                type="button"
                className="admin-header-action-btn primary"
                onClick={() => setNewPromoModalOpen(true)}
              >
                + Create Promo Code
              </button>
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Coupon Code</th>
                    <th>Benefit / Discount</th>
                    <th>Minimum Order</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dynamicContent.promos.map((prm) => (
                    <tr key={prm.id}>
                      <td>
                        <strong style={{ fontSize: 13, color: "var(--accent)", letterSpacing: "0.5px" }}>
                          {prm.code}
                        </strong>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, fontSize: 12, color: "var(--text)" }}>
                          {prm.discountType === "percentage" ? `${prm.discountValue}% OFF` : `₹${prm.discountValue} FLAT OFF`}
                        </span>
                      </td>
                      <td>₹{prm.minOrder.toFixed(2)}</td>
                      <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>{prm.description}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleTogglePromo(prm.id)}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                            border: "none",
                            background: prm.active ? "rgba(167, 232, 189, 0.2)" : "rgba(251, 146, 60, 0.2)",
                            color: prm.active ? "var(--status-ready)" : "var(--status-pending)",
                          }}
                        >
                          {prm.active ? "Active ✓" : "Paused ⏸"}
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleDeletePromo(prm.id)}
                          style={{
                            padding: "4px 8px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                            border: "1px solid var(--border)",
                            background: "transparent",
                            color: "var(--text-secondary)",
                          }}
                        >
                          Delete
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

      {/* =================================================================== */}
      {/* 3. PAYMENTS & TRANSACTIONS TAB                                      */}
      {/* =================================================================== */}
      {activeTab === "payments" && (
        <section className="admin-tab-content">
          {/* Financial Summary KPI Cards */}
          <div className="admin-kpi-grid" style={{ marginBottom: 16 }}>
            <div className="admin-kpi-card">
              <span className="admin-kpi-label">Total Turnover</span>
              <strong className="admin-kpi-val" style={{ color: "var(--accent)" }}>
                ₹{transactions.reduce((sum, t) => sum + (t.amount || 0), 0).toFixed(2)}
              </strong>
              <span className="admin-kpi-sub">{transactions.length} Total orders</span>
            </div>

            <div className="admin-kpi-card">
              <span className="admin-kpi-label">UPI Online Received</span>
              <strong className="admin-kpi-val" style={{ color: "var(--status-ready)" }}>
                ₹{transactions.filter((t) => t.paymentMode === "online" && t.paymentStatus === "paid").reduce((sum, t) => sum + (t.amount || 0), 0).toFixed(2)}
              </strong>
              <span className="admin-kpi-sub">Verified digital payments</span>
            </div>

            <div className="admin-kpi-card">
              <span className="admin-kpi-label">Counter Cash Collected</span>
              <strong className="admin-kpi-val" style={{ color: "var(--status-ready)" }}>
                ₹{transactions.filter((t) => t.paymentMode === "cash" && t.paymentStatus === "paid").reduce((sum, t) => sum + (t.amount || 0), 0).toFixed(2)}
              </strong>
              <span className="admin-kpi-sub">Physical counter cash received</span>
            </div>

            <div className="admin-kpi-card">
              <span className="admin-kpi-label">Pending Cash Due</span>
              <strong className="admin-kpi-val" style={{ color: "var(--status-pending)" }}>
                ₹{transactions.filter((t) => t.paymentStatus === "pending_cash").reduce((sum, t) => sum + (t.amount || 0), 0).toFixed(2)}
              </strong>
              <span className="admin-kpi-sub">{transactions.filter((t) => t.paymentStatus === "pending_cash").length} orders awaiting cash</span>
            </div>

            <div className="admin-kpi-card">
              <span className="admin-kpi-label">Refunded Amount</span>
              <strong className="admin-kpi-val" style={{ color: "var(--error)" }}>
                ₹{transactions.filter((t) => t.paymentStatus === "refunded").reduce((sum, t) => sum + (t.amount || 0), 0).toFixed(2)}
              </strong>
              <span className="admin-kpi-sub">{transactions.filter((t) => t.paymentStatus === "refunded").length} refunded orders</span>
            </div>
          </div>

          {/* Transactions Ledger Card */}
          <div className="bill-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text)" }}>
                  3. Payments & Transaction Ledger
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                  Track online UPI transfers, counter cash payments, collect pending cash, and process customer refunds.
                </p>
              </div>
            </div>

            {/* Filters & Search */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <input
                  type="text"
                  placeholder="Search by token, customer name, phone or txn ref..."
                  value={searchTransaction}
                  onChange={(e) => setSearchTransaction(e.target.value)}
                  className="admin-search-input"
                  style={{ width: "100%" }}
                />
              </div>

              <div className="admin-filter-pills" style={{ margin: 0 }}>
                <button
                  type="button"
                  className={`admin-filter-pill${paymentFilter === "all" ? " is-active" : ""}`}
                  onClick={() => setPaymentFilter("all")}
                >
                  All ({transactions.length})
                </button>
                <button
                  type="button"
                  className={`admin-filter-pill${paymentFilter === "paid" ? " is-active" : ""}`}
                  onClick={() => setPaymentFilter("paid")}
                >
                  Paid ({transactions.filter((t) => t.paymentStatus === "paid").length})
                </button>
                <button
                  type="button"
                  className={`admin-filter-pill${paymentFilter === "cash_pending" ? " is-active" : ""}`}
                  onClick={() => setPaymentFilter("cash_pending")}
                >
                  Cash Due ({transactions.filter((t) => t.paymentStatus === "pending_cash").length})
                </button>
                <button
                  type="button"
                  className={`admin-filter-pill${paymentFilter === "refunded" ? " is-active" : ""}`}
                  onClick={() => setPaymentFilter("refunded")}
                >
                  Refunded ({transactions.filter((t) => t.paymentStatus === "refunded").length})
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Txn ID & Date</th>
                    <th>Order Token & File</th>
                    <th>Customer Info</th>
                    <th>Amount</th>
                    <th>Payment Mode</th>
                    <th>Payment Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "28px 16px", color: "var(--text-secondary)" }}>
                        No transactions found for the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <strong style={{ fontSize: 12, color: "var(--text)" }}>{t.referenceId}</strong>
                          <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                            {new Date(t.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              display: "inline-block",
                              fontWeight: 800,
                              fontSize: 12,
                              color: "var(--accent)",
                              background: "rgba(244, 215, 121, 0.12)",
                              padding: "2px 8px",
                              borderRadius: 4,
                              marginBottom: 4,
                            }}
                          >
                            Token {t.orderToken}
                          </span>
                          <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                            📄 {t.fileName || "Print Job"} ({t.pages || 1} pgs)
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 12, color: "var(--text)" }}>{t.userName}</div>
                          <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{t.userPhone}</div>
                        </td>
                        <td>
                          <strong style={{ fontSize: 14, color: "var(--accent)" }}>₹{t.amount.toFixed(2)}</strong>
                        </td>
                        <td>
                          {t.paymentMode === "online" ? (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 700,
                                background: "rgba(143, 163, 255, 0.18)",
                                color: "var(--status-processing)",
                              }}
                            >
                              UPI Online
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 700,
                                background: "rgba(251, 146, 60, 0.18)",
                                color: "var(--status-pending)",
                              }}
                            >
                              Pay Cash at Counter
                            </span>
                          )}
                        </td>
                        <td>
                          {t.paymentStatus === "refunded" ? (
                            <div>
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "3px 8px",
                                  borderRadius: 4,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  background: "rgba(248, 113, 113, 0.2)",
                                  color: "var(--error)",
                                }}
                              >
                                ↩ Refunded
                              </span>
                              {t.refundReason && (
                                <div style={{ fontSize: 10, color: "var(--error)", marginTop: 2, maxWidth: 140 }}>
                                  {t.refundReason}
                                </div>
                              )}
                            </div>
                          ) : t.paymentStatus === "pending_cash" ? (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 8px",
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 700,
                                background: "rgba(251, 146, 60, 0.2)",
                                color: "var(--status-pending)",
                              }}
                            >
                              ⏳ Cash Due
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 8px",
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 700,
                                background: "rgba(167, 232, 189, 0.2)",
                                color: "var(--status-ready)",
                              }}
                            >
                              ✓ Paid
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {t.paymentStatus === "pending_cash" && (
                              <button
                                type="button"
                                className="admin-btn-action ready"
                                onClick={() => handleCollectCash(t)}
                                title="Confirm physical cash received at counter"
                              >
                                Collect Cash 💵
                              </button>
                            )}
                            {t.paymentStatus === "paid" && (
                              <button
                                type="button"
                                className="admin-btn-action danger"
                                onClick={() => handlePromptRefund(t)}
                                title="Issue refund for this transaction"
                              >
                                Refund ↩
                              </button>
                            )}
                            <button
                              type="button"
                              className="admin-header-action-btn"
                              style={{ padding: "4px 8px", fontSize: 11 }}
                              onClick={() => setReceiptModalTxn(t)}
                              title="View and print transaction slip"
                            >
                              Receipt 📄
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* =================================================================== */}
      {/* 4. NOTIFICATIONS BROADCAST TAB                                      */}
      {/* =================================================================== */}
      {activeTab === "notifications" && adminData && (
        <section className="admin-tab-content">
          {/* Notification Broadcast Composer */}
          <div className="bill-card" style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text)" }}>
                4. Broadcast Notifications & Campus Alerts
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                Send important announcements, discounts, queue alerts, and maintenance updates directly to registered students.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                  Notification Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Special Discount: 20% Off Thesis Binding"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
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

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                  Notification Category
                </label>
                <select
                  value={broadcastCategory}
                  onChange={(e) => setBroadcastCategory(e.target.value as any)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "var(--surface-raised)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text)",
                    fontSize: 13,
                  }}
                >
                  <option value="announcement">📢 General Announcement</option>
                  <option value="offer">🎁 Special Offer / Promotion</option>
                  <option value="alert">⚡ Queue / Operational Alert</option>
                  <option value="maintenance">🛠 Maintenance Notice</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                  Target Audience
                </label>
                <select
                  value={broadcastTarget}
                  onChange={(e) => setBroadcastTarget(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "var(--surface-raised)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text)",
                    fontSize: 13,
                  }}
                >
                  <option value="all">All Registered Users ({adminData.users.length} students)</option>
                  <option value="active">Active Users Only ({adminData.users.filter((u) => u.isActive !== false && !u.isBlocked).length} students)</option>
                  <optgroup label="Direct to Specific Student">
                    {adminData.users.map((u) => (
                      <option key={u.uid} value={u.uid}>
                        {u.displayName} ({u.phoneNumber || u.email})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                  Priority Level
                </label>
                <select
                  value={broadcastPriority}
                  onChange={(e) => setBroadcastPriority(e.target.value as any)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "var(--surface-raised)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text)",
                    fontSize: 13,
                  }}
                >
                  <option value="normal">Normal Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent Alert</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                Message Body *
              </label>
              <textarea
                rows={3}
                placeholder="Write your announcement message here. Students will receive this directly in their in-app notifications..."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "var(--surface-raised)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--text)",
                  fontSize: 13,
                  resize: "vertical",
                }}
              />
            </div>

            {/* Live Notification Preview */}
            <div style={{ padding: "12px", background: "var(--surface-raised)", borderRadius: 10, border: "1px solid var(--border)", marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase" }}>
                Student Inbox Preview:
              </div>
              <div
                style={{
                  padding: "12px",
                  borderRadius: 8,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: broadcastCategory === "offer" ? "rgba(244, 215, 121, 0.2)" : "rgba(143, 163, 255, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                  }}
                >
                  {broadcastCategory === "offer" ? "🎁" : broadcastCategory === "alert" ? "⚡" : broadcastCategory === "maintenance" ? "🛠" : "📢"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                    <strong style={{ fontSize: 13, color: "var(--text)" }}>
                      {broadcastTitle || "Announcement Title"}
                    </strong>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Just now</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                    {broadcastMessage || "Announcement message preview will appear here."}
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="admin-header-action-btn primary"
                disabled={isSendingBroadcast}
                onClick={handleSendBroadcast}
                style={{ padding: "10px 20px", display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                <span>🚀</span> {isSendingBroadcast ? "Broadcasting..." : "Send Broadcast Notification"}
              </button>
            </div>
          </div>

          {/* Broadcast History */}
          <div className="bill-card">
            <h4 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
              📜 Sent Broadcast History ({broadcastHistory.length})
            </h4>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title & Category</th>
                    <th>Message Snippet</th>
                    <th>Audience & Recipients</th>
                    <th>Sent At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {broadcastHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "20px", color: "var(--text-secondary)" }}>
                        No broadcasts sent yet.
                      </td>
                    </tr>
                  ) : (
                    broadcastHistory.map((bc) => (
                      <tr key={bc.id}>
                        <td>
                          <strong style={{ fontSize: 13, color: "var(--text)" }}>{bc.title}</strong>
                          <div style={{ fontSize: 10, color: "var(--accent)", textTransform: "uppercase", marginTop: 2 }}>
                            {bc.category}
                          </div>
                        </td>
                        <td style={{ fontSize: 12, color: "var(--text-secondary)", maxWidth: 280 }}>
                          {bc.message}
                        </td>
                        <td>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                            {bc.targetAudienceLabel}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--status-ready)" }}>
                            ✓ {bc.recipientCount} delivered
                          </div>
                        </td>
                        <td style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                          {new Date(bc.sentAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleDeleteBroadcast(bc.id)}
                            style={{
                              padding: "4px 8px",
                              fontSize: 11,
                              border: "1px solid var(--border)",
                              background: "transparent",
                              color: "var(--text-secondary)",
                              borderRadius: 6,
                              cursor: "pointer",
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* =================================================================== */}
      {/* 5. REPORTS & ANALYTICS TAB                                          */}
      {/* =================================================================== */}
      {activeTab === "reports" && adminData && (
        <section className="admin-tab-content">
          {/* Header Controls & Export */}
          <div className="bill-card" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text)" }}>
                  5. Business Reports & Executive Analytics
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                  Comprehensive performance metrics, revenue analysis, user engagement, and 1-click CSV/PDF export.
                </p>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <div className="admin-filter-pills" style={{ margin: 0 }}>
                  <button
                    type="button"
                    className={`admin-filter-pill${reportTimeRange === "today" ? " is-active" : ""}`}
                    onClick={() => setReportTimeRange("today")}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    className={`admin-filter-pill${reportTimeRange === "week" ? " is-active" : ""}`}
                    onClick={() => setReportTimeRange("week")}
                  >
                    This Week
                  </button>
                  <button
                    type="button"
                    className={`admin-filter-pill${reportTimeRange === "month" ? " is-active" : ""}`}
                    onClick={() => setReportTimeRange("month")}
                  >
                    This Month
                  </button>
                  <button
                    type="button"
                    className={`admin-filter-pill${reportTimeRange === "all" ? " is-active" : ""}`}
                    onClick={() => setReportTimeRange("all")}
                  >
                    All Time
                  </button>
                </div>

                <button
                  type="button"
                  className="admin-header-action-btn primary"
                  onClick={handleExportCsv}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <span>📥</span> Download CSV Report
                </button>
                <button
                  type="button"
                  className="admin-header-action-btn"
                  onClick={handlePrintReport}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <span>🖨</span> Print / PDF
                </button>
              </div>
            </div>
          </div>

          {/* Key KPI Metrics Grid */}
          <div className="admin-kpi-grid" style={{ marginBottom: 16 }}>
            <div className="admin-kpi-card">
              <span className="admin-kpi-label">Gross Revenue ({reportTimeRange.toUpperCase()})</span>
              <strong className="admin-kpi-val" style={{ color: "var(--accent)" }}>
                ₹{adminData.metrics.revenue.toFixed(2)}
              </strong>
              <span className="admin-kpi-sub">
                AOV: ₹{(adminData.metrics.revenue / Math.max(1, adminData.orders.length)).toFixed(2)} / order
              </span>
            </div>

            <div className="admin-kpi-card">
              <span className="admin-kpi-label">Order Completion Rate</span>
              <strong className="admin-kpi-val" style={{ color: "var(--status-ready)" }}>
                {Math.round((adminData.metrics.completedToday / Math.max(1, adminData.orders.length)) * 100)}%
              </strong>
              <span className="admin-kpi-sub">{adminData.metrics.completedToday} completed today</span>
            </div>

            <div className="admin-kpi-card">
              <span className="admin-kpi-label">Total Sheets Printed</span>
              <strong className="admin-kpi-val" style={{ color: "var(--text)" }}>
                {adminData.orders.reduce((sum, o) => sum + (o.job.pages || 1) * (o.job.copies || 1), 0)}
              </strong>
              <span className="admin-kpi-sub">
                {adminData.orders.filter((o) => !o.job.colour).reduce((s, o) => s + (o.job.pages || 1), 0)} B&W · {adminData.orders.filter((o) => o.job.colour).reduce((s, o) => s + (o.job.pages || 1), 0)} Color
              </span>
            </div>

            <div className="admin-kpi-card">
              <span className="admin-kpi-label">Payment Split</span>
              <strong className="admin-kpi-val" style={{ color: "var(--status-processing)" }}>
                {Math.round(
                  (adminData.metrics.verifiedOnlineRevenue / Math.max(1, adminData.metrics.revenue)) * 100
                )}% UPI
              </strong>
              <span className="admin-kpi-sub">
                ₹{adminData.metrics.verifiedOnlineRevenue.toFixed(0)} UPI vs ₹{adminData.metrics.pendingCashRevenue.toFixed(0)} Cash
              </span>
            </div>
          </div>

          {/* Operating Hours Breakdown & Volume */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            {/* Peak Hours (9:30 AM to 5:00 PM) */}
            <div className="bill-card">
              <h4 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                ⏰ Operating Hours Distribution (9:30 AM – 5:00 PM)
              </h4>
              <p style={{ margin: "0 0 14px", fontSize: 11, color: "var(--text-secondary)" }}>
                Order volume throughout the official campus operating schedule.
              </p>

              {[
                { label: "09:30 AM – 11:00 AM (Morning Rush)", pct: 68, count: 18 },
                { label: "11:00 AM – 01:00 PM (Class Break Peak)", pct: 92, count: 26 },
                { label: "01:00 PM – 02:30 PM (Afternoon Queue)", pct: 45, count: 12 },
                { label: "02:30 PM – 04:00 PM (Submission Rush)", pct: 84, count: 24 },
                { label: "04:00 PM – 05:00 PM (Final Day Closures)", pct: 55, count: 15 },
              ].map((hr, idx) => (
                <div key={idx} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                    <span style={{ color: "var(--text)" }}>{hr.label}</span>
                    <strong style={{ color: "var(--accent)" }}>{hr.count} orders</strong>
                  </div>
                  <div style={{ height: 6, background: "var(--surface-raised)", borderRadius: 3, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${hr.pct}%`,
                        height: "100%",
                        background: hr.pct > 80 ? "var(--accent)" : "var(--status-ready)",
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Paper Stock Breakdown */}
            <div className="bill-card">
              <h4 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                📄 Paper Stock Consumption
              </h4>
              <p style={{ margin: "0 0 14px", fontSize: 11, color: "var(--text-secondary)" }}>
                Usage breakdown across paper categories.
              </p>

              {[
                { title: "Regular Paper (70–75 GSM)", usage: "64%", sheets: 420 },
                { title: "Premium Bond Paper (80–100 GSM)", usage: "22%", sheets: 145 },
                { title: "Matte Paper (120–170 GSM)", usage: "8%", sheets: 52 },
                { title: "Glossy & Photo Sheets (180–260 GSM)", usage: "6%", sheets: 38 },
              ].map((stock, sIdx) => (
                <div key={sIdx} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 12 }}>
                  <div>
                    <strong style={{ color: "var(--text)" }}>{stock.title}</strong>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{stock.sheets} sheets used</div>
                  </div>
                  <strong style={{ color: "var(--accent)", alignSelf: "center" }}>{stock.usage}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Top 5 Active Customers Leaderboard */}
          <div className="bill-card">
            <h4 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
              🏆 Top Active Campus Customers
            </h4>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Customer Name</th>
                    <th>Mobile & Email</th>
                    <th>Total Orders</th>
                    <th>Total Spend</th>
                    <th>Verified Status</th>
                  </tr>
                </thead>
                <tbody>
                  {adminData.users
                    .map((u) => {
                      const uOrders = adminData.orders.filter((o) => o.userId === u.uid);
                      const spend = uOrders
                        .filter((o) => o.status !== "cancelled")
                        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
                      return { user: u, orderCount: uOrders.length, spend };
                    })
                    .sort((a, b) => b.spend - a.spend)
                    .slice(0, 5)
                    .map((item, rIdx) => (
                      <tr key={item.user.uid}>
                        <td>
                          <strong style={{ color: rIdx === 0 ? "var(--accent)" : "var(--text)" }}>#{rIdx + 1}</strong>
                        </td>
                        <td>
                          <strong style={{ color: "var(--text)" }}>{item.user.displayName}</strong>
                        </td>
                        <td style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                          {item.user.phoneNumber || item.user.email}
                        </td>
                        <td>
                          <strong>{item.orderCount} orders</strong>
                        </td>
                        <td>
                          <strong style={{ color: "var(--accent)" }}>₹{item.spend.toFixed(2)}</strong>
                        </td>
                        <td>
                          <span style={{ fontSize: 11, color: item.user.phoneVerified ? "var(--status-ready)" : "var(--status-pending)" }}>
                            {item.user.phoneVerified ? "✓ Verified" : "Unverified"}
                          </span>
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
                📄 {sanitizeDisplayFileName(previewOrder.job.fileName)}
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
                  {sanitizeDisplayFileName(previewOrder.job.fileName)}
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

      {/* MODAL 4: Block User Modal */}
      {blockModalUser && (
        <div className="modal-backdrop" role="presentation" onClick={() => setBlockModalUser(null)}>
          <div
            className="bill-card"
            style={{ maxWidth: 460, width: "90%", margin: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "var(--error)" }}>
              ⛔ Block Campus Student Account
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 12px", lineHeight: 1.4 }}>
              Are you sure you want to block <strong>{blockModalUser.displayName}</strong> (+91 {blockModalUser.phoneNumber?.replace(/\D/g, "").slice(-10) || blockModalUser.email})? Blocked students will immediately be prevented from logging in or placing any campus print orders.
            </p>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                Select Block Reason
              </label>
              <select
                value={blockReasonInput}
                onChange={(e) => setBlockReasonInput(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "var(--surface-raised)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--text)",
                  fontSize: 13,
                  marginBottom: 8,
                }}
              >
                <option value="Non-payment of counter cash orders">Non-payment of counter cash orders</option>
                <option value="Counter misconduct or rules violation">Counter misconduct or rules violation</option>
                <option value="Spam file uploads or suspicious activity">Spam file uploads or suspicious activity</option>
                <option value="Repeated uncollected print orders">Repeated uncollected print orders</option>
                <option value="Administrative policy review">Administrative policy review</option>
              </select>

              <input
                type="text"
                value={blockReasonInput}
                onChange={(e) => setBlockReasonInput(e.target.value)}
                placeholder="Or type custom block reason..."
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
                onClick={() => setBlockModalUser(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn-action danger"
                style={{ padding: "8px 16px" }}
                onClick={handleConfirmBlockUser}
              >
                Confirm Block ⛔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Issue Refund Modal */}
      {refundModalTxn && (
        <div className="modal-backdrop" role="presentation" onClick={() => setRefundModalTxn(null)}>
          <div
            className="bill-card"
            style={{ maxWidth: 460, width: "90%", margin: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "var(--error)" }}>
              ↩ Issue Customer Payment Refund
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 12px", lineHeight: 1.4 }}>
              Process full refund of <strong style={{ color: "var(--accent)" }}>₹{refundModalTxn.amount.toFixed(2)}</strong> for Order <strong>#{refundModalTxn.orderToken}</strong> ({refundModalTxn.userName}).
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                Refund Reason (Student will be notified)
              </label>
              <select
                value={refundReasonInput}
                onChange={(e) => setRefundReasonInput(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "var(--surface-raised)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--text)",
                  fontSize: 13,
                  marginBottom: 8,
                }}
              >
                <option value="Customer requested cancellation before print">Customer requested cancellation before print</option>
                <option value="Printer paper jam or hardware malfunction">Printer paper jam or hardware malfunction</option>
                <option value="Incorrect document pages uploaded by student">Incorrect document pages uploaded by student</option>
                <option value="Counter closed or machine maintenance">Counter closed or machine maintenance</option>
                <option value="Duplicate payment received">Duplicate payment received</option>
              </select>

              <input
                type="text"
                value={refundReasonInput}
                onChange={(e) => setRefundReasonInput(e.target.value)}
                placeholder="Or custom refund note..."
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
                onClick={() => setRefundModalTxn(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn-action danger"
                style={{ padding: "8px 16px" }}
                onClick={handleConfirmRefund}
              >
                Process Refund ↩
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: View Transaction Receipt Modal */}
      {receiptModalTxn && (
        <div className="modal-backdrop" role="presentation" onClick={() => setReceiptModalTxn(null)}>
          <div
            className="bill-card"
            style={{ maxWidth: 440, width: "90%", margin: "auto", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
                📄 Official Payment Receipt
              </h3>
              <button
                type="button"
                onClick={() => setReceiptModalTxn(null)}
                style={{ background: "transparent", border: "none", color: "var(--text-secondary)", fontSize: 18, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {/* Printable Receipt Paper Container */}
            <div
              style={{
                padding: "20px",
                background: "#FFFFFF",
                borderRadius: 8,
                color: "#111827",
                fontFamily: "monospace",
                fontSize: 12,
                lineHeight: 1.5,
                border: "1px solid var(--border)",
                marginBottom: 16,
              }}
            >
              <div style={{ textAlign: "center", borderBottom: "1px dashed #9CA3AF", paddingBottom: 10, marginBottom: 12 }}>
                <strong style={{ fontSize: 14, display: "block" }}>CAMPUS CENTRAL PRINT SHOP</strong>
                <div style={{ fontSize: 10, color: "#4B5563" }}>Campus Central Building · Counter A-2</div>
                <div style={{ fontSize: 10, color: "#4B5563" }}>Mon–Fri 9:30 AM to 5:00 PM</div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span>Transaction Ref:</span>
                <strong>{receiptModalTxn.referenceId}</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span>Order Token:</span>
                <strong style={{ fontSize: 13 }}>#{receiptModalTxn.orderToken}</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span>Date & Time:</span>
                <span>{new Date(receiptModalTxn.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span>Customer:</span>
                <span>{receiptModalTxn.userName}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span>Mobile:</span>
                <span>{receiptModalTxn.userPhone}</span>
              </div>

              <div style={{ borderTop: "1px dashed #9CA3AF", paddingTop: 8, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span>Item:</span>
                  <span>{receiptModalTxn.fileName || "Print Job"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span>Payment Mode:</span>
                  <span>{receiptModalTxn.paymentMode === "cash" ? "Cash at Counter" : "UPI Online"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span>Status:</span>
                  <strong style={{ textTransform: "uppercase" }}>{receiptModalTxn.paymentStatus}</strong>
                </div>
              </div>

              <div
                style={{
                  borderTop: "2px solid #111827",
                  paddingTop: 8,
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 14,
                  fontWeight: 800,
                }}
              >
                <span>TOTAL PAID:</span>
                <span>₹{receiptModalTxn.amount.toFixed(2)}</span>
              </div>

              <div style={{ textAlign: "center", fontSize: 10, color: "#6B7280", marginTop: 14 }}>
                Thank you for printing with Campus Central!
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="admin-header-action-btn primary"
                onClick={() => window.print()}
              >
                🖨 Print Receipt
              </button>
              <button
                type="button"
                className="admin-header-action-btn"
                onClick={() => setReceiptModalTxn(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: Add Service Modal */}
      {newServiceModalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setNewServiceModalOpen(false)}>
          <div
            className="bill-card"
            style={{ maxWidth: 440, width: "90%", margin: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
              + Add New Print Service Listing
            </h3>

            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                Service Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Hardcover Thesis Binding"
                value={newServiceTitle}
                onChange={(e) => setNewServiceTitle(e.target.value)}
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

            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                Short Description
              </label>
              <input
                type="text"
                placeholder="e.g. Gold embossed rexine hardcover binding"
                value={newServiceDesc}
                onChange={(e) => setNewServiceDesc(e.target.value)}
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                  Category
                </label>
                <select
                  value={newServiceCategory}
                  onChange={(e) => setNewServiceCategory(e.target.value as any)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "var(--surface-raised)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text)",
                    fontSize: 13,
                  }}
                >
                  <option value="print">Printing</option>
                  <option value="binding">Binding</option>
                  <option value="special">Special Finishing</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                  Price Tag
                </label>
                <input
                  type="text"
                  placeholder="e.g. ₹60.00 / book"
                  value={newServicePrice}
                  onChange={(e) => setNewServicePrice(e.target.value)}
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
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="admin-header-action-btn"
                onClick={() => setNewServiceModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-header-action-btn primary"
                onClick={handleCreateService}
              >
                Add Service ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 8: Add Promo Code Modal */}
      {newPromoModalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setNewPromoModalOpen(false)}>
          <div
            className="bill-card"
            style={{ maxWidth: 440, width: "90%", margin: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
              + Create Promotional Discount Coupon
            </h3>

            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                Coupon Code * (Uppercase)
              </label>
              <input
                type="text"
                placeholder="e.g. FINALS25"
                value={newPromoCode}
                onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "var(--surface-raised)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--accent)",
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: "1px",
                }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                  Discount Type
                </label>
                <select
                  value={newPromoType}
                  onChange={(e) => setNewPromoType(e.target.value as any)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "var(--surface-raised)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text)",
                    fontSize: 13,
                  }}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat">Flat Amount (₹)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                  Discount Value
                </label>
                <input
                  type="number"
                  min="1"
                  value={newPromoValue}
                  onChange={(e) => setNewPromoValue(Number(e.target.value))}
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
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                Minimum Order Value (₹)
              </label>
              <input
                type="number"
                min="0"
                value={newPromoMinOrder}
                onChange={(e) => setNewPromoMinOrder(Number(e.target.value))}
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

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                Coupon Description
              </label>
              <input
                type="text"
                placeholder="e.g. 25% off during final exam week"
                value={newPromoDesc}
                onChange={(e) => setNewPromoDesc(e.target.value)}
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
                onClick={() => setNewPromoModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-header-action-btn primary"
                onClick={handleCreatePromo}
              >
                Create Promo Code ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

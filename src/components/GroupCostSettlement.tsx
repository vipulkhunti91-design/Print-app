import React, { useState, useMemo } from "react";

export type GroupMember = {
  id: string;
  name: string;
  assignedPages: number;
  assignedCopies: number;
  amount: number;
  status: "verified" | "pending";
};

interface GroupCostSettlementProps {
  grandTotal: number;
  totalPages: number;
  pricePerSheet: number;
  onSettlementComplete?: (allPaid: boolean) => void;
}

const MAX_MEMBERS = 6;

export function GroupCostSettlement({
  grandTotal,
  totalPages,
  pricePerSheet,
  onSettlementComplete,
}: GroupCostSettlementProps) {
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [members, setMembers] = useState<GroupMember[]>([
    {
      id: "mem-1",
      name: "Member 1 (You)",
      assignedPages: Math.max(1, Math.ceil(totalPages / 2)),
      assignedCopies: 1,
      amount: Math.round((grandTotal / 2) * 100) / 100,
      status: "verified",
    },
    {
      id: "mem-2",
      name: "Member 2",
      assignedPages: Math.max(1, Math.floor(totalPages / 2)),
      assignedCopies: 1,
      amount: Math.round((grandTotal - Math.round((grandTotal / 2) * 100) / 100) * 100) / 100,
      status: "pending",
    },
  ]);

  // Recalculate shares when members, grandTotal, or splitMode changes
  const recalculatedMembers = useMemo(() => {
    const count = members.length;
    if (count === 0) return [];

    if (splitMode === "equal") {
      const baseShare = Math.floor((grandTotal / count) * 100) / 100;
      let remainder = Math.round((grandTotal - baseShare * count) * 100) / 100;

      return members.map((m) => {
        let memberAmount = baseShare;
        if (remainder > 0.001) {
          memberAmount = Math.round((memberAmount + 0.01) * 100) / 100;
          remainder = Math.round((remainder - 0.01) * 100) / 100;
        }
        return {
          ...m,
          amount: memberAmount,
        };
      });
    } else {
      // Custom / Page-based split
      const totalWeight = members.reduce(
        (sum, m) => sum + Math.max(1, m.assignedPages * m.assignedCopies),
        0
      );
      let runningTotal = 0;
      return members.map((m, idx) => {
        const weight = Math.max(1, m.assignedPages * m.assignedCopies);
        let calculatedAmount = 0;
        if (idx === members.length - 1) {
          calculatedAmount = Math.max(0, Math.round((grandTotal - runningTotal) * 100) / 100);
        } else {
          calculatedAmount = Math.round(((weight / totalWeight) * grandTotal) * 100) / 100;
          runningTotal += calculatedAmount;
        }
        return {
          ...m,
          amount: calculatedAmount,
        };
      });
    }
  }, [members, grandTotal, splitMode]);

  const verifiedAmount = recalculatedMembers
    .filter((m) => m.status === "verified")
    .reduce((sum, m) => sum + m.amount, 0);

  const outstandingBalance = Math.max(0, Math.round((grandTotal - verifiedAmount) * 100) / 100);

  const handleAddMember = () => {
    if (members.length >= MAX_MEMBERS) return;
    const nextIdx = members.length + 1;
    const newMember: GroupMember = {
      id: `mem-${Date.now()}`,
      name: `Member ${nextIdx}`,
      assignedPages: 1,
      assignedCopies: 1,
      amount: 0,
      status: "pending",
    };
    setMembers((prev) => [...prev, newMember]);
  };

  const handleRemoveMember = (id: string) => {
    if (members.length <= 2) return;
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleUpdateQuantity = (id: string, pages: number, copies: number) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, assignedPages: Math.max(1, pages), assignedCopies: Math.max(1, copies) }
          : m
      )
    );
  };

  const handleToggleVerified = (id: string) => {
    setMembers((prev) => {
      const updated = prev.map((m) =>
        m.id === id
          ? { ...m, status: (m.status === "verified" ? "pending" : "verified") as "verified" | "pending" }
          : m
      );
      const allDone = updated.every((m) => m.status === "verified");
      onSettlementComplete?.(allDone);
      return updated;
    });
  };

  const handleShareWhatsApp = (mem: GroupMember) => {
    const shareText = `🎓 Campus Print Settlement: Your share for our group print order is ₹${mem.amount.toFixed(2)} (Total: ₹${grandTotal.toFixed(2)}). Please verify when sent!`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, "_blank");
  };

  const handleCopyLink = async (mem: GroupMember) => {
    const shareText = `Campus Print Settlement: Your share is ₹${mem.amount.toFixed(2)} (Total: ₹${grandTotal.toFixed(2)})`;
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedId(mem.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      alert(shareText);
    }
  };

  if (!isGroupMode) {
    return (
      <div
        className="group-split-banner"
        style={{
          background: "rgba(244, 215, 121, 0.05)",
          border: "1px dashed rgba(244, 215, 121, 0.3)",
          borderRadius: 14,
          padding: "12px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          margin: "0 0 16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>👥</span>
          <div>
            <strong style={{ fontSize: 13, color: "var(--text)", display: "block" }}>
              Split with Project Group
            </strong>
            <small style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              Share print costs with group members (max {MAX_MEMBERS} people)
            </small>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsGroupMode(true)}
          style={{
            background: "var(--accent)",
            color: "#0A0A0A",
            border: "none",
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(244, 215, 121, 0.2)",
          }}
        >
          Enable Split
        </button>
      </div>
    );
  }

  return (
    <div
      className="group-settlement-card"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "14px",
        margin: "0 0 16px",
      }}
    >
      {/* Header with Cancel */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>👥</span>
          <div>
            <strong style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", display: "block" }}>
              Group Print Order Settlement
            </strong>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Split total ₹{grandTotal.toFixed(2)} among {members.length} members
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsGroupMode(false)}
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--text-secondary)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            padding: "4px 10px",
            transition: "all 120ms ease",
          }}
        >
          ✕ Cancel Split
        </button>
      </div>

      {/* Split Mode Selector (Equal vs Custom) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 6,
          background: "rgba(0, 0, 0, 0.25)",
          padding: 4,
          borderRadius: 8,
          marginBottom: 12,
        }}
      >
        <button
          type="button"
          onClick={() => setSplitMode("equal")}
          style={{
            padding: "6px 8px",
            fontSize: 12,
            fontWeight: 700,
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            background: splitMode === "equal" ? "var(--accent)" : "transparent",
            color: splitMode === "equal" ? "#0A0A0A" : "var(--text-secondary)",
            transition: "all 120ms ease",
          }}
        >
          Equal Split (Recommended)
        </button>
        <button
          type="button"
          onClick={() => setSplitMode("custom")}
          style={{
            padding: "6px 8px",
            fontSize: 12,
            fontWeight: 700,
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            background: splitMode === "custom" ? "var(--accent)" : "transparent",
            color: splitMode === "custom" ? "#0A0A0A" : "var(--text-secondary)",
            transition: "all 120ms ease",
          }}
        >
          Custom by Pages
        </button>
      </div>

      {/* Group Balances Overview */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 8,
          marginBottom: 12,
          background: "rgba(0, 0, 0, 0.2)",
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        <div>
          <span style={{ fontSize: 10.5, color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>
            Total Combined
          </span>
          <strong style={{ fontSize: 16, color: "var(--text)", display: "block", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
            ₹{grandTotal.toFixed(2)}
          </strong>
        </div>
        <div>
          <span style={{ fontSize: 10.5, color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>
            Outstanding Balance
          </span>
          <strong
            style={{
              fontSize: 16,
              color: outstandingBalance <= 0.01 ? "var(--status-ready)" : "var(--error)",
              display: "block",
              marginTop: 2,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {outstandingBalance <= 0.01 ? "✓ All Shares Verified" : `₹${outstandingBalance.toFixed(2)}`}
          </strong>
        </div>
      </div>

      {/* Member Roster (Bounded & Scrollable) */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 12,
          maxHeight: 250,
          overflowY: "auto",
          paddingRight: 4,
        }}
      >
        {recalculatedMembers.map((mem, idx) => (
          <div
            key={mem.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 12px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.07)",
              borderRadius: 10,
              gap: 8,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <strong style={{ fontSize: 13, color: "var(--text)" }}>
                  {idx === 0 ? "Member 1 (You)" : mem.name || `Member ${idx + 1}`}
                </strong>
                {idx > 0 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(mem.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--error)",
                      fontSize: 12,
                      cursor: "pointer",
                      padding: "0 4px",
                      opacity: 0.8,
                    }}
                    title="Remove member"
                  >
                    ✕
                  </button>
                )}
              </div>

              {splitMode === "custom" && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <label style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                    Pgs:
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={mem.assignedPages}
                      onChange={(e) =>
                        handleUpdateQuantity(mem.id, parseInt(e.target.value) || 1, mem.assignedCopies)
                      }
                      style={{
                        width: 44,
                        marginLeft: 4,
                        background: "#1c1c1c",
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                        borderRadius: 4,
                        padding: "2px 4px",
                        fontSize: 11,
                      }}
                    />
                  </label>
                  <label style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                    Cp:
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={mem.assignedCopies}
                      onChange={(e) =>
                        handleUpdateQuantity(mem.id, mem.assignedPages, parseInt(e.target.value) || 1)
                      }
                      style={{
                        width: 40,
                        marginLeft: 4,
                        background: "#1c1c1c",
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                        borderRadius: 4,
                        padding: "2px 4px",
                        fontSize: 11,
                      }}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Price Column */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: "var(--accent)",
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.01em",
                }}
              >
                ₹{mem.amount.toFixed(2)}
              </span>

              {/* Status Verification Toggle */}
              <button
                type="button"
                onClick={() => handleToggleVerified(mem.id)}
                style={{
                  background:
                    mem.status === "verified" ? "rgba(167, 232, 189, 0.15)" : "rgba(244, 215, 121, 0.12)",
                  border: "1px solid",
                  borderColor:
                    mem.status === "verified" ? "var(--status-ready)" : "rgba(244, 215, 121, 0.3)",
                  color: mem.status === "verified" ? "var(--status-ready)" : "var(--accent)",
                  borderRadius: 6,
                  padding: "5px 9px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {mem.status === "verified" ? "✓ Verified" : "⏳ Pending"}
              </button>

              {/* Quick WhatsApp Share for Pending Members */}
              {idx > 0 && mem.status === "pending" && (
                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(mem)}
                  style={{
                    background: "rgba(37, 211, 102, 0.12)",
                    border: "1px solid rgba(37, 211, 102, 0.3)",
                    color: "#25D366",
                    borderRadius: 6,
                    padding: "5px 7px",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                  title="Share payment request via WhatsApp"
                  aria-label="Share via WhatsApp"
                >
                  💬
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Member Controls (Capped at MAX_MEMBERS) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 4,
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        <span style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
          {members.length >= MAX_MEMBERS ? (
            <span style={{ color: "var(--accent)" }}>Maximum {MAX_MEMBERS} group members reached</span>
          ) : (
            `Team: ${members.length} of ${MAX_MEMBERS} members`
          )}
        </span>

        <button
          type="button"
          onClick={handleAddMember}
          disabled={members.length >= MAX_MEMBERS}
          style={{
            background: members.length >= MAX_MEMBERS ? "rgba(255, 255, 255, 0.05)" : "var(--accent)",
            color: members.length >= MAX_MEMBERS ? "var(--text-muted)" : "#0A0A0A",
            border: "none",
            borderRadius: 8,
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 700,
            cursor: members.length >= MAX_MEMBERS ? "not-allowed" : "pointer",
            whiteSpace: "nowrap",
            transition: "all 120ms ease",
          }}
        >
          + Add Member
        </button>
      </div>

      {grandTotal <= 2.0 && members.length > 2 && (
        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "8px 0 0", fontStyle: "italic" }}>
          💡 Note: For ₹{grandTotal.toFixed(2)} orders, equal 2-way split (₹1.00 each) is recommended for UPI transactions.
        </p>
      )}
    </div>
  );
}

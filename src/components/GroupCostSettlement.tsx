import React, { useState } from "react";

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

export function GroupCostSettlement({
  grandTotal,
  totalPages,
  pricePerSheet,
  onSettlementComplete,
}: GroupCostSettlementProps) {
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [memberPages, setMemberPages] = useState<number>(Math.max(1, Math.round(totalPages / 2)));
  const [memberCopies, setMemberCopies] = useState<number>(1);

  const initialShare = Math.round((grandTotal / 2) * 100) / 100;

  const [members, setMembers] = useState<GroupMember[]>([
    {
      id: "mem-1",
      name: "You (Organizer)",
      assignedPages: Math.max(1, Math.ceil(totalPages / 2)),
      assignedCopies: 1,
      amount: initialShare,
      status: "verified",
    },
    {
      id: "mem-2",
      name: "Sahil Mehta",
      assignedPages: Math.max(1, Math.floor(totalPages / 2)),
      assignedCopies: 1,
      amount: Math.round((grandTotal - initialShare) * 100) / 100,
      status: "pending",
    },
  ]);

  if (!isGroupMode) {
    return (
      <div
        className="group-split-banner"
        style={{
          background: "rgba(244, 215, 121, 0.05)",
          border: "1px dashed rgba(244, 215, 121, 0.3)",
          borderRadius: 12,
          padding: "10px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          margin: "12px 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>👥</span>
          <div>
            <strong style={{ fontSize: 13, color: "var(--text)", display: "block" }}>
              Split with Project Group
            </strong>
            <small style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              Share cost with classmates via individual UPI payment links
            </small>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsGroupMode(true)}
          style={{
            background: "var(--accent)",
            color: "var(--on-accent)",
            border: "none",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Enable Split
        </button>
      </div>
    );
  }

  // Calculate actual individual share using item unit pricing
  const recalculateShares = (currentMembers: Omit<GroupMember, "amount">[]) => {
    const totalAssignedWeight = currentMembers.reduce(
      (sum, m) => sum + Math.max(1, m.assignedPages * m.assignedCopies),
      0
    );

    let runningTotal = 0;
    return currentMembers.map((m, idx) => {
      const weight = Math.max(1, m.assignedPages * m.assignedCopies);
      let calculatedAmount = 0;
      if (idx === currentMembers.length - 1) {
        // Last member absorbs rounding difference so sum equals grandTotal exactly
        calculatedAmount = Math.max(0, Math.round((grandTotal - runningTotal) * 100) / 100);
      } else {
        calculatedAmount = Math.round(((weight / totalAssignedWeight) * grandTotal) * 100) / 100;
        runningTotal += calculatedAmount;
      }
      return {
        ...m,
        amount: calculatedAmount,
      };
    });
  };

  const verifiedAmount = members
    .filter((m) => m.status === "verified")
    .reduce((sum, m) => sum + m.amount, 0);

  const outstandingBalance = Math.max(0, Math.round((grandTotal - verifiedAmount) * 100) / 100);

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    const baseList: Omit<GroupMember, "amount">[] = [
      ...members.map(({ amount, ...rest }) => rest),
      {
        id: `mem-${Date.now()}`,
        name: newMemberName.trim(),
        assignedPages: memberPages || 1,
        assignedCopies: memberCopies || 1,
        status: "pending" as const,
      },
    ];

    const updated = recalculateShares(baseList);
    setMembers(updated);
    setNewMemberName("");
  };

  const handleRemoveMember = (id: string) => {
    if (members.length <= 1) return;
    const filtered = members.filter((m) => m.id !== id).map(({ amount, ...rest }) => rest);
    const updated = recalculateShares(filtered);
    setMembers(updated);
  };

  const handleUpdateMemberQuantity = (id: string, pages: number, copies: number) => {
    const updatedBase = members.map((m) => {
      if (m.id === id) {
        return {
          ...m,
          assignedPages: Math.max(1, pages),
          assignedCopies: Math.max(1, copies),
        };
      }
      return m;
    }).map(({ amount, ...rest }) => rest);

    setMembers(recalculateShares(updatedBase));
  };

  const handleToggleVerified = (id: string) => {
    setMembers((prev) => {
      const next = prev.map((m) =>
        m.id === id ? { ...m, status: m.status === "verified" ? ("pending" as const) : ("verified" as const) } : m
      );
      const allDone = next.every((m) => m.status === "verified");
      onSettlementComplete?.(allDone);
      return next;
    });
  };

  return (
    <div
      className="group-settlement-card"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "14px",
        margin: "12px 0 16px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 18 }}>👥</span>
          <div>
            <strong style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", display: "block" }}>
              Group Print Order Settlement
            </strong>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Exact per-member shares calculated via live order pricing
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsGroupMode(false)}
          style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }}
        >
          ✕ Cancel Split
        </button>
      </div>

      {/* Group Balances Overview */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 8,
          marginBottom: 12,
          background: "rgba(0, 0, 0, 0.25)",
          padding: "10px",
          borderRadius: 10,
        }}
      >
        <div>
          <span style={{ fontSize: 10.5, color: "var(--text-secondary)", textTransform: "uppercase" }}>
            Total Combined
          </span>
          <strong style={{ fontSize: 15, color: "var(--text)", display: "block" }}>
            ₹{grandTotal.toFixed(2)}
          </strong>
        </div>
        <div>
          <span style={{ fontSize: 10.5, color: "var(--text-secondary)", textTransform: "uppercase" }}>
            Outstanding Balance
          </span>
          <strong
            style={{
              fontSize: 15,
              color: outstandingBalance <= 0.01 ? "var(--status-ready)" : "var(--error)",
              display: "block",
            }}
          >
            {outstandingBalance <= 0.01 ? "✓ All Shares Paid" : `₹${outstandingBalance.toFixed(2)}`}
          </strong>
        </div>
      </div>

      {/* Member Roster */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {members.map((mem) => (
          <div
            key={mem.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 12px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.07)",
              borderRadius: 8,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <strong style={{ fontSize: 12.5, color: "var(--text)" }}>
                  {mem.name}
                </strong>
                {mem.id !== "mem-1" && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(mem.id)}
                    style={{ background: "none", border: "none", color: "var(--error)", fontSize: 11, cursor: "pointer", padding: "0 4px" }}
                    title="Remove member"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <label style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                  Pgs:
                  <input
                    type="number"
                    min={1}
                    value={mem.assignedPages}
                    onChange={(e) => handleUpdateMemberQuantity(mem.id, parseInt(e.target.value) || 1, mem.assignedCopies)}
                    style={{ width: 44, marginLeft: 4, background: "#1c1c1c", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 4, padding: "2px 4px", fontSize: 11 }}
                  />
                </label>
                <label style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                  Cp:
                  <input
                    type="number"
                    min={1}
                    value={mem.assignedCopies}
                    onChange={(e) => handleUpdateMemberQuantity(mem.id, mem.assignedPages, parseInt(e.target.value) || 1)}
                    style={{ width: 40, marginLeft: 4, background: "#1c1c1c", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 4, padding: "2px 4px", fontSize: 11 }}
                  />
                </label>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--accent)", marginLeft: "auto" }}>
                  ₹{mem.amount.toFixed(2)}
                </span>
              </div>
            </div>

            <div style={{ marginLeft: 12 }}>
              <button
                type="button"
                onClick={() => handleToggleVerified(mem.id)}
                style={{
                  background: mem.status === "verified" ? "rgba(167, 232, 189, 0.15)" : "rgba(244, 215, 121, 0.12)",
                  border: "1px solid",
                  borderColor: mem.status === "verified" ? "var(--status-ready)" : "rgba(244, 215, 121, 0.3)",
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
            </div>
          </div>
        ))}
      </div>

      {/* Add Member Form */}
      <form onSubmit={handleAddMember} style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          type="text"
          placeholder="Classmate name..."
          value={newMemberName}
          onChange={(e) => setNewMemberName(e.target.value)}
          style={{
            flex: 2,
            height: 34,
            background: "#1c1c1c",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "0 10px",
            fontSize: 12,
            color: "var(--text)",
            outline: "none",
          }}
        />
        <input
          type="number"
          placeholder="Pgs"
          min={1}
          value={memberPages}
          onChange={(e) => setMemberPages(parseInt(e.target.value) || 1)}
          style={{
            width: 50,
            height: 34,
            background: "#1c1c1c",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "0 6px",
            fontSize: 12,
            color: "var(--text)",
            outline: "none",
          }}
          title="Assigned document pages"
        />
        <button
          type="submit"
          style={{
            background: "var(--accent)",
            color: "var(--on-accent)",
            border: "none",
            borderRadius: 8,
            padding: "0 12px",
            height: 34,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          + Invite
        </button>
      </form>
    </div>
  );
}

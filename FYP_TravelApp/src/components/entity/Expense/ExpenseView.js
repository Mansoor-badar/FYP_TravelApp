import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import API from "../../API/API";
import Button, { ButtonTray } from "../../UI/Button";
import { ProfileCard } from "../Profile/ProfileView";
import { formatDate } from "../../../utils/DateUtils";

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Status metadata.
 *
 * DB only allows: 'pending' and 'paid'.
 * Flow:
 *   pending → debtor presses "I've Paid"        → paid
 *   paid    → payer presses "Verify & Delete"    → hard delete (expense is settled)
 *   paid    → payer presses "Dispute"            → pending  (debtor hasn't paid)
 */
const STATUS_META = {
  pending: { label: "⏳ Pending",           bg: "#fff8e1", color: "#b45309" },
  paid:    { label: "💳 Payment Submitted", bg: "#e3f2fd", color: "#1565c0" },
};

const fmt = (amount) => `£${parseFloat(amount ?? 0).toFixed(2)}`;

// ── ExpenseDetail ─────────────────────────────────────────────────────────────

/**
 * ExpenseDetail
 *
 * Full detail view of a single expense row.
 *
 * Props:
 *   expense       – enriched expense row.  Must include:
 *                     payerProfile  – full profile object for the payer
 *                     debtorProfile – full profile object for the debtor
 *   currentUserId – UUID of the logged-in user
 */
const ExpenseDetail = ({ expense, currentUserId }) => {
  if (!expense) return null;

  const status     = expense.settlement_status ?? "pending";
  const meta       = STATUS_META[status] ?? STATUS_META.pending;
  const isPayerMe  = expense.payer_id  === currentUserId;
  const isDebtorMe = expense.debtor_id === currentUserId;

  const payerProfile  = expense.payerProfile;
  const debtorProfile = expense.debtorProfile;

  const payerDisplayName =
    payerProfile
      ? `${payerProfile.first_name ?? ""} ${payerProfile.last_name ?? ""}`.trim() ||
        payerProfile.username ||
        "the payer"
      : "the payer";

  const debtorDisplayName =
    debtorProfile
      ? `${debtorProfile.first_name ?? ""} ${debtorProfile.last_name ?? ""}`.trim() ||
        debtorProfile.username ||
        "the debtor"
      : "the debtor";

  // ── Contextual instruction text ──
  let instructionText = null;
  let instructionStyle = styles.instructionBox;
  let instructionTextStyle = styles.instructionText;

  if (status === "pending") {
    if (isDebtorMe) {
      instructionText = `You owe ${payerDisplayName}. Once you've paid, tap "I've Paid" below.`;
    } else if (isPayerMe) {
      instructionText = `Waiting for ${debtorDisplayName} to confirm they have paid you.`;
    }
  } else if (status === "paid") {
    if (isPayerMe) {
      instructionText = `${debtorDisplayName} has marked this as paid. Tap "Verify & Delete" to confirm you received the money, or "Dispute" if you have not.`;
      instructionStyle = [styles.instructionBox, styles.instructionBoxBlue];
      instructionTextStyle = [styles.instructionText, styles.instructionTextBlue];
    } else if (isDebtorMe) {
      instructionText = `Payment submitted — waiting for ${payerDisplayName} to verify.`;
      instructionStyle = [styles.instructionBox, styles.instructionBoxBlue];
      instructionTextStyle = [styles.instructionText, styles.instructionTextBlue];
    }
  }

  // Host who is NOT the payer and NOT the debtor
  if (!isPayerMe && !isDebtorMe) {
    instructionText = "You are viewing this expense as a trip host.";
  }

  return (
    <View style={styles.detail}>
      {/* Description + amount */}
      <View style={styles.amountRow}>
        <Text style={styles.descriptionTitle}>
          {expense.description || "Expense"}
        </Text>
        <Text style={styles.amountLarge}>{fmt(expense.amount)}</Text>
      </View>

      {/* Category */}
      {!!expense.category && (
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{expense.category}</Text>
        </View>
      )}

      {/* Status badge */}
      <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
        <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
      </View>

      {/* Payer ProfileCard */}
      <View style={styles.partySection}>
        <Text style={styles.partyRole}>PAYER {isPayerMe ? "(You)" : ""}</Text>
        {payerProfile ? (
          <ProfileCard profile={payerProfile} />
        ) : (
          <Text style={styles.unknownText}>Unknown</Text>
        )}
      </View>

      {/* Debtor ProfileCard */}
      <View style={styles.partySection}>
        <Text style={styles.partyRole}>OWES {isDebtorMe ? "(You)" : ""}</Text>
        {debtorProfile ? (
          <ProfileCard profile={debtorProfile} />
        ) : (
          <Text style={styles.unknownText}>Unknown</Text>
        )}
      </View>

      {/* Due date */}
      {!!expense.due_date && (
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Due Date</Text>
          <Text style={styles.metaValue}>{formatDate(expense.due_date) ?? expense.due_date}</Text>
        </View>
      )}

      {/* Contextual instruction */}
      {!!instructionText && (
        <View style={instructionStyle}>
          <Text style={instructionTextStyle}>{instructionText}</Text>
        </View>
      )}
    </View>
  );
};

// ── ExpensePopup ────────────────────────────────────────────────────

/**
 * ExpensePopup
 *
 * Payment flow (DB only allows 'pending' and 'paid'):
 *   pending → debtor presses "I've Paid"     → paid
 *   paid    → payer presses "Verify & Delete" → hard-delete (expense done)
 *   paid    → payer presses "Dispute"         → pending  (money not received)
 *
 * Delete access:
 *   - Payer: can verify+delete after debtor marks as paid
 *   - Host (who is NOT payer or debtor): can delete for admin cleanup
 *   - Debtor: CANNOT delete at any time
 */
export const ExpensePopup = ({
  visible,
  onClose,
  expense: expenseProp,
  currentUserId,
  isHost = false,
  onStatusChange,
  onDeleted,
}) => {
  const [expense, setExpense] = useState(expenseProp ?? null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setExpense(expenseProp ?? null);
  }, [expenseProp]);

  if (!visible) return null;

  const status     = expense?.settlement_status ?? "pending";
  const isPayerMe  = expense?.payer_id  === currentUserId;
  const isDebtorMe = expense?.debtor_id === currentUserId;
  // Host-only = trip host who is neither payer nor debtor
  const isHostOnly = isHost && !isPayerMe && !isDebtorMe;

  // ── patch status ─────────────────────────────────────────────────────
  const patchStatus = async (newStatus) => {
    if (!expense?.id) return;
    setLoading(true);
    const res = await API.patch(
      `/rest/v1/expenses?id=eq.${expense.id}`,
      { settlement_status: newStatus },
    );
    setLoading(false);
    if (!res.isSuccess) {
      Alert.alert("Error", res.message || "Failed to update status.");
      return;
    }
    const updated = { ...expense, settlement_status: newStatus };
    setExpense(updated);
    onStatusChange?.(expense.id, newStatus);
  };

  // ── hard delete ─────────────────────────────────────────────────────────
  const doDelete = async () => {
    if (!expense?.id) return;
    setLoading(true);
    const res = await API.delete(`/rest/v1/expenses?id=eq.${expense.id}`);
    setLoading(false);
    if (!res.isSuccess) {
      Alert.alert("Error", res.message || "Could not delete.");
      return;
    }
    onDeleted?.(expense.id);
    onClose();
  };

  // ── "I've Paid" — debtor (pending → paid) ───────────────────────────────
  const handleIvePaid = () => {
    Alert.alert(
      "Confirm Payment",
      "Mark this as paid? The payer will be asked to verify.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "I've Paid", onPress: () => patchStatus("paid") },
      ],
    );
  };

  // ── "Verify & Delete" — payer confirms + removes expense ───────────────────
  const handleVerifyAndDelete = () => {
    Alert.alert(
      "Verify Payment",
      "Confirm you received the payment. This expense will be deleted.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Verify & Delete", onPress: doDelete },
      ],
    );
  };

  // ── "Dispute" — payer disputes (paid → pending) ──────────────────────────
  const handleDispute = () => {
    Alert.alert(
      "Dispute Payment",
      "Mark this payment as not yet received? Status will revert to Pending.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Dispute", style: "destructive", onPress: () => patchStatus("pending") },
      ],
    );
  };

  // ── Host-only admin delete ────────────────────────────────────────────────
  const handleHostDelete = () => {
    Alert.alert(
      "Delete Expense",
      "Delete this expense as trip host?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ],
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {loading ? (
              <ActivityIndicator size="large" color="#000" />
            ) : expense ? (
              <ExpenseDetail expense={expense} currentUserId={currentUserId} />
            ) : (
              <Text style={styles.emptyText}>Expense not found.</Text>
            )}
          </ScrollView>

          <ButtonTray style={styles.actionTray}>
            {/* Debtor: pending → I've Paid */}
            {isDebtorMe && status === "pending" && (
              <Button
                label="I've Paid"
                variant="primary"
                loading={loading}
                onClick={handleIvePaid}
              />
            )}

            {/* Payer: paid → Verify & Delete */}
            {isPayerMe && status === "paid" && (
              <Button
                label="Verify & Delete"
                variant="primary"
                loading={loading}
                onClick={handleVerifyAndDelete}
              />
            )}

            {/* Payer: paid → Dispute (reverts to pending) */}
            {isPayerMe && status === "paid" && (
              <Button
                label="Dispute"
                variant="danger"
                disabled={loading}
                onClick={handleDispute}
              />
            )}

            {/* Host-only: admin delete (for trip hosts who are not payer/debtor) */}
            {isHostOnly && (
              <Button
                label="Delete"
                variant="danger"
                disabled={loading}
                onClick={handleHostDelete}
              />
            )}

            <Button label="Close" variant="ghost" onClick={onClose} />
          </ButtonTray>
        </View>
      </View>
    </Modal>
  );
};

// ── ExpenseView ───────────────────────────────────────────────────────────────

/**
 * ExpenseView — standalone (non-modal) expense detail renderer.
 */
const ExpenseView = ({ expense, currentUserId }) => (
  <ExpenseDetail expense={expense} currentUserId={currentUserId} />
);

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Detail block
  detail: {
    gap: 14,
    paddingVertical: 4,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  descriptionTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    lineHeight: 26,
  },
  amountLarge: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111",
    flexShrink: 0,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
  },

  // Party sections
  partySection: {
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 12,
  },
  partyRole: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#aaa",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  unknownText: {
    fontSize: 14,
    color: "#aaa",
    fontStyle: "italic",
  },

  // Meta row
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#aaa",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  metaValue: {
    fontSize: 13,
    color: "#555",
    fontWeight: "500",
  },

  // Instruction boxes
  instructionBox: {
    backgroundColor: "#fff8e1",
    borderRadius: 10,
    padding: 12,
  },
  instructionBoxBlue: {
    backgroundColor: "#e3f2fd",
  },
  instructionBoxGreen: {
    backgroundColor: "#e8f5e9",
  },
  instructionText: {
    fontSize: 13,
    color: "#b45309",
    lineHeight: 18,
  },
  instructionTextBlue: {
    color: "#1565c0",
  },
  instructionTextGreen: {
    color: "#2e7d32",
  },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    maxHeight: "90%",
    overflow: "hidden",
  },
  modalContent: {
    padding: 20,
    gap: 4,
  },
  actionTray: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    marginTop: 0,
    flexWrap: "wrap",
  },
  emptyText: {
    color: "#aaa",
    textAlign: "center",
    fontSize: 14,
  },
});

export default ExpenseView;

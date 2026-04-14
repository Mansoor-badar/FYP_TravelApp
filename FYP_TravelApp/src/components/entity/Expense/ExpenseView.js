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

// ── helpers ──────────────────────────────────────────────────────────────────

const STATUS_META = {
  pending: { label: "⏳ Pending", bg: "#fff8e1", color: "#b45309" },
  paid: { label: "✔ Payment Confirmed", bg: "#e3f2fd", color: "#1565c0" },
  settled: { label: "✅ Settled", bg: "#e8f5e9", color: "#2e7d32" },
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

  const status = expense.settlement_status ?? "pending";
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  const isPayerMe = expense.payer_id === currentUserId;
  const isDebtorMe = expense.debtor_id === currentUserId;

  const payerProfile = expense.payerProfile;
  const debtorProfile = expense.debtorProfile;

  // Human-readable names for instruction text
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

      {/* Contextual instruction (no raw IDs) */}
      {isPayerMe && status === "pending" && (
        <View style={styles.instructionBox}>
          <Text style={styles.instructionText}>
            Once {debtorDisplayName} has paid you, tap "Mark as Paid" below.
          </Text>
        </View>
      )}
      {isDebtorMe && status === "paid" && (
        <View style={[styles.instructionBox, styles.instructionBoxBlue]}>
          <Text style={[styles.instructionText, styles.instructionTextBlue]}>
            {payerDisplayName} has confirmed payment. Tap "Confirm & Settle" to close this debt.
          </Text>
        </View>
      )}
      {isDebtorMe && status === "pending" && (
        <View style={styles.instructionBox}>
          <Text style={styles.instructionText}>
            Waiting for {payerDisplayName} to confirm that you have paid.
          </Text>
        </View>
      )}
      {!isPayerMe && !isDebtorMe && (
        <View style={styles.instructionBox}>
          <Text style={styles.instructionText}>
            You are viewing this expense as a trip host.
          </Text>
        </View>
      )}
    </View>
  );
};

// ── ExpensePopup ──────────────────────────────────────────────────────────────

/**
 * ExpensePopup
 *
 * Slide-up modal for viewing and acting on an expense.
 *
 * Props:
 *   visible        – boolean
 *   onClose()      – dismissed handler
 *   expense        – enriched expense row (payerProfile + debtorProfile attached) or null
 *   currentUserId  – UUID of the logged-in user
 *   isHost         – whether the current user is the trip host
 *   onSettled(id)  – called after payer_confirmed row is deleted by debtor
 *   onStatusChange(id, newStatus) – called after a status PATCH
 *   onDeleted(id)  – called after a hard delete
 */
export const ExpensePopup = ({
  visible,
  onClose,
  expense: expenseProp,
  currentUserId,
  isHost = false,
  onSettled,
  onStatusChange,
  onDeleted,
}) => {
  const [expense, setExpense] = useState(expenseProp ?? null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setExpense(expenseProp ?? null);
  }, [expenseProp]);

  if (!visible) return null;

  const status = expense?.settlement_status ?? "pending";
  const isPayerMe = expense?.payer_id === currentUserId;
  const isDebtorMe = expense?.debtor_id === currentUserId;

  // Delete is only available to the payer or the host — NOT the debtor
  const canHardDelete = isHost || isPayerMe;

  // ── "Mark as Paid" — payer action ──────────────────────────────────────────
  const handleMarkPaid = async () => {
    if (!expense?.id) return;
    setLoading(true);
    const res = await API.patch(
      `/rest/v1/expenses?id=eq.${expense.id}`,
      { settlement_status: "paid" }
    );
    setLoading(false);
    if (!res.isSuccess) {
      Alert.alert("Error", res.message || "Failed to update status.");
      return;
    }
    const updated = { ...expense, settlement_status: "paid" };
    setExpense(updated);
    onStatusChange?.(expense.id, "paid");
  };

  // ── "Confirm & Settle" — debtor action ────────────────────────────────────
  const handleConfirmSettle = () => {
    if (!expense?.id) return;
    Alert.alert(
      "Confirm Payment",
      "Mark this debt as fully settled and remove it?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm & Settle",
          onPress: async () => {
            setLoading(true);
            const res = await API.delete(`/rest/v1/expenses?id=eq.${expense.id}`);
            setLoading(false);
            if (!res.isSuccess) {
              Alert.alert("Error", res.message || "Failed to settle.");
              return;
            }
            onSettled?.(expense.id);
            onClose();
          },
        },
      ]
    );
  };

  // ── Hard delete (host or payer only) ──────────────────────────────────────
  const handleDelete = () => {
    if (!expense?.id) return;
    Alert.alert(
      "Delete Expense",
      "Permanently delete this expense record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            const res = await API.delete(`/rest/v1/expenses?id=eq.${expense.id}`);
            setLoading(false);
            if (!res.isSuccess) {
              Alert.alert("Error", res.message || "Could not delete.");
              return;
            }
            onDeleted?.(expense.id);
            onClose();
          },
        },
      ]
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
            {/* Payer: pending → mark paid */}
            {isPayerMe && status === "pending" && (
              <Button
                label="Mark as Paid"
                variant="primary"
                loading={loading}
                onClick={handleMarkPaid}
              />
            )}
            {/* Debtor: paid → confirm & settle */}
            {isDebtorMe && status === "paid" && (
              <Button
                label="Confirm & Settle"
                variant="primary"
                loading={loading}
                onClick={handleConfirmSettle}
              />
            )}
            {/* Hard delete — payer or host only, never a non-payer debtor */}
            {canHardDelete && (
              <Button
                label="Delete"
                variant="danger"
                disabled={loading}
                onClick={handleDelete}
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
  instructionText: {
    fontSize: 13,
    color: "#b45309",
    lineHeight: 18,
  },
  instructionTextBlue: {
    color: "#1565c0",
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

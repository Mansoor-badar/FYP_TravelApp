import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";

/**
 * ExpenseItem
 *
 * A compact pressable card representing a single expense debt row.
 *
 * Props:
 *   expense     – expenses row enriched with payerName + debtorName
 *   currentUserId – UUID of the logged-in user
 *   onPress(expense) – called when the card is tapped
 */
const ExpenseItem = ({ expense, currentUserId, onPress }) => {
  if (!expense) return null;

  const status = expense.settlement_status ?? "pending";
  const isPayerMe = expense.payer_id === currentUserId;
  const isDebtorMe = expense.debtor_id === currentUserId;

  const { label: statusLabel, style: statusStyle } = STATUS_META[status] ?? STATUS_META.pending;

  // Contextual tap hint
  let tapHint = "Tap to view";
  if (isPayerMe && status === "pending") tapHint = "Tap to mark as paid";
  if (isDebtorMe && status === "paid") tapHint = "Tap to confirm payment";

  const amountFormatted = `£${parseFloat(expense.amount ?? 0).toFixed(2)}`;

  return (
    <Pressable
      onPress={() => onPress?.(expense)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
    >
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.description} numberOfLines={1}>
            {expense.description || "—"}
          </Text>
          {!!expense.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{expense.category}</Text>
            </View>
          )}
        </View>
        <Text style={styles.amount}>{amountFormatted}</Text>
      </View>

      {/* Payer → Debtor row */}
      <View style={styles.partyRow}>
        <View style={styles.partyChip}>
          <Text style={styles.partyRole}>PAYER</Text>
          <Text style={styles.partyName} numberOfLines={1}>
            {isPayerMe ? "You" : (expense.payerName || "Unknown")}
          </Text>
        </View>
        <Text style={styles.arrow}>→</Text>
        <View style={styles.partyChip}>
          <Text style={styles.partyRole}>OWES</Text>
          <Text style={styles.partyName} numberOfLines={1}>
            {isDebtorMe ? "You" : (expense.debtorName || "Unknown")}
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={[styles.statusBadge, statusStyle]}>
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>
        {expense.due_date && (
          <Text style={styles.dueDate}>Due {expense.due_date}</Text>
        )}
        <Text style={styles.tapHint}>{tapHint} ›</Text>
      </View>
    </Pressable>
  );
};

const STATUS_META = {
  pending: {
    label: "⏳ Pending",
    style: { backgroundColor: "#fff8e1" },
  },
  paid: {
    label: "✔ Payment Confirmed",
    style: { backgroundColor: "#e3f2fd" },
  },
  settled: {
    label: "✅ Settled",
    style: { backgroundColor: "#e8f5e9" },
  },
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    padding: 16,
    marginBottom: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.75,
    backgroundColor: "#f9f9f9",
  },

  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  headerLeft: {
    flex: 1,
    gap: 4,
  },
  description: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  categoryText: {
    fontSize: 11,
    color: "#666",
    fontWeight: "600",
  },
  amount: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
    flexShrink: 0,
  },

  // Party row
  partyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  partyChip: {
    flex: 1,
    backgroundColor: "#fafafa",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  partyRole: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: "#aaa",
    textTransform: "uppercase",
  },
  partyName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#222",
  },
  arrow: {
    fontSize: 16,
    color: "#ccc",
    fontWeight: "300",
    flexShrink: 0,
  },

  // Footer
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#444",
  },
  dueDate: {
    fontSize: 11,
    color: "#aaa",
  },
  tapHint: {
    fontSize: 11,
    color: "#bbb",
    marginLeft: "auto",
  },
});

export default ExpenseItem;

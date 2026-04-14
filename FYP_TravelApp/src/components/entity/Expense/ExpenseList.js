import React from "react";
import { View, Text, StyleSheet } from "react-native";
import ExpenseItem from "./ExpenseItem";

/**
 * ExpenseList
 *
 * Renders a vertical list of ExpenseItem cards.
 *
 * Props:
 *   expenses      – array of enriched expense rows (with payerName, debtorName)
 *   currentUserId – UUID of the logged-in user (passed through to ExpenseItem)
 *   onSelect(expense) – called when an item is pressed
 */
const ExpenseList = ({ expenses = [], currentUserId, onSelect }) => {
  if (expenses.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No expenses yet.</Text>
        <Text style={styles.emptyHint}>
          Tap "＋ New Expense" to split a cost with the group.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {expenses.map((expense) => (
        <ExpenseItem
          key={expense.id}
          expense={expense}
          currentUserId={currentUserId}
          onPress={onSelect}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: 0,
  },
  empty: {
    paddingVertical: 24,
    alignItems: "center",
    gap: 6,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#aaa",
  },
  emptyHint: {
    fontSize: 12,
    color: "#ccc",
    textAlign: "center",
  },
});

export default ExpenseList;

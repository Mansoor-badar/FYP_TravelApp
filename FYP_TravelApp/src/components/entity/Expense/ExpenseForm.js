import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TouchableOpacity,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import API from "../../API/API";
import Button, { ButtonTray } from "../../UI/Button";
import { ProfileCard } from "../Profile/ProfileView";
import { formatDate } from "../../../utils/DateUtils";

/**
 * ExpenseForm
 *
 * Form for creating a new expense split. Creates one `expenses` row per
 * selected debtor.
 *
 * Props:
 *   tripId      – UUID of the trip
 *   payerId     – UUID of the current user (default payer)
 *   tripMembers – array of profile objects: { id, first_name, last_name, username, profile_image_url }
 *   onSubmit()  – called after all rows are persisted successfully
 *   onCancel()  – called when user presses cancel
 */
const ExpenseForm = ({ tripId, payerId, tripMembers = [], onSubmit, onCancel }) => {
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  // Due date — stored as ISO string, displayed as YYYY-MM-DD
  const [dueDate, setDueDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [selectedPayerId, setSelectedPayerId] = useState(payerId ?? null);
  // [{ memberId: string, amount: string }]
  const [debtorRows, setDebtorRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // ── Date picker ────────────────────────────────────────────────────────────

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (event.type === "set" && selectedDate) {
      setDueDate(selectedDate.toISOString());
    }
  };

  const dueDateDisplay = dueDate ? formatDate(dueDate) : null;

  // ── Debtor helpers ─────────────────────────────────────────────────────────

  const toggleDebtor = (memberId) => {
    setDebtorRows((prev) => {
      const exists = prev.find((r) => r.memberId === memberId);
      if (exists) return prev.filter((r) => r.memberId !== memberId);
      return [...prev, { memberId, amount: "" }];
    });
    if (errors.debtors) setErrors((e) => ({ ...e, debtors: null }));
  };

  const updateDebtorAmount = (memberId, value) => {
    // Allow only digits and a single decimal point
    const sanitised = value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
    setDebtorRows((prev) =>
      prev.map((r) => (r.memberId === memberId ? { ...r, amount: sanitised } : r))
    );
    if (errors.amounts) setErrors((e) => ({ ...e, amounts: null }));
  };

  const isDebtorSelected = (memberId) =>
    debtorRows.some((r) => r.memberId === memberId);

  // ── Validation ─────────────────────────────────────────────────────────────

  const validate = () => {
    const errs = {};
    if (!description.trim()) errs.description = "Description is required.";
    if (!selectedPayerId) errs.payer = "Please select a payer.";
    if (debtorRows.length === 0) errs.debtors = "Select at least one person who owes money.";
    const badAmount = debtorRows.find(
      (r) => !r.amount || isNaN(parseFloat(r.amount)) || parseFloat(r.amount) <= 0
    );
    if (badAmount) errs.amounts = "Every selected debtor needs a valid amount (> £0).";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);

    const basePayload = {
      trip_id: tripId,
      payer_id: selectedPayerId,
      description: description.trim(),
      category: category.trim() || null,
      // Store the due date as a plain YYYY-MM-DD string (matches DB `date` type)
      due_date: dueDateDisplay || null,
      // 'pending' is the only allowed initial value per the DB check constraint
      settlement_status: "pending",
    };

    const results = await Promise.all(
      debtorRows.map((row) =>
        API.post("/rest/v1/expenses", {
          ...basePayload,
          debtor_id: row.memberId,
          amount: parseFloat(row.amount),
        })
      )
    );

    setLoading(false);

    const failed = results.find((r) => !r.isSuccess);
    if (failed) {
      Alert.alert("Error", failed.message || "Some expense rows failed to save.");
      return;
    }

    onSubmit?.();
  };

  // Debtors exclude the currently selected payer
  const debtorMembers = tripMembers.filter((m) => m.id !== selectedPayerId);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>New Expense Split</Text>

      {/* ── Description ── */}
      <View style={styles.field}>
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, errors.description && styles.inputError]}
          placeholder="e.g. Hotel booking, dinner…"
          placeholderTextColor="#bbb"
          value={description}
          onChangeText={(t) => {
            setDescription(t);
            if (errors.description) setErrors((e) => ({ ...e, description: null }));
          }}
          maxLength={200}
        />
        {!!errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
      </View>

      {/* ── Category ── */}
      <View style={styles.field}>
        <Text style={styles.label}>Category (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Food, Transport, Accommodation…"
          placeholderTextColor="#bbb"
          value={category}
          onChangeText={setCategory}
          maxLength={60}
        />
      </View>

      {/* ── Due Date — native calendar picker ── */}
      <View style={styles.field}>
        <Text style={styles.label}>Due Date (optional)</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.75}
        >
          <Text style={[styles.dateButtonText, !dueDateDisplay && styles.placeholder]}>
            {dueDateDisplay || "Select a date…"}
          </Text>
          <Text style={styles.calIcon}>📅</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={dueDate ? new Date(dueDate) : new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}
      </View>

      {/* ── Payer selector — ProfileCard per member ── */}
      <View style={styles.field}>
        <Text style={styles.label}>Who is paying? *</Text>
        {!!errors.payer && <Text style={styles.errorText}>{errors.payer}</Text>}
        <View style={styles.memberList}>
          {tripMembers.map((m) => {
            const selected = m.id === selectedPayerId;
            return (
              <Pressable
                key={m.id}
                onPress={() => {
                  setSelectedPayerId(m.id);
                  // Remove this member from debtors if they were selected
                  setDebtorRows((prev) => prev.filter((r) => r.memberId !== m.id));
                  if (errors.payer) setErrors((e) => ({ ...e, payer: null }));
                }}
                style={({ pressed }) => [
                  styles.memberCard,
                  selected && styles.memberCardSelected,
                  pressed && styles.memberCardPressed,
                ]}
              >
                <ProfileCard profile={m} />
                {selected && (
                  <View style={styles.tickBadge}>
                    <Text style={styles.tickText}>✓</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ── Debtor selector + individual amounts ── */}
      <View style={styles.field}>
        <Text style={styles.label}>Who owes money? *</Text>
        <Text style={styles.sublabel}>
          Tap to select members, then enter what each person owes.
        </Text>
        {!!errors.debtors && <Text style={styles.errorText}>{errors.debtors}</Text>}
        {!!errors.amounts && <Text style={styles.errorText}>{errors.amounts}</Text>}

        {debtorMembers.length === 0 ? (
          <Text style={styles.noMembers}>
            No other members to select — invite people to the trip first.
          </Text>
        ) : (
          <View style={styles.memberList}>
            {debtorMembers.map((m) => {
              const selected = isDebtorSelected(m.id);
              const row = debtorRows.find((r) => r.memberId === m.id);
              const firstName = m.first_name || m.name || "them";
              return (
                <View key={m.id}>
                  <Pressable
                    onPress={() => toggleDebtor(m.id)}
                    style={({ pressed }) => [
                      styles.memberCard,
                      selected && styles.memberCardSelected,
                      pressed && styles.memberCardPressed,
                    ]}
                  >
                    <ProfileCard profile={m} />
                    {selected && (
                      <View style={styles.tickBadge}>
                        <Text style={styles.tickText}>✓</Text>
                      </View>
                    )}
                  </Pressable>

                  {/* Amount input — slides in below the card when selected */}
                  {selected && (
                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>
                        Amount {firstName} owes:
                      </Text>
                      <View style={styles.amountInputWrap}>
                        <Text style={styles.currencySymbol}>£</Text>
                        <TextInput
                          style={[
                            styles.amountInput,
                            !!errors.amounts && !row?.amount && styles.inputError,
                          ]}
                          placeholder="0.00"
                          placeholderTextColor="#bbb"
                          keyboardType="decimal-pad"
                          value={row?.amount ?? ""}
                          onChangeText={(v) => updateDebtorAmount(m.id, v)}
                          maxLength={10}
                        />
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* ── Actions ── */}
      <ButtonTray style={styles.actions}>
        <Button
          label="Create Expense"
          variant="primary"
          loading={loading}
          onClick={handleSubmit}
        />
        <Button
          label="Cancel"
          variant="ghost"
          disabled={loading}
          onClick={onCancel}
        />
      </ButtonTray>
    </ScrollView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    marginBottom: 20,
  },

  // Field wrapper
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#555",
    marginBottom: 8,
  },
  sublabel: {
    fontSize: 12,
    color: "#aaa",
    marginBottom: 8,
    marginTop: -4,
  },

  // Text input
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111",
    backgroundColor: "#fafafa",
  },
  inputError: { borderColor: "#cc0000" },
  errorText: { fontSize: 12, color: "#cc0000", marginTop: 4 },

  // Date picker button
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#fafafa",
  },
  dateButtonText: { fontSize: 15, color: "#111" },
  placeholder: { color: "#bbb" },
  calIcon: { fontSize: 16 },

  // Member cards
  memberList: { gap: 0 },
  memberCard: {
    borderWidth: 1.5,
    borderColor: "#eee",
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#fff",
    position: "relative",
    overflow: "hidden",
  },
  memberCardSelected: {
    borderColor: "#111",
    backgroundColor: "#f9f9f9",
  },
  memberCardPressed: { opacity: 0.75 },
  tickBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  tickText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  // Amount row (below selected debtor card)
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#f4f4f4",
    borderWidth: 1.5,
    borderColor: "#111",
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginTop: -8,
    marginBottom: 8,
  },
  amountLabel: {
    flex: 1,
    fontSize: 13,
    color: "#444",
    fontWeight: "600",
  },
  amountInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    height: 40,
    minWidth: 110,
  },
  currencySymbol: {
    fontSize: 15,
    color: "#555",
    marginRight: 2,
    fontWeight: "600",
  },
  amountInput: {
    flex: 1,
    fontSize: 15,
    color: "#111",
    padding: 0,
  },

  noMembers: {
    fontSize: 13,
    color: "#aaa",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 12,
  },

  actions: { marginTop: 8 },
});

export default ExpenseForm;

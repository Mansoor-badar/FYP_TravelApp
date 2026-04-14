import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import API from "../../API/API";
import Button, { ButtonTray } from "../../UI/Button";

/**
 * PollForm
 *
 * Form for creating a new trip poll.
 *
 * Props:
 *   tripId     – UUID of the trip this poll belongs to
 *   createdBy  – UUID of the user creating the poll
 *   onSubmit(poll, options) – called with the created poll + options on success
 *   onCancel() – called when the user cancels
 */
const PollForm = ({ tripId, createdBy, onSubmit, onCancel }) => {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const updateOption = (index, value) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  };

  const addOption = () => {
    if (options.length >= 4) return;
    setOptions((prev) => [...prev, ""]);
  };

  const removeOption = (index) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    const newErrors = {};
    if (!question.trim()) {
      newErrors.question = "Question is required.";
    }
    const filledOptions = options.filter((o) => o.trim().length > 0);
    if (filledOptions.length < 2) {
      newErrors.options = "At least 2 options are required.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);

    // 1. Create poll
    const pollRes = await API.post("/rest/v1/trip_polls", {
      trip_id: tripId,
      question: question.trim(),
      created_by: createdBy,
    });

    if (!pollRes.isSuccess) {
      setLoading(false);
      Alert.alert("Error", pollRes.message || "Failed to create poll.");
      return;
    }

    const newPoll = Array.isArray(pollRes.result)
      ? pollRes.result[0]
      : pollRes.result;

    if (!newPoll?.id) {
      setLoading(false);
      Alert.alert("Error", "Invalid response from server.");
      return;
    }

    // 2. Create each option
    const filledOptions = options.filter((o) => o.trim().length > 0);
    const optionResults = await Promise.all(
      filledOptions.map((optText) =>
        API.post("/rest/v1/poll_options", {
          poll_id: newPoll.id,
          option_text: optText.trim(),
          vote_count: 0,
        })
      )
    );

    const failed = optionResults.find((r) => !r.isSuccess);
    if (failed) {
      setLoading(false);
      Alert.alert("Warning", "Poll created but some options failed to save.");
    }

    const createdOptions = optionResults
      .filter((r) => r.isSuccess)
      .map((r) => (Array.isArray(r.result) ? r.result[0] : r.result));

    setLoading(false);
    onSubmit?.(newPoll, createdOptions);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>New Poll</Text>

      {/* Question */}
      <View style={styles.field}>
        <Text style={styles.label}>Question</Text>
        <TextInput
          style={[styles.input, errors.question && styles.inputError]}
          placeholder="Ask the group something…"
          placeholderTextColor="#bbb"
          value={question}
          onChangeText={(t) => {
            setQuestion(t);
            if (errors.question) setErrors((e) => ({ ...e, question: null }));
          }}
          multiline
          maxLength={200}
        />
        {!!errors.question && (
          <Text style={styles.errorText}>{errors.question}</Text>
        )}
      </View>

      {/* Options */}
      <View style={styles.field}>
        <Text style={styles.label}>Options</Text>
        {options.map((opt, idx) => (
          <View key={idx} style={styles.optionRow}>
            <TextInput
              style={[
                styles.input,
                styles.optionInput,
                errors.options && styles.inputError,
              ]}
              placeholder={`Option ${idx + 1}`}
              placeholderTextColor="#bbb"
              value={opt}
              onChangeText={(t) => {
                updateOption(idx, t);
                if (errors.options) setErrors((e) => ({ ...e, options: null }));
              }}
              maxLength={100}
            />
            {options.length > 2 && (
              <Pressable
                onPress={() => removeOption(idx)}
                style={styles.removeBtn}
                hitSlop={8}
              >
                <Text style={styles.removeBtnText}>✕</Text>
              </Pressable>
            )}
          </View>
        ))}
        {!!errors.options && (
          <Text style={styles.errorText}>{errors.options}</Text>
        )}
        {options.length < 4 && (
          <Pressable
            onPress={addOption}
            style={({ pressed }) => [
              styles.addOptionBtn,
              pressed && styles.addOptionBtnPressed,
            ]}
          >
            <Text style={styles.addOptionText}>＋ Add Option</Text>
          </Pressable>
        )}
      </View>

      {/* Actions */}
      <ButtonTray style={styles.actions}>
        <Button
          label="Create Poll"
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

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 20,
  },
  heading: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#555",
  },
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
  inputError: {
    borderColor: "#cc0000",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  optionInput: {
    flex: 1,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtnText: {
    fontSize: 14,
    color: "#888",
  },
  addOptionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
    alignItems: "center",
  },
  addOptionBtnPressed: {
    opacity: 0.6,
  },
  addOptionText: {
    fontSize: 14,
    color: "#555",
    fontWeight: "600",
  },
  errorText: {
    fontSize: 12,
    color: "#cc0000",
    marginTop: 2,
  },
  actions: {
    marginTop: 8,
  },
});

export default PollForm;

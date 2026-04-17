import React from "react";
import { View, Text, StyleSheet } from "react-native";

/**
 * InfoRow
 *
 * A horizontal label / value row separated by flexible space.  Used in detail
 * screens (DocumentViewScreen) to present metadata in a consistent table-like
 * format.
 *
 * Props:
 *   label – left-side caption string (shown in small uppercase)
 *   value – right-side value string
 *   mono  – if true, render value in monospace (useful for file paths, IDs)
 */
const InfoRow = ({ label, value, mono = false }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text
      style={[styles.value, mono && styles.mono]}
      numberOfLines={2}
      ellipsizeMode="middle"
    >
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f3f3",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#aaa",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    flexShrink: 0,
    maxWidth: "38%",
  },
  value: {
    flex: 1,
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
    textAlign: "right",
  },
  mono: {
    fontFamily: "monospace",
    fontSize: 11,
    color: "#666",
  },
});

export default InfoRow;

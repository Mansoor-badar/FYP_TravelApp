import React from "react";
import { View, Text, StyleSheet } from "react-native";

/**
 * StatusBanner
 *
 * A pill-shaped coloured banner used to communicate a membership or process
 * status.  Appears in TripViewScreen (join request state) and GroupScreen
 * (active SOS notice).
 *
 * Props:
 *   text    – message string to display
 *   variant – one of: "accepted" | "pending" | "rejected" | "warning" | "danger"
 *             (default: "pending")
 *   style   – extra style for the outer container (optional)
 */
const VARIANT_STYLES = {
  accepted: { bg: "#e6f4ea", text: "#2e7d32" },
  pending:  { bg: "#fff8e1", text: "#b45309" },
  rejected: { bg: "#fce8e8", text: "#b91c1c" },
  warning:  { bg: "#fff3e0", text: "#e65100" },
  danger:   { bg: "#8B0000", text: "#fff"    },
};

const StatusBanner = ({ text, variant = "pending", style }) => {
  const { bg, text: textColor } = VARIANT_STYLES[variant] ?? VARIANT_STYLES.pending;
  return (
    <View style={[styles.banner, { backgroundColor: bg }, style]}>
      <Text style={[styles.text, { color: textColor }]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});

export default StatusBanner;

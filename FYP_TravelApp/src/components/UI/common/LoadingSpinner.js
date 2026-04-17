import React from "react";
import { ActivityIndicator, Text, StyleSheet, View } from "react-native";

/**
 * LoadingSpinner
 *
 * A thin wrapper around ActivityIndicator with consistent sizing and optional
 * label text below.  Replaces the many ad-hoc <ActivityIndicator …> usages
 * spread across screens.
 *
 * Props:
 *   size    – "small" | "large"  (default: "large")
 *   color   – indicator tint color  (default: "#000")
 *   style   – extra style applied to the outer View (optional)
 *   label   – text shown below the spinner (optional)
 */
const LoadingSpinner = ({
  size = "large",
  color = "#000",
  style,
  label,
}) => (
  <View style={[styles.container, style]}>
    <ActivityIndicator size={size} color={color} />
    {!!label && <Text style={styles.label}>{label}</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  label: {
    marginTop: 12,
    fontSize: 14,
    color: "#555",
  },
});

export default LoadingSpinner;

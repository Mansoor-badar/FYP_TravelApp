import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";

/**
 * BackButton
 *
 * A simple navigation back pressable used in the top-left of detail screens.
 * Replaces the ad-hoc Pressable + Text combos in DocumentViewScreen and
 * TripViewScreen.
 *
 * Props:
 *   onPress – press handler (required)
 *   label   – button label  (default: "‹ Back")
 *   style   – extra style for the Pressable wrapper (optional)
 */
const BackButton = ({ onPress, label = "‹ Back", style }) => (
  <Pressable
    onPress={onPress}
    hitSlop={12}
    style={({ pressed }) => [styles.btn, pressed && styles.pressed, style]}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <Text style={styles.text}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  btn: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  pressed: {
    opacity: 0.6,
  },
  text: {
    fontSize: 15,
    color: "#111",
    fontWeight: "600",
  },
});

export default BackButton;

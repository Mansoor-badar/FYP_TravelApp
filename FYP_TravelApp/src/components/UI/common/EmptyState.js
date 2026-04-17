import React from "react";
import { View, Text, StyleSheet } from "react-native";

/**
 * EmptyState
 *
 * A centered empty-state block.  Supports two display modes:
 *
 *   card  (default) — frosted-glass card floating at the bottom of a map or
 *                     scroll view (emoji + bold title + subtitle).
 *   inline          — simple inline text hint used inside list containers.
 *
 * Props:
 *   emoji    – emoji character shown above the title (card mode, optional)
 *   title    – primary message (required)
 *   subtitle – secondary message below the title (optional)
 *   variant  – "card" | "inline"  (default: "card")
 *   style    – extra style applied to the outermost container (optional)
 */
const EmptyState = ({
  emoji,
  title,
  subtitle,
  variant = "card",
  style,
}) => {
  if (variant === "inline") {
    return (
      <Text style={[styles.inlineText, style]}>{title}</Text>
    );
  }

  return (
    <View style={[styles.card, style]}>
      {!!emoji && <Text style={styles.emoji}>{emoji}</Text>}
      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  emoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: "#777",
    textAlign: "center",
    lineHeight: 19,
  },

  // Inline variant
  inlineText: {
    color: "#888",
    fontSize: 14,
    marginBottom: 8,
  },
});

export default EmptyState;

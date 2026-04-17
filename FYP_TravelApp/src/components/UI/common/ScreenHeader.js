import React from "react";
import { View, Text, StyleSheet } from "react-native";

/**
 * ScreenHeader
 *
 * A consistent page-level header row with a bold title and an optional
 * right-side element (button, icon, etc.).
 *
 * Props:
 *   title        – string displayed as the page title
 *   rightElement – any React node rendered to the right of the title (optional)
 *   style        – extra style applied to the outer View (optional)
 */
const ScreenHeader = ({ title, rightElement, style }) => (
  <View style={[styles.header, style]}>
    <Text style={styles.title}>{title}</Text>
    {rightElement ?? null}
  </View>
);

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
    marginTop: 12,
  },
});

export default ScreenHeader;

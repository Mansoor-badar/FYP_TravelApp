import React from "react";
import { View, Text, StyleSheet } from "react-native";

/**
 * SectionHeader
 *
 * An uppercase, letter-spaced section label with an optional right-side element
 * (e.g. an "+ Add" Button).  Matches the design used throughout GroupScreen,
 * TripViewScreen, HomeScreen and TravelGuideScreen.
 *
 * Props:
 *   label        – section label string (will NOT be auto-uppercased — pass it as you want it)
 *   rightElement – any React node rendered to the right (optional)
 *   style        – extra style for the outer View (optional)
 *   labelStyle   – extra style for just the label Text (optional)
 */
const SectionHeader = ({ label, rightElement, style, labelStyle }) => (
  <View style={[styles.row, style]}>
    <Text style={[styles.label, labelStyle]}>{label}</Text>
    {rightElement ?? null}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#555",
  },
});

export default SectionHeader;

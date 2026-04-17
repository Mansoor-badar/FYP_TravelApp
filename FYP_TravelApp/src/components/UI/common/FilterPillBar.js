import React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";

/**
 * FilterPillBar
 *
 * A horizontally scrollable row of toggle pills.  Extracted from the inline
 * FilterBar component in MapScreen.
 *
 * Props:
 *   options   – array of { key: string, label: string }
 *   selected  – key of the currently active option
 *   onSelect  – (key: string) => void
 *   style     – extra style for the outer wrapper (optional)
 */
const FilterPillBar = ({ options = [], selected, onSelect, style }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={[styles.row, style]}
  >
    {options.map(({ key, label }) => {
      const active = selected === key;
      return (
        <Pressable
          key={key}
          style={[styles.pill, active && styles.pillActive]}
          onPress={() => onSelect(key)}
          accessibilityRole="button"
          accessibilityState={{ selected: active }}
        >
          <Text style={[styles.pillText, active && styles.pillTextActive]}>
            {label}
          </Text>
        </Pressable>
      );
    })}
  </ScrollView>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  pillActive: {
    backgroundColor: "#111",
    borderColor: "#111",
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
  },
  pillTextActive: {
    color: "#fff",
  },
});

export default FilterPillBar;

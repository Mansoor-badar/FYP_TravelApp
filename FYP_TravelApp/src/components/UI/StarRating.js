import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

/**
 * StarRating
 *
 * Reusable star rating component supporting interactive (selection)
 * and read-only (display) modes.
 *
 * Props:
 *   rating    – current rating value (1–5; 0 means unrated)
 *   maxStars  – total stars to render (default 5)
 *   onRate    – if provided, enables interactive mode; called with the tapped star value
 *   size      – font-size of each star glyph (default 28)
 */
const StarRating = ({ rating = 0, maxStars = 5, onRate, size = 28 }) => (
  <View style={styles.row}>
    {Array.from({ length: maxStars }, (_, i) => i + 1).map((star) => (
      <Pressable
        key={star}
        onPress={() => onRate?.(star)}
        disabled={!onRate}
        style={({ pressed }) => (pressed && onRate ? styles.pressed : null)}
        accessibilityRole={onRate ? "button" : "text"}
        accessibilityLabel={`${star} star${star !== 1 ? "s" : ""}`}
      >
        <Text
          style={[
            styles.star,
            { fontSize: size, color: star <= rating ? "#F5A623" : "#D0D0D0" },
          ]}
        >
          ★
        </Text>
      </Pressable>
    ))}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 4,
  },
  star: {
    lineHeight: undefined,
  },
  pressed: {
    opacity: 0.6,
  },
});

export default StarRating;

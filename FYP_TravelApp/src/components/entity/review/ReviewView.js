import React from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";

// ── ReviewView ────────────────────────────────────────────────────────────────

/**
 * ReviewView
 *
 * Compact profile card used in past-trip sections. Shows the user's
 * avatar, full name, and username alongside a Review / Reviewed badge.
 *
 * Props:
 *   profile   – user profile object ({ first_name, last_name, username, profile_image_url, id })
 *   reviewed  – true when the current user has already reviewed this person
 *   onReview  – called when the Review button is pressed (omit or leave undefined when reviewed)
 */
const ReviewView = ({ profile, reviewed, onReview }) => {
  if (!profile) return null;

  const fullName =
    `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "—";
  const avatarUri =
    profile.profile_image_url || "https://i.sstatic.net/l60Hf.png";

  return (
    <View style={styles.card}>
      <Image source={{ uri: avatarUri }} style={styles.avatar} />
      <Text style={styles.name} numberOfLines={1}>
        {fullName}
      </Text>
      {!!profile.username && (
        <Text style={styles.username} numberOfLines={1}>
          @{profile.username}
        </Text>
      )}

      {reviewed ? (
        <View style={styles.reviewedBadge}>
          <Text style={styles.reviewedText}>✓ Reviewed</Text>
        </View>
      ) : (
        <Pressable
          onPress={onReview}
          style={({ pressed }) => [
            styles.reviewBtn,
            pressed && styles.reviewBtnPressed,
          ]}
        >
          <Text style={styles.reviewBtnText}>★ Review</Text>
        </Pressable>
      )}
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    width: "46%",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#e0e0e0",
    marginBottom: 4,
  },
  name: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
  },
  username: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
  },
  reviewedBadge: {
    backgroundColor: "#e6f4ea",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  reviewedText: {
    fontSize: 12,
    color: "#2d7a3a",
    fontWeight: "600",
  },
  reviewBtn: {
    backgroundColor: "#111",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 4,
  },
  reviewBtnPressed: {
    opacity: 0.65,
  },
  reviewBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});

export default ReviewView;

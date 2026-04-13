import React from "react";
import { View, Text, StyleSheet } from "react-native";
import ReviewItem from "./ReviewItem";
import StarRating from "../../UI/StarRating";

/**
 * ReviewList
 *
 * Displays an average rating summary header followed by a list of
 * ReviewItem cards. Shows an empty-state message when there are no reviews.
 *
 * Props:
 *   reviews – array of review objects, each with an optional embedded
 *             `reviewer` profile (populated by the parent fetch).
 */
const ReviewList = ({ reviews = [] }) => {
  if (reviews.length === 0) {
    return <Text style={styles.empty}>No reviews yet.</Text>;
  }

  const avg =
    reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / reviews.length;
  const avgDisplay = avg.toFixed(1);

  return (
    <View style={styles.container}>
      {/* Summary row */}
      <View style={styles.summary}>
        <StarRating rating={Math.round(avg)} size={20} />
        <Text style={styles.avgText}>{avgDisplay}</Text>
        <Text style={styles.countText}>
          ({reviews.length} review{reviews.length !== 1 ? "s" : ""})
        </Text>
      </View>

      {/* Individual reviews */}
      <View style={styles.list}>
        {reviews.map((review, idx) => (
          <ReviewItem key={review.id ?? idx} review={review} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  avgText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F5A623",
  },
  countText: {
    fontSize: 13,
    color: "#888",
  },
  list: {
    gap: 10,
  },
  empty: {
    fontSize: 14,
    color: "#aaa",
    fontStyle: "italic",
  },
});

export default ReviewList;

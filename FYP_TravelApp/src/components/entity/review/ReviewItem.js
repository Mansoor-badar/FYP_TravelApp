import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import StarRating from "../../UI/StarRating";

const formatReviewDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/**
 * ReviewItem
 *
 * Displays a single review: reviewer avatar, name, star rating,
 * optional comment, and date.
 *
 * Props:
 *   review – review object. Expects an optional `reviewer` profile
 *            object embedded (populated by the parent fetch).
 */
const ReviewItem = ({ review }) => {
  if (!review) return null;

  const reviewer = review.reviewer ?? null;
  const avatarUri =
    reviewer?.profile_image_url || "https://i.sstatic.net/l60Hf.png";
  const reviewerName = reviewer
    ? `${reviewer.first_name ?? ""} ${reviewer.last_name ?? ""}`.trim() ||
      reviewer.username ||
      "—"
    : "Unknown User";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={{ uri: avatarUri }} style={styles.avatar} />
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{reviewerName}</Text>
          {!!reviewer?.username && (
            <Text style={styles.username}>@{reviewer.username}</Text>
          )}
        </View>
        <StarRating rating={review.rating ?? 0} size={16} />
      </View>

      {!!review.comment && <Text style={styles.comment}>{review.comment}</Text>}

      <Text style={styles.date}>{formatReviewDate(review.created_at)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fafafa",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 12,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e0e0e0",
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },
  username: {
    fontSize: 12,
    color: "#888",
  },
  comment: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  date: {
    fontSize: 12,
    color: "#aaa",
  },
});

export default ReviewItem;

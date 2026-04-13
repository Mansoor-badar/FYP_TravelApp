import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button, { ButtonTray } from "../../UI/Button";
import StarRating from "../../UI/StarRating";
import { ProfileCard } from "../Profile/ProfileView";
import API from "../../API/API";

/**
 * ReviewForm
 *
 * Full-screen modal for submitting a review for a target user on a trip.
 * Only renders when `visible` is true.
 *
 * Props:
 *   visible      – controls modal visibility
 *   trip         – trip object the review is linked to
 *   targetUser   – profile object of the user being reviewed
 *   reviewerId   – UUID of the current (reviewing) user
 *   onSuccess()  – called after a successful submission
 *   onCancel()   – called when the form is dismissed without submitting
 */
const ReviewForm = ({
  visible,
  trip,
  targetUser,
  reviewerId,
  onSuccess,
  onCancel,
}) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert(
        "Rating Required",
        "Please select a star rating before submitting.",
      );
      return;
    }

    setLoading(true);
    const res = await API.post("/rest/v1/reviews", {
      reviewer_id: reviewerId,
      target_user_id: targetUser?.id,
      trip_id: trip?.id,
      rating,
      comment: comment.trim() || null,
    });
    setLoading(false);

    if (res.isSuccess) {
      setRating(0);
      setComment("");
      onSuccess?.();
    } else {
      Alert.alert(
        "Error",
        res.message || "Could not submit review. Please try again.",
      );
    }
  };

  const handleCancel = () => {
    setRating(0);
    setComment("");
    onCancel?.();
  };

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Header ── */}
            <Text style={styles.title}>Leave a Review</Text>
            {!!trip?.title && (
              <Text style={styles.tripLabel}>Reviewing for: {trip.title}</Text>
            )}

            {/* ── Profile card of the person being reviewed ── */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Reviewing</Text>
              <ProfileCard profile={targetUser} />
            </View>

            {/* ── Star rating selector ── */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Your Rating</Text>
              <View style={styles.starRow}>
                <StarRating rating={rating} onRate={setRating} size={40} />
                {rating > 0 && (
                  <Text style={styles.ratingLabel}>{rating} / 5</Text>
                )}
              </View>
            </View>

            {/* ── Comment ── */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Comment (optional)</Text>
              <TextInput
                style={styles.input}
                value={comment}
                onChangeText={setComment}
                placeholder="Share your experience with this traveller..."
                placeholderTextColor="#aaa"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={styles.charCount}>{comment.length} / 500</Text>
            </View>
          </ScrollView>

          {/* ── Actions ── */}
          <ButtonTray style={styles.actions}>
            <Button
              label="Cancel"
              variant="secondary"
              onClick={handleCancel}
              disabled={loading}
            />
            <Button
              label="Submit Review"
              variant="primary"
              loading={loading}
              onClick={handleSubmit}
            />
          </ButtonTray>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  flex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
    marginBottom: 2,
  },
  tripLabel: {
    fontSize: 14,
    color: "#666",
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#000",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 4,
  },
  starRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 8,
  },
  ratingLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F5A623",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: "#111",
    minHeight: 100,
    backgroundColor: "#fafafa",
  },
  charCount: {
    fontSize: 12,
    color: "#aaa",
    textAlign: "right",
  },
  actions: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
  },
});

export default ReviewForm;

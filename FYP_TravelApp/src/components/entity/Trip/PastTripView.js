import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import API from "../../API/API";
import ReviewView from "../review/ReviewView";
import ReviewForm from "../review/ReviewForm";
import { formatDate } from "../../../utils/DateUtils";

// ── PastTripView ──────────────────────────────────────────────────────────────

/**
 * PastTripView
 *
 * Collapsible view for a completed trip shown in the "Past Trips"
 * section of HomeScreen. Displays trip details and lets the current
 * user review every person they travelled with (host + other accepted
 * participants). Data is loaded lazily on first expand.
 *
 * Props:
 *   trip    – trip object (must include id, title, destination, start_date, end_date, host_id)
 *   userId  – current user's UUID
 */
const PastTripView = ({ trip, userId }) => {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [companions, setCompanions] = useState([]);
  const [myReviews, setMyReviews] = useState([]);
  const [reviewModal, setReviewModal] = useState({
    visible: false,
    targetUser: null,
  });

  const dateRange = trip?.start_date
    ? `${formatDate(trip.start_date)}${trip.end_date ? ` → ${formatDate(trip.end_date)}` : ""}`
    : null;

  // ── Load companions + my reviews for this trip ─────────────────────────────

  const loadData = useCallback(async () => {
    if (!trip?.id || !userId) return;
    setLoading(true);

    // Fetch in parallel: accepted participants, host profile, my reviews
    const [partsRes, hostRes, reviewsRes] = await Promise.all([
      API.get(
        `/rest/v1/participants?trip_id=eq.${trip.id}&status=eq.accepted&select=*`,
      ),
      API.get(`/rest/v1/users?id=eq.${trip.host_id}&select=*`),
      API.get(
        `/rest/v1/reviews?reviewer_id=eq.${userId}&trip_id=eq.${trip.id}&select=*`,
      ),
    ]);

    setMyReviews(
      reviewsRes.isSuccess && Array.isArray(reviewsRes.result)
        ? reviewsRes.result
        : [],
    );

    const parts =
      partsRes.isSuccess && Array.isArray(partsRes.result)
        ? partsRes.result
        : [];

    const host =
      hostRes.isSuccess &&
      Array.isArray(hostRes.result) &&
      hostRes.result.length > 0
        ? hostRes.result[0]
        : null;

    // Fetch participant profiles (excluding current user)
    const participantProfiles = await Promise.all(
      parts
        .filter((p) => p.user_id !== userId)
        .map(async (p) => {
          const res = await API.get(
            `/rest/v1/users?id=eq.${p.user_id}&select=*`,
          );
          return res.isSuccess &&
            Array.isArray(res.result) &&
            res.result.length > 0
            ? res.result[0]
            : null;
        }),
    );

    // Build companion list: host first (if not current user), then other participants
    const people = [];
    if (host && host.id !== userId) people.push(host);
    people.push(...participantProfiles.filter(Boolean));

    setCompanions(people);
    setLoading(false);
  }, [trip?.id, userId]);

  // Load data the first time the view is expanded
  useEffect(() => {
    if (expanded && companions.length === 0 && !loading) {
      loadData();
    }
  }, [expanded, companions.length, loading, loadData]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleReviewSuccess = () => {
    setReviewModal({ visible: false, targetUser: null });
    Alert.alert("Review Submitted", "Your review has been saved.");
    loadData(); // refresh review statuses
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.card}>
      {/* Tappable header — toggles expanded view */}
      <Pressable
        onPress={() => setExpanded((prev) => !prev)}
        style={({ pressed }) => [
          styles.header,
          pressed && styles.headerPressed,
        ]}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{trip.title || "—"}</Text>
          {!!trip.destination && (
            <Text style={styles.destination}>{trip.destination}</Text>
          )}
          {!!dateRange && <Text style={styles.date}>{dateRange}</Text>}
        </View>
        <Text style={styles.chevron}>{expanded ? "▲" : "▼"}</Text>
      </Pressable>

      {/* Expanded body */}
      {expanded && (
        <View style={styles.body}>
          {!!trip.description && (
            <Text style={styles.description}>{trip.description}</Text>
          )}

          <Text style={styles.sectionLabel}>People you travelled with</Text>

          {loading ? (
            <ActivityIndicator
              size="small"
              color="#888"
              style={styles.loader}
            />
          ) : companions.length === 0 ? (
            <Text style={styles.empty}>No companions to review.</Text>
          ) : (
            <View style={styles.grid}>
              {companions.map((user) => {
                const reviewed = myReviews.some(
                  (r) => r.target_user_id === user.id,
                );
                return (
                  <ReviewView
                    key={user.id}
                    profile={user}
                    reviewed={reviewed}
                    onReview={() =>
                      setReviewModal({ visible: true, targetUser: user })
                    }
                  />
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Review modal */}
      <ReviewForm
        visible={reviewModal.visible}
        trip={trip}
        targetUser={reviewModal.targetUser}
        reviewerId={userId}
        onSuccess={handleReviewSuccess}
        onCancel={() => setReviewModal({ visible: false, targetUser: null })}
      />
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#fafafa",
    marginBottom: 10,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 14,
  },
  headerPressed: {
    opacity: 0.7,
  },
  headerLeft: {
    flex: 1,
    gap: 2,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },
  destination: {
    fontSize: 13,
    color: "#666",
  },
  date: {
    fontSize: 12,
    color: "#999",
  },
  chevron: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#eeeeee",
    paddingTop: 12,
  },
  loader: {
    marginVertical: 12,
  },
  description: {
    fontSize: 14,
    color: "#444",
    marginBottom: 10,
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "#888",
    marginBottom: 8,
  },
  empty: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    paddingVertical: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
});

export default PastTripView;

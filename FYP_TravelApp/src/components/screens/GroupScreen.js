import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import API from "../API/API";
import ReviewForm from "../entity/review/ReviewForm";

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => (n < 10 ? "0" + n : n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// ── ReviewableCard ────────────────────────────────────────────────────────────

/**
 * ReviewableCard
 *
 * Compact profile card with a "Review" or "Reviewed ✓" action.
 * Used to display reviewable users inside each TripReviewSection.
 *
 * Props:
 *   profile   – user profile object
 *   reviewed  – whether the current user has already reviewed this person
 *   onReview  – pressed handler for the Review button
 */
const ReviewableCard = ({ profile, reviewed, onReview }) => {
  if (!profile) return null;
  const fullName =
    `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "—";
  const avatarUri =
    profile.profile_image_url || "https://i.sstatic.net/l60Hf.png";

  return (
    <View style={styles.reviewableCard}>
      <Image source={{ uri: avatarUri }} style={styles.cardAvatar} />
      <Text style={styles.cardName} numberOfLines={1}>
        {fullName}
      </Text>
      {!!profile.username && (
        <Text style={styles.cardUsername} numberOfLines={1}>
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

// ── TripReviewSection ─────────────────────────────────────────────────────────

/**
 * TripReviewSection
 *
 * Shows a trip header (title, destination, date range) followed by a
 * grid of ReviewableCards for every user the current user can review
 * on that trip.
 *
 * Props:
 *   trip             – trip object
 *   reviewableUsers  – array of profile objects the viewer can review
 *   myReviews        – all reviews the current user has already given
 *   onOpenReview     – (trip, targetUser) → opens the ReviewForm
 */
const TripReviewSection = ({
  trip,
  reviewableUsers,
  myReviews,
  onOpenReview,
}) => {
  const dateRange = trip?.start_date
    ? `${formatDate(trip.start_date)}${trip?.end_date ? ` → ${formatDate(trip.end_date)}` : ""}`
    : null;

  const allDone = reviewableUsers.every((u) =>
    myReviews.some((r) => r.trip_id === trip.id && r.target_user_id === u.id),
  );

  return (
    <View style={styles.tripSection}>
      <View style={styles.tripHeader}>
        <Text style={styles.tripTitle}>{trip.title || "—"}</Text>
        {!!trip.destination && (
          <Text style={styles.tripDestination}>{trip.destination}</Text>
        )}
        {!!dateRange && <Text style={styles.tripDate}>{dateRange}</Text>}
        {allDone && reviewableUsers.length > 0 && (
          <View style={styles.allReviewedBadge}>
            <Text style={styles.allReviewedText}>All reviews submitted ✓</Text>
          </View>
        )}
      </View>

      {reviewableUsers.length === 0 ? (
        <Text style={styles.noUsers}>No participants to review.</Text>
      ) : (
        <View style={styles.cardGrid}>
          {reviewableUsers.map((user) => {
            const reviewed = myReviews.some(
              (r) => r.trip_id === trip.id && r.target_user_id === user.id,
            );
            return (
              <ReviewableCard
                key={user.id}
                profile={user}
                reviewed={reviewed}
                onReview={() => onOpenReview(trip, user)}
              />
            );
          })}
        </View>
      )}
    </View>
  );
};

// ── GroupScreen ───────────────────────────────────────────────────────────────

/**
 * GroupScreen
 *
 * Hub for post-trip reviews. Shows all past trips (ended) where the
 * current user was either an accepted participant or the host, and
 * lets them leave reviews for the relevant users.
 *
 * - Participant → can review the trip host
 * - Host        → can review each accepted participant
 */
const GroupScreen = () => {
  const userId = global.UserID ?? null;

  const [loading, setLoading] = useState(false);
  // { trip, reviewableUsers: profile[] } for trips I joined
  const [participatedTrips, setParticipatedTrips] = useState([]);
  // { trip, reviewableUsers: profile[] } for trips I hosted
  const [hostedTrips, setHostedTrips] = useState([]);
  // All reviews the current user has already submitted
  const [myReviews, setMyReviews] = useState([]);

  // Review form modal state
  const [reviewModal, setReviewModal] = useState({
    visible: false,
    trip: null,
    targetUser: null,
  });

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const today = new Date().toISOString().split("T")[0];

    // ── 1. Trips I joined (accepted participant) that have ended ─────────────
    const partRes = await API.get(
      `/rest/v1/participants?user_id=eq.${userId}&status=eq.accepted&select=*`,
    );
    const participations =
      partRes.isSuccess && Array.isArray(partRes.result) ? partRes.result : [];

    const participatedData = await Promise.all(
      participations.map(async (p) => {
        const tripRes = await API.get(
          `/rest/v1/trips?id=eq.${p.trip_id}&end_date=lte.${today}&select=*`,
        );
        if (
          !tripRes.isSuccess ||
          !Array.isArray(tripRes.result) ||
          tripRes.result.length === 0
        )
          return null;

        const trip = tripRes.result[0];
        // Skip trips where the user is also the host
        if (trip.host_id === userId) return null;

        const hostRes = await API.get(
          `/rest/v1/users?id=eq.${trip.host_id}&select=*`,
        );
        const hostProfile =
          hostRes.isSuccess &&
          Array.isArray(hostRes.result) &&
          hostRes.result.length > 0
            ? hostRes.result[0]
            : null;

        return { trip, reviewableUsers: hostProfile ? [hostProfile] : [] };
      }),
    );
    setParticipatedTrips(participatedData.filter(Boolean));

    // ── 2. Trips I hosted that have ended ─────────────────────────────────
    const hostedRes = await API.get(
      `/rest/v1/trips?host_id=eq.${userId}&end_date=lte.${today}&select=*`,
    );
    const hosted =
      hostedRes.isSuccess && Array.isArray(hostedRes.result)
        ? hostedRes.result
        : [];

    const hostedData = await Promise.all(
      hosted.map(async (trip) => {
        const partsRes = await API.get(
          `/rest/v1/participants?trip_id=eq.${trip.id}&status=eq.accepted&select=*`,
        );
        const parts =
          partsRes.isSuccess && Array.isArray(partsRes.result)
            ? partsRes.result
            : [];

        const profiles = await Promise.all(
          parts.map(async (p) => {
            const profileRes = await API.get(
              `/rest/v1/users?id=eq.${p.user_id}&select=*`,
            );
            return profileRes.isSuccess &&
              Array.isArray(profileRes.result) &&
              profileRes.result.length > 0
              ? profileRes.result[0]
              : null;
          }),
        );

        return { trip, reviewableUsers: profiles.filter(Boolean) };
      }),
    );
    setHostedTrips(hostedData);

    // ── 3. All reviews I have already given ───────────────────────────────
    const reviewsRes = await API.get(
      `/rest/v1/reviews?reviewer_id=eq.${userId}&select=*`,
    );
    setMyReviews(
      reviewsRes.isSuccess && Array.isArray(reviewsRes.result)
        ? reviewsRes.result
        : [],
    );

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleOpenReview = (trip, targetUser) => {
    setReviewModal({ visible: true, trip, targetUser });
  };

  const handleReviewSuccess = () => {
    setReviewModal({ visible: false, trip: null, targetUser: null });
    Alert.alert("Review Submitted", "Your review has been saved.");
    fetchData();
  };

  const handleReviewCancel = () => {
    setReviewModal({ visible: false, trip: null, targetUser: null });
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const allSections = [
    ...participatedTrips.map((t) => ({ ...t, role: "participant" })),
    ...hostedTrips.map((t) => ({ ...t, role: "host" })),
  ];

  const hasPendingReviews = allSections.some((t) =>
    t.reviewableUsers.some(
      (u) =>
        !myReviews.some(
          (r) => r.trip_id === t.trip.id && r.target_user_id === u.id,
        ),
    ),
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.header}>Group & Reviews</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#000" style={styles.loader} />
        ) : !userId ? (
          <Text style={styles.emptyHint}>
            Please log in to view your group activity.
          </Text>
        ) : allSections.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No past trips yet</Text>
            <Text style={styles.emptyHint}>
              Once your trips have ended, you'll be able to review your fellow
              travellers here.
            </Text>
          </View>
        ) : (
          <>
            {/* Pending reviews banner */}
            {hasPendingReviews && (
              <View style={styles.pendingBanner}>
                <Text style={styles.pendingText}>
                  ⭐ You have pending reviews to submit
                </Text>
              </View>
            )}

            {/* Trips I joined – review the host */}
            {participatedTrips.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Trips I Joined</Text>
                <Text style={styles.sectionSub}>
                  Review the host of your past trips
                </Text>
                {participatedTrips.map((item) => (
                  <TripReviewSection
                    key={item.trip.id}
                    trip={item.trip}
                    reviewableUsers={item.reviewableUsers}
                    myReviews={myReviews}
                    onOpenReview={handleOpenReview}
                  />
                ))}
              </View>
            )}

            {/* Trips I hosted – review each participant */}
            {hostedTrips.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Trips I Hosted</Text>
                <Text style={styles.sectionSub}>
                  Review participants of your past trips
                </Text>
                {hostedTrips.map((item) => (
                  <TripReviewSection
                    key={item.trip.id}
                    trip={item.trip}
                    reviewableUsers={item.reviewableUsers}
                    myReviews={myReviews}
                    onOpenReview={handleOpenReview}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Review submission modal */}
      <ReviewForm
        visible={reviewModal.visible}
        trip={reviewModal.trip}
        targetUser={reviewModal.targetUser}
        reviewerId={userId}
        onSuccess={handleReviewSuccess}
        onCancel={handleReviewCancel}
      />
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scroll: { paddingHorizontal: 20, paddingVertical: 12, paddingBottom: 40 },

  header: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    marginTop: 8,
    marginBottom: 16,
  },
  loader: { marginTop: 40 },

  // Empty state
  emptyState: { marginTop: 60, alignItems: "center", gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111" },
  emptyHint: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
  },

  // Pending banner
  pendingBanner: {
    backgroundColor: "#fffbea",
    borderWidth: 1,
    borderColor: "#F5A623",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  pendingText: { fontSize: 14, fontWeight: "600", color: "#b07a00" },

  // Sections
  section: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#000",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 4,
    marginBottom: 4,
  },
  sectionSub: { fontSize: 13, color: "#888", marginBottom: 12 },

  // Trip section card
  tripSection: {
    marginBottom: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 12,
    backgroundColor: "#fafafa",
  },
  tripHeader: { marginBottom: 12, gap: 2 },
  tripTitle: { fontSize: 16, fontWeight: "700", color: "#111" },
  tripDestination: { fontSize: 13, color: "#666" },
  tripDate: { fontSize: 12, color: "#999" },
  allReviewedBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#e6f4ea",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 4,
  },
  allReviewedText: { fontSize: 12, color: "#2d7a3a", fontWeight: "600" },

  noUsers: { fontSize: 13, color: "#aaa", fontStyle: "italic" },

  // Card grid
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  // ReviewableCard
  reviewableCard: {
    width: "46%",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  cardAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#e0e0e0",
    marginBottom: 4,
  },
  cardName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
  },
  cardUsername: { fontSize: 12, color: "#999", textAlign: "center" },
  reviewBtn: {
    marginTop: 8,
    backgroundColor: "#000",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  reviewBtnPressed: { opacity: 0.7 },
  reviewBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  reviewedBadge: {
    marginTop: 8,
    backgroundColor: "#e6f4ea",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  reviewedText: { color: "#2d7a3a", fontSize: 12, fontWeight: "600" },
});

export default GroupScreen;

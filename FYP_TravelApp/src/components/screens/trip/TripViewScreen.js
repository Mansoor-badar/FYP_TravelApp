import React, { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import API from "../../API/API";
import Button, { ButtonTray } from "../../UI/Button";
import BackButton from "../../UI/common/BackButton";
import StatusBanner from "../../UI/common/StatusBanner";
import LoadingSpinner from "../../UI/common/LoadingSpinner";
import { ProfileCard } from "../../entity/Profile/ProfileView";
import ProfileView from "../../entity/Profile/ProfileView";
import ParticipantCard from "../../entity/Profile/ParticipantCard";
import CountdownTimer from "../../UI/CountdownTimer";
import { formatDate, endOfUTCDay } from "../../../utils/DateUtils";
import ItineraryItemView from "../../entity/ItineraryItem/ItineraryItemView";

// ── Main screen ───────────────────────────────────────────────────────────────

/**
 * TripViewScreen
 *
 * Full trip detail screen with participant management.
 *
 * route.params:
 *   trip   – the trip object to display (required)
 */
const TripViewScreen = ({ navigation, route }) => {
  const { trip: initialTrip } = route.params;
  const [trip, setTrip] = useState(initialTrip);
  const userId = global.UserID ?? null;
  const isHost = trip?.host_id === userId;

  // ── State ──────────────────────────────────────────────────────────────────
  const [participants, setParticipants] = useState([]);
  const [myParticipation, setMyParticipation] = useState(null);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  const [hostProfile, setHostProfile] = useState(null);

  const [itineraryItems, setItineraryItems] = useState([]);
  const [loadingItinerary, setLoadingItinerary] = useState(false);

  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [modalReviews, setModalReviews] = useState(null);
  const [loadingModalReviews, setLoadingModalReviews] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchParticipants = useCallback(async () => {
    if (!trip?.id) return;
    setLoadingParticipants(true);

    const res = await API.get(
      `/rest/v1/participants?trip_id=eq.${trip.id}&select=*`,
    );
    if (!res.isSuccess) {
      setLoadingParticipants(false);
      return;
    }

    const rows = Array.isArray(res.result)
      ? res.result
      : res.result
        ? [res.result]
        : [];

    // Fetch each participant's profile
    const withProfiles = await Promise.all(
      rows.map(async (p) => {
        const profileRes = await API.get(
          `/rest/v1/users?id=eq.${p.user_id}&select=*`,
        );
        const profile =
          profileRes.isSuccess &&
          Array.isArray(profileRes.result) &&
          profileRes.result.length > 0
            ? profileRes.result[0]
            : null;
        return { ...p, profile };
      }),
    );

    setParticipants(withProfiles);
    setMyParticipation(withProfiles.find((p) => p.user_id === userId) ?? null);
    setLoadingParticipants(false);
  }, [trip?.id, userId]);

  const fetchItinerary = useCallback(async () => {
    if (!trip?.id) return;
    setLoadingItinerary(true);
    const res = await API.get(
      `/rest/v1/itinerary_items?trip_id=eq.${trip.id}&select=*`,
    );
    if (res.isSuccess) {
      setItineraryItems(Array.isArray(res.result) ? res.result : []);
    }
    setLoadingItinerary(false);
  }, [trip?.id]);

  const fetchHostProfile = useCallback(async () => {
    if (!trip?.host_id) return;
    const res = await API.get(`/rest/v1/users?id=eq.${trip.host_id}&select=*`);
    if (res.isSuccess && Array.isArray(res.result) && res.result.length > 0) {
      setHostProfile(res.result[0]);
    }
  }, [trip?.host_id]);

  useEffect(() => {
    fetchParticipants();
    fetchHostProfile();
  }, [fetchParticipants, fetchHostProfile]);

  // Refetch itinerary when screen comes back into focus (e.g. after ItineraryAddScreen)
  useFocusEffect(
    useCallback(() => {
      fetchItinerary();
    }, [fetchItinerary]),
  );

  // ── Derived data ───────────────────────────────────────────────────────────

  const acceptedParticipants = participants.filter(
    (p) => p.status === "accepted",
  );
  const pendingRequests = participants.filter((p) => p.status === "pending");

  // Public trips: anyone (even non-members) can see who's joined
  const canSeeMembers =
    isHost || myParticipation?.status === "accepted" || trip.is_public;

  // ── Trip state helpers ────────────────────────────────────────────────────

  const now = new Date();
  const tripStarted = !!trip?.start_date && new Date(trip.start_date) <= now;
  // Use end-of-UTC-day so a trip ending "today" stays active for the full day
  const tripEnded = (() => {
    const eod = endOfUTCDay(trip?.end_date);
    return !!eod && eod < now;
  })();

  // ── Participant actions ────────────────────────────────────────────────────

  const handleJoinOrRequest = async () => {
    if (!userId) {
      Alert.alert("Authentication Required", "You must be logged in.");
      return;
    }
    setActionLoading(true);

    // One-trip-at-a-time: block if user is already accepted in any trip that hasn't ended.
    // Pending requests don't count — only a confirmed acceptance blocks.
    const existingRes = await API.get(
      `/rest/v1/participants?user_id=eq.${userId}&status=eq.accepted&select=trip_id`,
    );
    if (
      existingRes.isSuccess &&
      Array.isArray(existingRes.result) &&
      existingRes.result.length > 0
    ) {
      const existingTripIds = existingRes.result.map((p) => p.trip_id);
      const tripsRes = await API.get(
        `/rest/v1/trips?id=in.(${existingTripIds.join(",")})&select=id,start_date,end_date`,
      );
      if (tripsRes.isSuccess && Array.isArray(tripsRes.result)) {
        // Block whether the overlapping trip has started or not — only allow once it ends
        const hasActiveTrip = tripsRes.result.some((t) => {
          const eod = endOfUTCDay(t.end_date);
          return !eod || eod >= now;
        });
        if (hasActiveTrip) {
          setActionLoading(false);
          Alert.alert(
            "One Trip at a Time",
            "You are already in an active trip. Please leave it or wait for it to end before joining another.",
          );
          return;
        }
      }
    }

    // Public trips: join immediately. Private trips: send a pending request for host approval.
    const joinStatus = trip.is_public ? "accepted" : "pending";
    const res = await API.post(`/rest/v1/participants`, {
      trip_id: trip.id,
      user_id: userId,
      status: joinStatus,
    });
    setActionLoading(false);
    if (res.isSuccess) {
      Alert.alert(
        "Success",
        trip.is_public
          ? "You have joined the trip!"
          : "Your join request has been sent to the host!",
      );
      fetchParticipants();
    } else {
      Alert.alert("Error", res.message || "Could not join trip.");
    }
  };

  const handleAccept = async (participant) => {
    setActionLoading(true);
    const res = await API.patch(
      `/rest/v1/participants?id=eq.${participant.id}`,
      { status: "accepted" },
    );
    setActionLoading(false);
    if (res.isSuccess) {
      fetchParticipants();
    } else {
      Alert.alert("Error", res.message || "Could not accept request.");
    }
  };

  const handleReject = (participant) => {
    Alert.alert(
      "Reject Request",
      `Reject ${participant.profile?.username ?? "this user"}'s request?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            const res = await API.patch(
              `/rest/v1/participants?id=eq.${participant.id}`,
              { status: "rejected" },
            );
            setActionLoading(false);
            if (res.isSuccess) {
              fetchParticipants();
            } else {
              Alert.alert("Error", res.message || "Could not reject request.");
            }
          },
        },
      ],
    );
  };

  const handleLeaveTrip = () => {
    Alert.alert("Leave Trip", "Are you sure you want to leave this trip?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          if (!myParticipation) return;
          const res = await API.delete(
            `/rest/v1/participants?id=eq.${myParticipation.id}`,
          );
          if (res.isSuccess) {
            Alert.alert("Done", "You have left the trip.", [
              { text: "OK", onPress: () => navigation.goBack() },
            ]);
          } else {
            Alert.alert("Error", res.message || "Could not leave trip.");
          }
        },
      },
    ]);
  };

  // ── Trip management (host) ─────────────────────────────────────────────────

  const handleEditTrip = () => {
    navigation.navigate("TripModify", { trip });
  };

  const handleDeleteTrip = () => {
    Alert.alert(
      "Delete Trip",
      "Delete this trip permanently? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const res = await API.delete(`/rest/v1/trips?id=eq.${trip.id}`);
            if (res.isSuccess) {
              Alert.alert("Deleted", "Trip has been deleted.", [
                { text: "OK", onPress: () => navigation.goBack() },
              ]);
            } else {
              Alert.alert("Error", res.message || "Could not delete trip.");
            }
          },
        },
      ],
    );
  };

  // ── Profile modal ──────────────────────────────────────────────────────────

  const handleViewProfile = async (profile) => {
    if (!profile) return;
    setSelectedProfile(profile);
    setModalReviews(null);
    setShowProfileModal(true);

    // Fetch reviews for the selected profile
    setLoadingModalReviews(true);
    const reviewsRes = await API.get(
      `/rest/v1/reviews?target_user_id=eq.${profile.id}&select=*&order=created_at.desc`,
    );
    const reviews =
      reviewsRes.isSuccess && Array.isArray(reviewsRes.result)
        ? reviewsRes.result
        : [];

    if (reviews.length === 0) {
      setModalReviews([]);
      setLoadingModalReviews(false);
      return;
    }

    // Batch-fetch reviewer profiles
    const reviewerIds = [...new Set(reviews.map((r) => r.reviewer_id))];
    const profilesRes = await API.get(
      `/rest/v1/users?id=in.(${reviewerIds.join(",")})&select=*`,
    );
    const profiles =
      profilesRes.isSuccess && Array.isArray(profilesRes.result)
        ? profilesRes.result
        : [];
    const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));

    setModalReviews(
      reviews.map((r) => ({
        ...r,
        reviewer: profileMap[r.reviewer_id] ?? null,
      })),
    );
    setLoadingModalReviews(false);
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  const dateRange = trip?.start_date
    ? `${formatDate(trip.start_date)}${trip?.end_date ? ` → ${formatDate(trip.end_date)}` : ""}`
    : null;

  const statusStyle =
    myParticipation?.status === "accepted"
      ? styles.statusAccepted
      : myParticipation?.status === "rejected"
        ? styles.statusRejected
        : styles.statusPending;

  const statusLabel =
    myParticipation?.status === "accepted"
      ? "✓ You are a member of this trip"
      : myParticipation?.status === "rejected"
        ? "✗ Your request was declined"
        : "⏳ Your join request is pending approval";

  // ── View ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>{trip.title || "—"}</Text>
            <View
              style={[
                styles.badge,
                trip.is_public ? styles.badgePublic : styles.badgePrivate,
              ]}
            >
              <Text style={styles.badgeText}>
                {trip.is_public ? "Public" : "Private"}
              </Text>
            </View>
          </View>
          <BackButton onPress={() => navigation.goBack()} label="← Back" />
        </View>

        {/* ── Trip details ── */}
        {!!trip.destination && (
          <Text style={styles.destination}>{trip.destination}</Text>
        )}
        {!!dateRange && <Text style={styles.metaText}>{dateRange}</Text>}
        {!!trip.description && (
          <Text style={styles.description}>{trip.description}</Text>
        )}

        {/* ── Countdown timer (host + accepted members only) ── */}
        {(isHost || myParticipation?.status === "accepted") && (
          <CountdownTimer
            startDate={trip.start_date}
            endDate={trip.end_date}
            startLabel="Trip starts in"
            endLabel="Trip ends in"
          />
        )}

        {(trip.budget_category ||
          trip.primary_purpose ||
          trip.host_rules ||
          trip.number_of_participants != null) && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Details</Text>
            {!!trip.budget_category && (
              <Text style={styles.bodyText}>
                Budget: {trip.budget_category}
              </Text>
            )}
            {!!trip.primary_purpose && (
              <Text style={styles.bodyText}>
                Purpose: {trip.primary_purpose}
              </Text>
            )}
            {!!trip.host_rules && (
              <Text style={styles.bodyText}>Host Rules: {trip.host_rules}</Text>
            )}
            {trip.number_of_participants != null && (
              <Text style={styles.bodyText}>
                Max Participants: {trip.number_of_participants}
              </Text>
            )}
          </View>
        )}

        {/* ── My participation status badge ── */}
        {!isHost && myParticipation && (
          <StatusBanner
            text={statusLabel}
            variant={
              myParticipation.status === "accepted"
                ? "accepted"
                : myParticipation.status === "rejected"
                ? "rejected"
                : "pending"
            }
            style={{ marginTop: 14 }}
          />
        )}

        {/* ── Join / Request to Join (non-member, non-host, trip not yet started) ── */}
        {/* Public trips: join immediately. Private trips: send request for host approval. */}
        {!isHost &&
          (!myParticipation || myParticipation.status === "rejected") &&
          !tripStarted && (
            <Button
              label={trip.is_public ? "Join Trip" : "Request to Join"}
              variant="primary"
              loading={actionLoading}
              onClick={handleJoinOrRequest}
              styleButton={styles.actionBtn}
            />
          )}

        {/* ── Leave Trip / In-progress notice (accepted participant) ── */}
        {!isHost &&
          myParticipation?.status === "accepted" &&
          !tripEnded &&
          (tripStarted ? (
            <StatusBanner
              text="⚠ Trip is in progress — you cannot leave now"
              variant="warning"
              style={{ marginTop: 14 }}
            />
          ) : (
            <Button
              label="Leave Trip"
              variant="danger"
              loading={actionLoading}
              onClick={handleLeaveTrip}
              styleButton={styles.actionBtn}
            />
          ))}

        {/* ── Itinerary (host or accepted participant) ── */}
        {(isHost || myParticipation?.status === "accepted") && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Itinerary</Text>
            {loadingItinerary ? (
              <ActivityIndicator size="small" color="#000" />
            ) : itineraryItems.length === 0 ? (
              <Text style={styles.empty}>No activities planned yet.</Text>
            ) : (
              itineraryItems.map((it, idx) => (
                <ItineraryItemView
                  key={it.id ?? idx}
                  item={it}
                  index={idx}
                  isHost={isHost}
                  listItem
                  onModify={(updated) =>
                    setItineraryItems((prev) =>
                      prev.map((x) => (x.id === updated.id ? updated : x)),
                    )
                  }
                  onDelete={(deleted) =>
                    setItineraryItems((prev) =>
                      prev.filter((x) => x.id !== deleted.id),
                    )
                  }
                />
              ))
            )}
            {isHost && (
              <Button
                label="+ Add Activity"
                variant="secondary"
                onClick={() =>
                  navigation.navigate("ItineraryAdd", { tripId: trip.id })
                }
                styleButton={{ marginTop: 10 }}
              />
            )}
          </View>
        )}

        {/* ── Members section ── */}
        {canSeeMembers && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              Members ({acceptedParticipants.length + 1} incl. host)
            </Text>
            {loadingParticipants ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <View style={styles.cardGrid}>
                {/* Host card */}
                {hostProfile && (
                  <ParticipantCard
                    profile={hostProfile}
                    onViewProfile={handleViewProfile}
                    isHost
                  />
                )}
                {/* Accepted participant cards */}
                {acceptedParticipants.map((p) => (
                  <ParticipantCard
                    key={p.id}
                    profile={p.profile}
                    onViewProfile={handleViewProfile}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── Join Requests (host only, private trip) ── */}
        {isHost && !trip.is_public && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              Join Requests ({pendingRequests.length})
            </Text>
            {loadingParticipants ? (
              <ActivityIndicator size="small" color="#000" />
            ) : pendingRequests.length === 0 ? (
              <Text style={styles.empty}>No pending requests.</Text>
            ) : (
              pendingRequests.map((p) => (
                <View key={p.id} style={styles.requestRow}>
                  <ProfileCard
                    profile={p.profile}
                    onPress={() => handleViewProfile(p.profile)}
                  />
                  <ButtonTray style={styles.requestActions}>
                    <Button
                      label="Accept"
                      variant="primary"
                      loading={actionLoading}
                      onClick={() => handleAccept(p)}
                    />
                    <Button
                      label="Reject"
                      variant="danger"
                      loading={actionLoading}
                      onClick={() => handleReject(p)}
                    />
                  </ButtonTray>
                </View>
              ))
            )}
          </View>
        )}

        {/* ── Host actions ── */}
        {isHost && (
          <ButtonTray style={styles.hostActions}>
            <Button
              label="Edit Trip"
              variant="secondary"
              onClick={handleEditTrip}
            />
            <Button
              label="Delete Trip"
              variant="danger"
              onClick={handleDeleteTrip}
            />
          </ButtonTray>
        )}
      </ScrollView>

      {/* ── Profile modal ── */}
      <Modal visible={showProfileModal} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <ProfileView
              profile={selectedProfile}
              circularAvatar
              reviews={modalReviews}
            />
            {loadingModalReviews && (
              <ActivityIndicator
                size="small"
                color="#888"
                style={styles.reviewsLoader}
              />
            )}
          </ScrollView>
          <Button
            label="Close"
            variant="primary"
            onClick={() => setShowProfileModal(false)}
            styleButton={styles.modalClose}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scroll: { paddingHorizontal: 20, paddingVertical: 12, paddingBottom: 40 },

  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  headerLeft: { flex: 1, gap: 6, marginRight: 12 },
  title: { fontSize: 22, fontWeight: "700", color: "#111" },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgePublic: { backgroundColor: "#007AFF" },
  badgePrivate: { backgroundColor: "#888" },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ccc",
    alignSelf: "flex-start",
  },
  backBtnText: { fontSize: 14, color: "#555" },

  // Trip details
  destination: { fontSize: 16, color: "#555", marginBottom: 4 },
  metaText: { fontSize: 13, color: "#888", marginBottom: 6 },
  description: { fontSize: 15, color: "#333", marginBottom: 8 },

  // Section
  section: { marginTop: 20, gap: 8 },
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
  bodyText: { fontSize: 14, color: "#333" },
  empty: { fontSize: 14, color: "#aaa", fontStyle: "italic" },

  // Status banner
  statusBanner: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  statusAccepted: { backgroundColor: "#e6f4ea" },
  statusPending: { backgroundColor: "#fff8e1" },
  statusRejected: { backgroundColor: "#fce8e8" },
  statusStarted: { backgroundColor: "#fff3e0" },
  statusText: { fontSize: 14, fontWeight: "600", color: "#333" },

  // Action button
  actionBtn: { marginTop: 14 },

  // Itinerary
  itRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  itIndex: { fontSize: 13, color: "#bbb", width: 20, paddingTop: 1 },
  itInfo: { flex: 1 },
  itName: { fontSize: 14, color: "#111", fontWeight: "500" },
  itTime: { fontSize: 12, color: "#888", marginTop: 2 },

  // Participant card grid
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 4,
  },
  participantCard: {
    width: "46%",
    backgroundColor: "#fafafa",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  cardAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#e0e0e0",
    marginBottom: 6,
  },
  cardName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
  },
  cardUsername: { fontSize: 12, color: "#999", textAlign: "center" },
  viewProfileBtn: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#000",
  },
  viewProfileBtnPressed: { opacity: 0.5 },
  viewProfileText: { fontSize: 12, fontWeight: "600", color: "#000" },
  hostLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#007AFF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Join request row
  requestRow: {
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 10,
    backgroundColor: "#fafafa",
  },
  requestActions: { marginTop: 8, gap: 8 },

  // Host actions
  hostActions: { marginTop: 24, gap: 10 },

  // Profile modal
  modalContainer: { flex: 1, backgroundColor: "#fff" },
  modalScroll: { paddingHorizontal: 20, paddingVertical: 16 },
  modalClose: { margin: 16 },
  reviewsLoader: { marginTop: 12, marginBottom: 8 },
});

export default TripViewScreen;

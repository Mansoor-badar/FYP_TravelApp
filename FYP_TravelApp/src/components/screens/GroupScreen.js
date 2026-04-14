import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import API from "../API/API";
import Button from "../UI/Button";
import PollList from "../entity/Poll/PollList";
import { PollPopup } from "../entity/Poll/PollView";

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GroupScreen
 *
 * Responsibilities:
 *   - Show the user's trips (host or accepted member) as selectable chips.
 *   - Fetch and display polls for the selected trip.
 *   - Let the user open a poll detail popup to view results / vote.
 *   - Navigate to AddPollScreen for poll creation.
 *
 * Poll creation logic lives entirely in AddPollScreen + PollForm.
 */
const GroupScreen = ({ navigation }) => {
  const userId = global.UserID ?? null;

  // ── My trips (host OR accepted participant) ──────────────────────────────
  const [myTrips, setMyTrips] = useState([]); // [{ trip, memberCount }]
  const [selectedTripIndex, setSelectedTripIndex] = useState(0);
  const [loadingTrips, setLoadingTrips] = useState(false);

  // ── Polls for the selected trip ──────────────────────────────────────────
  const [polls, setPolls] = useState([]);
  const [loadingPolls, setLoadingPolls] = useState(false);

  // ── Poll detail popup ────────────────────────────────────────────────────
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [showPollPopup, setShowPollPopup] = useState(false);

  // ── Per-session vote tracking (which poll IDs the user has voted in) ────
  const votedPollIdsRef = useRef(new Set());
  const [votedPollIds, setVotedPollIds] = useState(new Set());

  // ─── Derived: currently selected trip entry ───────────────────────────────
  const selectedEntry = myTrips[selectedTripIndex] ?? null;
  const selectedTrip = selectedEntry?.trip ?? null;
  const memberCount = selectedEntry?.memberCount ?? 0;

  // ─────────────────────────────────────────────────────────────────────────
  // fetchMyTrips
  //   Loads every trip where the current user is the host OR an accepted
  //   participant, along with each trip's accepted-member count.
  // ─────────────────────────────────────────────────────────────────────────
  const fetchMyTrips = useCallback(async () => {
    if (!userId) return;
    setLoadingTrips(true);

    const [tripsRes, participationsRes] = await Promise.all([
      API.get(`/rest/v1/trips?select=*`),
      API.get(
        `/rest/v1/participants?user_id=eq.${userId}&status=eq.accepted&select=trip_id`
      ),
    ]);

    if (!tripsRes.isSuccess) {
      setLoadingTrips(false);
      return;
    }

    const allTrips = Array.isArray(tripsRes.result)
      ? tripsRes.result
      : tripsRes.result
      ? [tripsRes.result]
      : [];

    const myJoinedTripIds = new Set(
      participationsRes.isSuccess && Array.isArray(participationsRes.result)
        ? participationsRes.result.map((p) => p.trip_id)
        : []
    );

    // Keep trips where I'm host OR accepted participant
    const eligible = allTrips.filter(
      (t) => t.host_id === userId || myJoinedTripIds.has(t.id)
    );

    // Fetch accepted-participant counts for each eligible trip
    const withCounts = await Promise.all(
      eligible.map(async (trip) => {
        const countRes = await API.get(
          `/rest/v1/participants?trip_id=eq.${trip.id}&status=eq.accepted&select=user_id`
        );
        const rows =
          countRes.isSuccess && Array.isArray(countRes.result)
            ? countRes.result
            : [];
        // +1 to include the host (who is not in the participants table)
        return { trip, memberCount: rows.length + 1 };
      })
    );

    setMyTrips(withCounts);
    setSelectedTripIndex((prev) => (prev >= withCounts.length ? 0 : prev));
    setLoadingTrips(false);
  }, [userId]);

  // ─────────────────────────────────────────────────────────────────────────
  // fetchPolls
  //   Loads all polls for a given tripId from the `trip_polls` table, then
  //   fetches each poll's options from `poll_options`.
  //
  //   NOTE: The `trip_polls` table only has columns:
  //     id, trip_id, question, created_by
  //   There is NO `created_at` column, so we do NOT order by it.
  // ─────────────────────────────────────────────────────────────────────────
  const fetchPolls = useCallback(async (tripId) => {
    if (!tripId) {
      setPolls([]);
      return;
    }
    setLoadingPolls(true);

    // ✅ No order clause — trip_polls has no created_at column
    const pollsRes = await API.get(
      `/rest/v1/trip_polls?trip_id=eq.${tripId}&select=*`
    );

    if (!pollsRes.isSuccess) {
      console.warn("fetchPolls error:", pollsRes.message);
      setPolls([]);
      setLoadingPolls(false);
      return;
    }

    const pollRows = Array.isArray(pollsRes.result)
      ? pollsRes.result
      : pollsRes.result
      ? [pollsRes.result]
      : [];

    if (pollRows.length === 0) {
      setPolls([]);
      setLoadingPolls(false);
      return;
    }

    // Fetch options for every poll in parallel
    const pollsWithOptions = await Promise.all(
      pollRows.map(async (poll) => {
        const optsRes = await API.get(
          `/rest/v1/poll_options?poll_id=eq.${poll.id}&select=*`
        );
        const opts =
          optsRes.isSuccess && Array.isArray(optsRes.result)
            ? optsRes.result
            : [];
        return { ...poll, options: opts };
      })
    );

    setPolls(pollsWithOptions);
    setLoadingPolls(false);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Effects
  //
  // useFocusEffect → re-fetch trips every time the screen gains focus.
  //   This covers returning from AddPollScreen, navigating back from other
  //   tabs, etc.
  //
  // useEffect([myTrips, selectedTripIndex]) → re-fetch polls whenever the
  //   trip list or the selected index changes.
  //   Using `useEffect` (NOT `useFocusEffect`) here is intentional:
  //   `useFocusEffect` does not re-run when its callback dependencies change
  //   while the screen is already focused, so poll fetching would never
  //   trigger after the async trip-fetch completes.
  // ─────────────────────────────────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      fetchMyTrips();
    }, [fetchMyTrips])
  );

  useEffect(() => {
    const entry = myTrips[selectedTripIndex] ?? null;
    const tripId = entry?.trip?.id ?? null;
    fetchPolls(tripId);
  }, [myTrips, selectedTripIndex, fetchPolls]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleSelectTrip = (index) => {
    if (index === selectedTripIndex) return;
    setPolls([]); // clear immediately so the old list doesn't flash
    setSelectedTripIndex(index);
  };

  const handleSelectPoll = (poll) => {
    setSelectedPoll(poll);
    setShowPollPopup(true);
  };

  const handleVoteCast = (pollId, _optionId, updatedOptions) => {
    votedPollIdsRef.current.add(pollId);
    setVotedPollIds(new Set(votedPollIdsRef.current));

    setPolls((prev) =>
      prev.map((p) => (p.id === pollId ? { ...p, options: updatedOptions } : p))
    );
    setSelectedPoll((prev) =>
      prev?.id === pollId ? { ...prev, options: updatedOptions } : prev
    );
  };

  const handlePollDeleted = (deletedPoll) => {
    setPolls((prev) => prev.filter((p) => p.id !== deletedPoll.id));
    setShowPollPopup(false);
    setSelectedPoll(null);
  };

  const canDeletePoll =
    selectedPoll?.created_by === userId || selectedTrip?.host_id === userId;

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!userId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            Please log in to view your group.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>

        {/* ── Page header ── */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Group</Text>
        </View>

        {loadingTrips ? (
          <ActivityIndicator size="large" color="#000" style={{ marginTop: 24 }} />
        ) : myTrips.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>
              You are not a member of any active trip.{"\n"}
              Join or create a trip first.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Trip selector ── */}
            <View style={styles.selectorSection}>
              <Text style={styles.sectionLabel}>Your Trips</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tripSelector}
              >
                {myTrips.map(({ trip }, idx) => {
                  const isSelected = idx === selectedTripIndex;
                  return (
                    <Pressable
                      key={trip.id}
                      onPress={() => handleSelectTrip(idx)}
                      style={({ pressed }) => [
                        styles.tripChip,
                        isSelected && styles.tripChipSelected,
                        pressed && styles.tripChipPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tripChipText,
                          isSelected && styles.tripChipTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {trip.title || "—"}
                      </Text>
                      {trip.host_id === userId && (
                        <View style={styles.hostDot} />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>

              {selectedTrip && (
                <Text style={styles.tripMeta}>
                  {selectedTrip.destination
                    ? `📍 ${selectedTrip.destination} · `
                    : ""}
                  {memberCount} member{memberCount !== 1 ? "s" : ""}
                  {selectedTrip.host_id === userId ? " · You are the host" : ""}
                </Text>
              )}
            </View>

            {/* ── Polls section ── */}
            {selectedTrip && (
              <View style={styles.pollsSection}>
                {/* Header row: label + add button */}
                <View style={styles.pollsHeader}>
                  <Text style={styles.sectionLabel}>Polls</Text>
                  <Button
                    label="＋ New Poll"
                    variant="secondary"
                    onClick={() =>
                      navigation.navigate("AddPoll", {
                        tripId: selectedTrip.id,
                      })
                    }
                    styleButton={styles.newPollBtn}
                    styleLabel={styles.newPollBtnLabel}
                  />
                </View>

                {/* Poll list or loading indicator */}
                {loadingPolls ? (
                  <ActivityIndicator
                    size="small"
                    color="#000"
                    style={{ marginTop: 16 }}
                  />
                ) : (
                  <PollList
                    polls={polls}
                    memberCount={memberCount}
                    onSelect={handleSelectPoll}
                  />
                )}
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* ── Poll detail popup (view + vote) ── */}
      <PollPopup
        visible={showPollPopup}
        onClose={() => {
          setShowPollPopup(false);
          setSelectedPoll(null);
        }}
        poll={selectedPoll}
        memberCount={memberCount}
        votedPollIds={votedPollIds}
        onVoteCast={handleVoteCast}
        canDelete={canDeletePoll}
        onDeleted={handlePollDeleted}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  inner: {
    flex: 1,
    paddingTop: 8,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 15,
    color: "#aaa",
    textAlign: "center",
    lineHeight: 22,
  },

  // Page header
  pageHeader: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
    marginTop: 12,
  },

  // Scroll container
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  // Section label (shared)
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#555",
  },

  // Trip selector
  selectorSection: {
    paddingTop: 16,
    paddingHorizontal: 24,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingBottom: 14,
  },
  tripSelector: {
    gap: 8,
    flexDirection: "row",
    paddingVertical: 2,
  },
  tripChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fafafa",
    maxWidth: 180,
  },
  tripChipSelected: {
    backgroundColor: "#111",
    borderColor: "#111",
  },
  tripChipPressed: { opacity: 0.75 },
  tripChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#444",
    flexShrink: 1,
  },
  tripChipTextSelected: { color: "#fff" },
  hostDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#888",
    flexShrink: 0,
  },
  tripMeta: {
    fontSize: 12,
    color: "#999",
  },

  // Polls section
  pollsSection: {
    paddingTop: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  pollsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  newPollBtn: {
    flex: 0,
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  newPollBtnLabel: { fontSize: 13 },
});

export default GroupScreen;

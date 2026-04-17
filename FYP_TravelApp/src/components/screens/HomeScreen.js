import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import Button from "../UI/Button";
import API from "../API/API";
import TripView from "../entity/Trip/TripView";
import PastTripView from "../entity/Trip/PastTripView";
import { endOfUTCDay } from "../../utils/DateUtils";

const HomeScreen = ({ navigation }) => {
  const [trips, setTrips] = useState([]);
  // participant records for the current user: [{ trip_id, status, ... }]
  const [myParticipations, setMyParticipations] = useState([]);
  // accepted participant counts per trip: { [trip_id]: number }
  const [participantCounts, setParticipantCounts] = useState({});
  const [loading, setLoading] = useState(false);

  // Refresh every time the screen comes into focus (e.g. after TripView goBack)
  useFocusEffect(
    useCallback(() => {
      async function fetchData() {
        const userId = global.UserID ?? null;
        setLoading(true);

        const [tripsRes, participationsRes, countsRes] = await Promise.all([
          API.get(`/rest/v1/trips?select=*`),
          userId
            ? API.get(
                `/rest/v1/participants?user_id=eq.${userId}&status=neq.rejected&select=*`,
              )
            : Promise.resolve({ isSuccess: true, result: [] }),
          API.get(`/rest/v1/participants?status=eq.accepted&select=trip_id`),
        ]);

        if (tripsRes.isSuccess) {
          const rows = Array.isArray(tripsRes.result)
            ? tripsRes.result
            : tripsRes.result
              ? [tripsRes.result]
              : [];
          setTrips(rows);
        }

        if (participationsRes.isSuccess) {
          const rows = Array.isArray(participationsRes.result)
            ? participationsRes.result
            : participationsRes.result
              ? [participationsRes.result]
              : [];
          setMyParticipations(rows);
        }

        if (countsRes.isSuccess) {
          const rows = Array.isArray(countsRes.result)
            ? countsRes.result
            : countsRes.result
              ? [countsRes.result]
              : [];
          const counts = {};
          rows.forEach((r) => {
            counts[r.trip_id] = (counts[r.trip_id] || 0) + 1;
          });
          setParticipantCounts(counts);
        }

        setLoading(false);
      }
      fetchData();
    }, []),
  );

  const handleOpenTrip = (trip) => {
    navigation.navigate("TripView", { trip });
  };

  const userId = global.UserID ?? null;
  const now = new Date();

  const participantTripIds = new Set(myParticipations.map((p) => p.trip_id));

  // Whether the current user is involved (host or participant) in a trip
  const isMine = (t) => t.host_id === userId || participantTripIds.has(t.id);

  // Whether a trip has ended — respect the exact stored timestamp when it
  // contains a time component ('T'). Only fall back to end-of-UTC-day for
  // bare date strings like '2026-04-17' that have no time.
  const isEnded = (t) => {
    if (!t.end_date) return false;
    const end = t.end_date.includes('T')
      ? new Date(t.end_date)
      : endOfUTCDay(t.end_date);
    return !!end && end < now;
  };

  // My active/upcoming trips (involved + not ended)
  const myActiveTrips = trips.filter((t) => isMine(t) && !isEnded(t));

  // My past trips (involved + ended) → shown at the bottom, review-only
  const myPastTrips = trips.filter((t) => isMine(t) && isEnded(t));

  // Available trips: any trip not yet started that the user isn't involved in.
  // Both public and private trips are shown — private ones allow a "Request to Join"
  // flow through TripViewScreen so the host can approve/reject.
  const availableTrips = trips.filter(
    (t) => !isMine(t) && t.start_date && new Date(t.start_date) > now,
  );

  // Helper: get participation status label for a trip card
  const participationLabel = (trip) => {
    if (trip.host_id === userId) return null;
    const p = myParticipations.find((r) => r.trip_id === trip.id);
    if (!p) return null;
    if (p.status === "accepted") return "Joined";
    if (p.status === "pending") return "Pending";
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.addButtonWrapper}>
          <Button
            label="+ Add Trip"
            onClick={() => navigation.navigate("TripAdd")}
            variant="secondary"
            styleButton={{ flex: 0, width: "100%" }}
          />
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#000"
            style={{ marginTop: 24 }}
          />
        ) : (
          <ScrollView
            style={styles.listContainer}
            contentContainerStyle={{ paddingBottom: 60 }}
          >
            {/* My Trips */}
            <Text style={styles.sectionHeader}>My Trips</Text>
            {myActiveTrips.length === 0 ? (
              <Text style={styles.emptyHint}>You have no active trips.</Text>
            ) : (
              myActiveTrips.map((t) => {
                const statusLabel = participationLabel(t);
                return (
                  <View key={t.id}>
                    {!!statusLabel && (
                      <Text
                        style={[
                          styles.participationBadge,
                          statusLabel === "Joined"
                            ? styles.badgeJoined
                            : styles.badgePending,
                        ]}
                      >
                        {statusLabel}
                      </Text>
                    )}
                    <TripView
                      trip={t}
                      compact
                      participantCount={participantCounts[t.id] ?? 0}
                      onPress={handleOpenTrip}
                    />
                  </View>
                );
              })
            )}

            {/* Available Trips — only upcoming (not yet started) public trips */}
            <Text style={styles.sectionHeader}>Available Trips</Text>
            {availableTrips.length === 0 ? (
              <Text style={styles.emptyHint}>
                No upcoming trips available to join.
              </Text>
            ) : (
              availableTrips.map((t) => (
                <TripView
                  key={t.id}
                  trip={t}
                  compact
                  participantCount={participantCounts[t.id] ?? 0}
                  onPress={handleOpenTrip}
                />
              ))
            )}

            {/* Past Trips — ended trips the user was involved in */}
            {myPastTrips.length > 0 && (
              <>
                <Text style={styles.sectionHeader}>Past Trips</Text>
                {myPastTrips.map((t) => (
                  <PastTripView key={t.id} trip={t} userId={userId} />
                ))}
              </>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  inner: {
    flex: 1,
    alignItems: "stretch",
    justifyContent: "flex-start",
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  addButtonWrapper: {
    width: "100%",
    marginTop: 12,
    marginBottom: 12,
  },
  listContainer: {
    width: "100%",
    marginTop: 12,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
    marginTop: 12,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  emptyHint: {
    color: "#888",
    fontSize: 14,
    marginBottom: 8,
  },
  participationBadge: {
    alignSelf: "flex-start",
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: -4,
    marginTop: 4,
    overflow: "hidden",
  },
  badgeJoined: {
    backgroundColor: "#e6f4ea",
    color: "#2e7d32",
  },
  badgePending: {
    backgroundColor: "#fff8e1",
    color: "#f57f17",
  },
});

export default HomeScreen;

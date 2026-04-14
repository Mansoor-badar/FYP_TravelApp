import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";

import API from "../API/API";
import { ItineraryItemPopup } from "../entity/ItineraryItem/ItineraryItemView";
import TipCard from "../entity/Tip/TipCard";
import Button from "../UI/Button";
import { formatDateTime } from "../../utils/DateUtils";

// ─── Constants ───────────────────────────────────────────────────────────────

const FILTER_ITINERARIES = "itineraries";
const FILTER_TIPS = "tips";

// Central London fallback region
const LONDON_REGION = {
  latitude: 51.5074,
  longitude: -0.1278,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

// ─── openInMaps  ─────────────────────────────────────────────────────────────
// Opens Google Maps (or Apple Maps on iOS) in walking mode.

const openInMaps = (latitude, longitude, label = "Destination") => {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const encodedLabel = encodeURIComponent(label);

  // Universal Google Maps URL — works in-browser, opens Maps app if installed.
  // travelmode=walking defaults the directions to pedestrian routing.
  const url = Platform.select({
    ios: `maps://app?daddr=${lat},${lng}&dirflg=w`,
    android: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`,
    default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`,
  });

  Linking.openURL(url).catch(() => {
    // If native Maps fails (iOS), fall back to the web URL
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`,
    );
  });
};

// ─── TipDetailModal ───────────────────────────────────────────────────────────

const TipDetailModal = ({ visible, tip, profile, onClose }) => {
  if (!visible || !tip) return null;
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.tipModal}>
          <ScrollView contentContainerStyle={styles.tipModalContent}>
            <Text style={styles.tipModalTitle}>Travel Tip</Text>

            {/* Pre-fetched profile passed in so TipCard shows the username */}
            <TipCard tip={tip} profile={profile} />

            {tip.latitude != null && tip.longitude != null && (
              <View style={styles.coordChip}>
                <Text style={styles.coordLabel}>Coordinates</Text>
                <Text style={styles.coordValue}>
                  {Number(tip.latitude).toFixed(5)},{" "}
                  {Number(tip.longitude).toFixed(5)}
                </Text>
              </View>
            )}

            <Button
              label="Close"
              variant="ghost"
              onClick={onClose}
              styleButton={{ marginTop: 8 }}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── FilterBar ────────────────────────────────────────────────────────────────

const FilterBar = ({
  filter,
  onFilterChange,
  trips,
  selectedTripId,
  onTripChange,
}) => (
  <View style={styles.filterWrapper}>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
    >
      <Pressable
        style={[
          styles.pill,
          filter === FILTER_ITINERARIES && styles.pillActive,
        ]}
        onPress={() => onFilterChange(FILTER_ITINERARIES)}
      >
        <Text
          style={[
            styles.pillText,
            filter === FILTER_ITINERARIES && styles.pillTextActive,
          ]}
        >
          📍 Itineraries
        </Text>
      </Pressable>

      <Pressable
        style={[styles.pill, filter === FILTER_TIPS && styles.pillActive]}
        onPress={() => onFilterChange(FILTER_TIPS)}
      >
        <Text
          style={[
            styles.pillText,
            filter === FILTER_TIPS && styles.pillTextActive,
          ]}
        >
          💡 Tips
        </Text>
      </Pressable>
    </ScrollView>

    {filter === FILTER_ITINERARIES && trips.length > 0 && (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tripRow}
      >
        <Pressable
          style={[
            styles.tripPill,
            selectedTripId === null && styles.tripPillActive,
          ]}
          onPress={() => onTripChange(null)}
        >
          <Text
            style={[
              styles.tripPillText,
              selectedTripId === null && styles.tripPillTextActive,
            ]}
          >
            All Trips
          </Text>
        </Pressable>

        {trips.map((t) => (
          <Pressable
            key={t.id}
            style={[
              styles.tripPill,
              selectedTripId === t.id && styles.tripPillActive,
            ]}
            onPress={() => onTripChange(t.id)}
          >
            <Text
              style={[
                styles.tripPillText,
                selectedTripId === t.id && styles.tripPillTextActive,
              ]}
              numberOfLines={1}
            >
              {t.title || t.name || "Trip"}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    )}
  </View>
);

// ─── MapScreen ────────────────────────────────────────────────────────────────

const MapScreen = ({ navigation }) => {
  const mapRef = useRef(null);

  // Data
  const [allTrips, setAllTrips] = useState([]);
  const [myTrips, setMyTrips] = useState([]);
  const [myTripIds, setMyTripIds] = useState(new Set());
  const [itineraryItems, setItineraryItems] = useState([]);
  const [tips, setTips] = useState([]);
  const [profilesMap, setProfilesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter
  const [filter, setFilter] = useState(FILTER_ITINERARIES);
  const [selectedTripId, setSelectedTripId] = useState(null);

  // Popups
  const [selectedItinerary, setSelectedItinerary] = useState(null);
  const [selectedTip, setSelectedTip] = useState(null);

  // ── Request location permission & center map ───────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        mapRef.current?.animateToRegion(
          {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          },
          700,
        );
      } catch {
        // Silently fall back to Central London
      }
    })();
  }, []);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const userId = global.UserID ?? null;

      const [tripsRes, participationsRes, tipsRes] = await Promise.all([
        API.get("/rest/v1/trips?select=*"),
        userId
          ? API.get(
              `/rest/v1/participants?user_id=eq.${userId}&status=eq.accepted&select=trip_id`,
            )
          : Promise.resolve({ isSuccess: true, result: [] }),
        API.get(
          "/rest/v1/travel_tips?select=*&latitude=not.is.null&longitude=not.is.null",
        ),
      ]);

      const trips =
        tripsRes.isSuccess && Array.isArray(tripsRes.result)
          ? tripsRes.result
          : [];
      setAllTrips(trips);

      // Build user's trip-ID set (hosted + accepted participations)
      const memberIds = new Set();
      if (userId) {
        trips.forEach((t) => {
          if (t.host_id === userId) memberIds.add(t.id);
        });
      }
      if (
        participationsRes.isSuccess &&
        Array.isArray(participationsRes.result)
      ) {
        participationsRes.result.forEach((p) => memberIds.add(p.trip_id));
      }
      setMyTripIds(memberIds);
      setMyTrips(trips.filter((t) => memberIds.has(t.id)));

      // Fetch itinerary items for ALL trips (public pins appear too)
      if (trips.length > 0) {
        const allIds = trips.map((t) => `"${t.id}"`).join(",");
        const itemsRes = await API.get(
          `/rest/v1/itinerary_items?trip_id=in.(${allIds})&latitude=not.is.null&longitude=not.is.null&select=*`,
        );
        if (itemsRes.isSuccess && Array.isArray(itemsRes.result)) {
          setItineraryItems(itemsRes.result);
        }
      } else {
        setItineraryItems([]);
      }

      // Tips
      const tipsData =
        tipsRes.isSuccess && Array.isArray(tipsRes.result)
          ? tipsRes.result
          : [];
      setTips(tipsData);

      // Batch-fetch tip-author profiles from the `users` table
      if (tipsData.length > 0) {
        const userIds = [
          ...new Set(tipsData.map((t) => t.user_id).filter(Boolean)),
        ];
        if (userIds.length > 0) {
          const quoted = userIds.map((id) => `"${id}"`).join(",");
          const profilesRes = await API.get(
            `/rest/v1/users?id=in.(${quoted})&select=id,username,profile_image_url`,
          );
          if (profilesRes.isSuccess && Array.isArray(profilesRes.result)) {
            const map = {};
            profilesRes.result.forEach((p) => {
              if (p?.id) map[p.id] = p;
            });
            setProfilesMap(map);
          }
        }
      }
    } catch (e) {
      setError("Failed to load map data. Please try again.");
      console.error("[MapScreen] fetchData error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  // ── Derived data ───────────────────────────────────────────────────────────

  const visibleItems =
    filter === FILTER_ITINERARIES
      ? selectedTripId
        ? itineraryItems.filter((item) => item.trip_id === selectedTripId)
        : itineraryItems
      : [];

  const visibleTips = filter === FILTER_TIPS ? tips : [];

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setSelectedItinerary(null);
    setSelectedTip(null);
  };

  const handleTripChange = (tripId) => {
    setSelectedTripId(tripId);
    setSelectedItinerary(null);
  };

  // Navigate → Google Maps walking directions
  const handleNavigate = (item) => {
    if (item?.latitude == null || item?.longitude == null) return;
    openInMaps(item.latitude, item.longitude, item.activity_name);
  };

  // After a delete, remove the item from local state and close popup
  const handleItineraryDeleted = (deleted) => {
    setItineraryItems((prev) => prev.filter((x) => x.id !== deleted.id));
    setSelectedItinerary(null);
  };

  // After an edit, update the item in local state
  const handleItineraryModified = (updated) => {
    setItineraryItems((prev) =>
      prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)),
    );
    // Keep the popup open with fresh data
    setSelectedItinerary((prev) =>
      prev?.id === updated.id ? { ...prev, ...updated } : prev,
    );
  };

  // Join Trip: navigate to TripViewScreen for the trip owning the itinerary
  const handleJoinTrip = () => {
    if (!selectedItinerary) return;
    const trip = allTrips.find((t) => t.id === selectedItinerary.trip_id);
    if (!trip) return;
    setSelectedItinerary(null);
    navigation.navigate("TripView", { trip });
  };

  // Membership helpers
  const selectedIsMine = selectedItinerary
    ? myTripIds.has(selectedItinerary.trip_id)
    : false;

  const selectedTripForItem = selectedItinerary
    ? allTrips.find((t) => t.id === selectedItinerary.trip_id)
    : null;

  const showJoinTrip =
    selectedItinerary && !selectedIsMine && !!selectedTripForItem;

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#111" />
        <Text style={styles.loadingText}>Loading map data…</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Button
          label="Retry"
          variant="primary"
          onClick={fetchData}
          styleButton={{ marginTop: 16, flex: 0, paddingHorizontal: 32 }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FilterBar
        filter={filter}
        onFilterChange={handleFilterChange}
        trips={myTrips}
        selectedTripId={selectedTripId}
        onTripChange={handleTripChange}
      />

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={LONDON_REGION}
        showsUserLocation
        showsMyLocationButton
      >
        {/* Itinerary markers */}
        {visibleItems.map((item) => (
          <Marker
            key={`itinerary-${item.id}`}
            coordinate={{
              latitude: Number(item.latitude),
              longitude: Number(item.longitude),
            }}
            title={item.activity_name || "Activity"}
            description={formatDateTime(item.start_time)}
            pinColor={myTripIds.has(item.trip_id) ? "#111" : "#FF6B00"}
            onPress={() => setSelectedItinerary(item)}
          />
        ))}

        {/* Tip markers */}
        {visibleTips.map((tip) => (
          <Marker
            key={`tip-${tip.id}`}
            coordinate={{
              latitude: Number(tip.latitude),
              longitude: Number(tip.longitude),
            }}
            title={tip.location || "Travel Tip"}
            description={
              tip.is_hidden_gem
                ? "⭐ Hidden Gem"
                : tip.tip_content?.slice(0, 60)
            }
            pinColor={tip.is_hidden_gem ? "#2df71f" : "#007AFF"}
            onPress={() => setSelectedTip(tip)}
          />
        ))}
      </MapView>

      {/* Empty state overlays */}
      {filter === FILTER_ITINERARIES && visibleItems.length === 0 && (
        <View style={styles.emptyOverlay} pointerEvents="none">
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🗺️</Text>
            <Text style={styles.emptyTitle}>No itinerary pins</Text>
            <Text style={styles.emptySubtitle}>
              {allTrips.length === 0
                ? "Join or create a trip to see itinerary markers."
                : "No itinerary items with coordinates found."}
            </Text>
          </View>
        </View>
      )}

      {filter === FILTER_TIPS && visibleTips.length === 0 && (
        <View style={styles.emptyOverlay} pointerEvents="none">
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>💡</Text>
            <Text style={styles.emptyTitle}>No tips on the map yet</Text>
            <Text style={styles.emptySubtitle}>
              Tips with coordinates will appear here.
            </Text>
          </View>
        </View>
      )}

      {/*
        ItineraryItemPopup:
        • onNavigate → opens Google Maps walking directions
        • onDelete → removes item from state & closes popup
        • onModify → updates item in state
        • readOnly is false only for user's own trips
      */}
      <ItineraryItemPopup
        visible={!!selectedItinerary && !showJoinTrip}
        onClose={() => setSelectedItinerary(null)}
        item={selectedItinerary}
        readOnly={!selectedIsMine}
        onNavigate={handleNavigate}
        onDelete={handleItineraryDeleted}
        onModify={handleItineraryModified}
      />

      {/* Join Trip bottom sheet — for trips the user isn't part of */}
      {showJoinTrip && (
        <Modal visible transparent animationType="fade">
          <Pressable
            style={styles.joinBannerBackdrop}
            onPress={() => setSelectedItinerary(null)}
          >
            <Pressable
              style={styles.joinBannerCard}
              onPress={(e) => e.stopPropagation?.()}
            >
              <View style={styles.joinBannerTextBlock}>
                <Text style={styles.joinBannerTitle}>
                  {selectedTripForItem?.title || "Trip"}
                </Text>
                <Text style={styles.joinBannerSub}>
                  {selectedTripForItem?.is_public
                    ? "🌍 Public trip — tap to join"
                    : "🔒 Private trip — tap to request"}
                </Text>
              </View>
              <View style={styles.joinBannerActions}>
                <Button
                  label={
                    selectedTripForItem?.is_public
                      ? "Join Trip"
                      : "Request to Join"
                  }
                  variant="primary"
                  onClick={handleJoinTrip}
                  styleButton={styles.joinBtn}
                />
                <Button
                  label="Close"
                  variant="ghost"
                  onClick={() => setSelectedItinerary(null)}
                  styleButton={styles.joinBtn}
                />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Tip detail modal */}
      <TipDetailModal
        visible={!!selectedTip}
        tip={selectedTip}
        profile={selectedTip ? profilesMap[selectedTip.user_id] ?? null : null}
        onClose={() => setSelectedTip(null)}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 24,
  },
  loadingText: { marginTop: 12, fontSize: 14, color: "#555" },
  errorText: { fontSize: 14, color: "#cc0000", textAlign: "center" },

  // Map
  map: { flex: 1 },

  // Filter bar
  filterWrapper: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    zIndex: 10,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  pillActive: { backgroundColor: "#111", borderColor: "#111" },
  pillText: { fontSize: 13, fontWeight: "600", color: "#555" },
  pillTextActive: { color: "#fff" },

  // Trip sub-filter
  tripRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 8,
  },
  tripPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#ddd",
    maxWidth: 160,
  },
  tripPillActive: { backgroundColor: "#000", borderColor: "#000" },
  tripPillText: { fontSize: 12, fontWeight: "600", color: "#555" },
  tripPillTextActive: { color: "#fff" },

  // Empty overlay
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 40,
    top: "auto",
    zIndex: 5,
  },
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#777",
    textAlign: "center",
    lineHeight: 19,
  },

  // Tip modal
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  tipModal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    maxHeight: "80%",
    overflow: "hidden",
  },
  tipModalContent: { padding: 16, gap: 12 },
  tipModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },
  coordChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fafafa",
  },
  coordLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "#888",
    marginBottom: 2,
  },
  coordValue: { fontSize: 13, color: "#333", fontWeight: "500" },

  // Join Trip banner
  joinBannerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  joinBannerCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    gap: 16,
  },
  joinBannerTextBlock: { gap: 4 },
  joinBannerTitle: { fontSize: 20, fontWeight: "700", color: "#111" },
  joinBannerSub: { fontSize: 14, color: "#555" },
  joinBannerActions: { flexDirection: "row", gap: 10 },
  joinBtn: { flex: 1 },
});

export default MapScreen;
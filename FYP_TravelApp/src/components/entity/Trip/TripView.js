import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
} from "react-native";
import Button from "../../UI/Button";
import { ItineraryItemPopup } from "../../UI/ItineraryItems";
import API from "../../API/API";

const formatDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const pad = (n) => (n < 10 ? "0" + n : n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const TripView = ({ trip, compact = false, participantCount, onPress }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addVisible, setAddVisible] = useState(false);

  useEffect(() => {
    if (compact) return;
    if (!trip?.id) {
      setItems([]);
      return;
    }
    setLoading(true);
    API.get(`/rest/v1/itinerary_items?trip_id=eq.${trip.id}`).then((res) => {
      if (res.isSuccess) setItems(Array.isArray(res.result) ? res.result : []);
      else setItems([]);
      setLoading(false);
    });
  }, [trip?.id, compact]);

  const handleAdded = (newItem) => {
    setItems((prev) => [...prev, newItem]);
    setAddVisible(false);
  };

  const handleDeleted = (deletedItem) => {
    setItems((prev) => prev.filter((i) => i.id !== deletedItem.id));
  };

  if (!trip) return null;

  if (compact) {
    const dateRange = trip?.start_date
      ? `${formatDate(trip.start_date)}${trip.end_date ? ` → ${formatDate(trip.end_date)}` : ""}`
      : null;

    return (
      <Pressable onPress={() => onPress?.(trip)} style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.cardTitle}>{trip.title || "—"}</Text>
          <View style={styles.badgeGroup}>
            {participantCount != null &&
              trip.number_of_participants != null && (
                <Text style={styles.countBadge}>
                  {participantCount}/{trip.number_of_participants}
                </Text>
              )}
            <Text
              style={[
                styles.visibility,
                trip.is_public ? styles.public : styles.private,
              ]}
            >
              {trip.is_public ? "Public" : "Private"}
            </Text>
          </View>
        </View>

        {!!trip.destination && (
          <Text style={styles.destination}>{trip.destination}</Text>
        )}

        {!!trip.description && (
          <Text style={styles.description} numberOfLines={2}>
            {trip.description}
          </Text>
        )}

        <View style={styles.metaRow}>
          {trip.budget_category && (
            <Text style={styles.meta}>{trip.budget_category}</Text>
          )}
          {dateRange && <Text style={styles.meta}>{dateRange}</Text>}
          {trip.number_of_participants != null && (
            <Text style={styles.meta}>
              {participantCount != null
                ? `${participantCount}/${trip.number_of_participants} joined`
                : `max ${trip.number_of_participants}`}
            </Text>
          )}
        </View>
      </Pressable>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{trip.title}</Text>
      {!!trip.destination && (
        <Text style={styles.subtitle}>{trip.destination}</Text>
      )}

      {!!trip.description && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Description</Text>
          <Text style={styles.bodyText}>{trip.description}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Dates</Text>
        <Text style={styles.bodyText}>
          {trip.start_date ? formatDate(trip.start_date) : "—"}{" "}
          {trip.end_date ? `→ ${formatDate(trip.end_date)}` : ""}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Details</Text>
        {trip.budget_category && (
          <Text style={styles.bodyText}>Budget: {trip.budget_category}</Text>
        )}
        {trip.primary_purpose && (
          <Text style={styles.bodyText}>Purpose: {trip.primary_purpose}</Text>
        )}
        {!!trip.host_rules && (
          <Text style={styles.bodyText}>Host Rules: {trip.host_rules}</Text>
        )}
        {trip.number_of_participants != null && (
          <Text style={styles.bodyText}>
            Participants: {trip.number_of_participants}
          </Text>
        )}
        <Text style={styles.bodyText}>
          Visibility: {trip.is_public ? "Public" : "Private"}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Itinerary</Text>

        {loading ? <ActivityIndicator size="large" color="#007AFF" /> : null}

        {items.length === 0 && !loading ? (
          <Text style={styles.emptyText}>No activities yet.</Text>
        ) : (
          items.map((it, idx) => (
            <View key={it.id ?? idx} style={styles.itRow}>
              <Text style={styles.itIndex}>{idx + 1}.</Text>
              <Text style={styles.itName}>{it.activity_name}</Text>
            </View>
          ))
        )}

        <Button
          label="+ Add Activity"
          variant="secondary"
          onClick={() => setAddVisible(true)}
        />

        <ItineraryItemPopup
          visible={addVisible}
          onClose={() => setAddVisible(false)}
          item={null}
          tripId={trip.id}
          onModify={handleAdded}
          onDelete={handleDeleted}
          readOnly={false}
          createMode
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  /* Detail view */
  container: { gap: 12, paddingVertical: 8, paddingHorizontal: 12 },
  title: { fontSize: 22, fontWeight: "700", color: "#111" },
  subtitle: { fontSize: 15, color: "#666" },
  section: { gap: 6, marginTop: 8 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#000",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 3,
    marginBottom: 4,
  },
  bodyText: { fontSize: 15, color: "#333" },
  emptyText: { color: "#aaa", fontStyle: "italic" },
  itRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  itIndex: { fontSize: 13, color: "#888", width: 20 },
  itName: { fontSize: 14, color: "#111", flex: 1 },

  /* Card/compact view */
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#111", flex: 1 },
  destination: { fontSize: 14, color: "#666", marginBottom: 6 },
  description: { fontSize: 14, color: "#333", marginBottom: 8 },
  metaRow: { flexDirection: "row", gap: 12 },
  meta: { fontSize: 12, color: "#777" },
  badgeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  countBadge: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: "700",
    color: "#fff",
    backgroundColor: "#555",
  },
  visibility: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: "700",
  },
  public: { color: "#fff", backgroundColor: "#007AFF" },
  private: { color: "#fff", backgroundColor: "#888" },
});

export default TripView;

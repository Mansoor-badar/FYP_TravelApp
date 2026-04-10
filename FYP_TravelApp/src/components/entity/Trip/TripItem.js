import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const formatDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const pad = (n) => (n < 10 ? "0" + n : n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * TripItem
 *
 * A single pressable row representing a trip in a list.
 * Props:
 *   trip – trip object
 *   onSelect(trip) – called when the row is pressed
 */
const TripItem = ({ trip, onSelect }) => {
  const dateRange = trip?.start_date
    ? `${formatDate(trip.start_date)}${trip.end_date ? ` → ${formatDate(trip.end_date)}` : ""}`
    : null;

  return (
    <Pressable
      onPress={() => onSelect?.(trip)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.info}>
        <Text style={styles.title}>{trip.title || "—"}</Text>
        <Text style={styles.destination}>{trip.destination || "—"}</Text>
      </View>

      <View style={styles.meta}>
        {dateRange ? <Text style={styles.dates}>{dateRange}</Text> : null}
        <Text
          style={[
            styles.visibility,
            trip.is_public ? styles.public : styles.private,
          ]}
        >
          {trip.is_public ? "Public" : "Private"}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderColor: "#ededed",
    gap: 12,
  },
  rowPressed: { opacity: 0.6 },
  info: { flex: 1 },
  title: { fontSize: 16, fontWeight: "600", color: "#111" },
  destination: { fontSize: 13, color: "#666", marginTop: 2 },
  meta: { alignItems: "flex-end" },
  dates: { fontSize: 12, color: "#888" },
  visibility: {
    marginTop: 6,
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: "600",
  },
  public: { color: "#fff", backgroundColor: "#007AFF" },
  private: { color: "#fff", backgroundColor: "#888" },
});

export default TripItem;

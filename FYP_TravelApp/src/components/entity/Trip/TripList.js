import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import TripItem from "./TripItem";

/**
 * TripList
 *
 * Renders a scrollable list of TripItem rows.
 * Props:
 *   trips – array of trip objects
 *   onSelect(trip) – forwarded to each TripItem
 */
const TripList = ({ trips = [], onSelect }) => {
  if (!trips.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No trips found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {trips.map((trip) => (
        <TripItem key={trip.id ?? trip.title} trip={trip} onSelect={onSelect} />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { flex: 1, alignItems: "center", paddingTop: 40 },
  emptyText: { fontSize: 15, color: "#aaa" },
});

export default TripList;

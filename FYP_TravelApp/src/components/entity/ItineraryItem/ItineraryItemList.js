import { ScrollView, StyleSheet, Text, View } from "react-native";
import ItineraryItemItem from "./ItineraryItemItem";

/**
 * ItineraryItemList
 *
 * Renders a scrollable list of ItineraryItemItem rows, sorted by order_index.
 *
 * Props:
 *   items            – array of itinerary_items objects
 *   onSelect(item)   – forwarded to each ItineraryItemItem
 */
const ItineraryItemList = ({ items = [], onSelect }) => {
  // Sort by order_index so the list always runs in trip order
  const sorted = [...items].sort(
    (a, b) => (a.order_index ?? Infinity) - (b.order_index ?? Infinity)
  );

  // View ────────────────────────────────────────────────────────────────────
  if (!sorted.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No activities yet.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {sorted.map((item) => (
        <ItineraryItemItem
          key={item.id ?? item.order_index}
          item={item}
          onSelect={onSelect}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 15,
    color: "#aaa",
  },
});

export default ItineraryItemList;

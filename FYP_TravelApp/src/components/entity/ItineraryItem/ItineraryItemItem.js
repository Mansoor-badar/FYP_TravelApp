import { Pressable, StyleSheet, Text, View } from "react-native";

/**
 * ItineraryItemItem  (a single row in a list)
 *
 * A pressable card showing the activity name, order badge, and start time.
 *
 * Props:
 *   item              – itinerary_items object
 *   onSelect(item)    – called when the row is pressed
 */
const ItineraryItemItem = ({ item, onSelect }) => {
  // Initialisations ─────────────────────────────────────────────────────────
  const formatTime = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const pad = (n) => (n < 10 ? "0" + n : n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}  ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const displayTime = formatTime(item.start_time);

  // View ────────────────────────────────────────────────────────────────────
  return (
    <Pressable
      onPress={() => onSelect(item)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {/* Order index badge */}
      {item.order_index != null && (
        <View style={styles.indexBadge}>
          <Text style={styles.indexText}>{item.order_index}</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {item.activity_name || "—"}
        </Text>
        {displayTime && (
          <Text style={styles.time}>{displayTime}</Text>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderColor: "#ededed",
    gap: 12,
  },
  rowPressed: {
    opacity: 0.6,
  },
  indexBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  indexText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },
  time: {
    fontSize: 13,
    color: "#888",
  },
});

export default ItineraryItemItem;

import { StyleSheet, Text, View } from "react-native";

/**
 * ItineraryItemView
 *
 * Displays a single itinerary item in full detail — activity name,
 * description, start time, order index, and coordinates.
 *
 * Props:
 *   item – itinerary_items object from the DB
 */
const ItineraryItemView = ({ item }) => {
  // Initialisations ─────────────────────────────────────────────────────────
  const formatDateTime = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const pad = (n) => (n < 10 ? "0" + n : n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}  ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const hasCoords = item.latitude != null && item.longitude != null;

  // View ────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* Activity name + order badge */}
      <View style={styles.headerRow}>
        <Text style={styles.activityName}>{item.activity_name || "—"}</Text>
        {item.order_index != null && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>#{item.order_index}</Text>
          </View>
        )}
      </View>

      {/* Start time chip */}
      <View style={styles.chipRow}>
        <View style={styles.chip}>
          <Text style={styles.chipLabel}>Start</Text>
          <Text style={styles.chipValue}>{formatDateTime(item.start_time)}</Text>
        </View>
        {hasCoords && (
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Location</Text>
            <Text style={styles.chipValue}>
              {Number(item.latitude).toFixed(5)}, {Number(item.longitude).toFixed(5)}
            </Text>
          </View>
        )}
      </View>

      {/* Description */}
      {!!item.activity_description && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Description</Text>
          <Text style={styles.bodyText}>{item.activity_description}</Text>
        </View>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 14,
    paddingVertical: 8,
  },

  /* Header ────────────────────────────── */
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  activityName: {
    flex: 1,
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "#000",
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },

  /* Chips ─────────────────────────────── */
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flex: 1,
    minWidth: 140,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fafafa",
    gap: 2,
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "#888",
  },
  chipValue: {
    fontSize: 14,
    color: "#222",
    fontWeight: "500",
  },

  /* Section ───────────────────────────── */
  section: {
    gap: 4,
  },
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
  bodyText: {
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
  },
});

export default ItineraryItemView;

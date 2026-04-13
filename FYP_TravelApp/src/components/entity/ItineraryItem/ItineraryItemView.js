import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { formatDateTime } from "../../../utils/DateUtils";
import CountdownTimer from "../../UI/CountdownTimer";
import ItineraryItemForm from "./ItineraryItemForm";
import API from "../../API/API";
import Button, { ButtonTray } from "../../UI/Button";

// ── ItineraryItemDetail (inline detail renderer) ──────────────────────────────

const ItineraryItemDetail = ({ item }) => {
  if (!item) return null;

  const hasCoords = item.latitude != null && item.longitude != null;

  return (
    <View style={styles.detail}>
      <View style={styles.detailHeaderRow}>
        <Text style={styles.activityName}>{item.activity_name || "—"}</Text>
        {item.order_index != null && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>#{item.order_index}</Text>
          </View>
        )}
      </View>

      <View style={styles.chipRow}>
        <View style={styles.chip}>
          <Text style={styles.chipLabel}>Start</Text>
          <Text style={styles.chipValue}>
            {formatDateTime(item.start_time)}
          </Text>
        </View>
        {hasCoords && (
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Location</Text>
            <Text style={styles.chipValue}>
              {Number(item.latitude).toFixed(5)},{" "}
              {Number(item.longitude).toFixed(5)}
            </Text>
          </View>
        )}
      </View>

      {!!item.activity_description && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Description</Text>
          <Text style={styles.bodyText}>{item.activity_description}</Text>
        </View>
      )}
    </View>
  );
};

// ── ItineraryItemPopup ────────────────────────────────────────────────────────

/**
 * ItineraryItemPopup
 *
 * A slide-up modal for viewing, editing, navigating to, or deleting an itinerary item.
 *
 * Props:
 *   visible           - boolean controlling modal visibility
 *   onClose()         - called when the user dismisses the popup
 *   item              - itinerary_items object to show (pre-fetched)
 *   itemId            - UUID to fetch when `item` is not provided
 *   onNavigate(item)  - called when Navigate is pressed
 *   onModify(item)    - called after a successful save
 *   onDelete(item)    - called after a successful delete
 *   readOnly          - when true the Edit / Delete buttons are hidden
 */
export const ItineraryItemPopup = ({
  visible,
  onClose,
  item,
  itemId,
  onNavigate,
  onModify,
  onDelete,
  readOnly = false,
}) => {
  const [data, setData] = useState(item || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleNavigate = () => {
    if (!data || data.latitude == null || data.longitude == null) return;
    if (onNavigate) onNavigate(data);
  };

  const handleSave = (updatedItem) => {
    setData(updatedItem);
    setIsEditing(false);
    if (onModify) onModify(updatedItem);
  };

  const handleDelete = async () => {
    if (!data?.id) return;
    try {
      const result = await API.delete(
        `/rest/v1/itinerary_items?id=eq.${data.id}`,
      );
      if (result.isSuccess) {
        if (onDelete) onDelete(data);
        onClose();
      }
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  React.useEffect(() => {
    if (item) {
      setData(item);
      setLoading(false);
      return;
    }
    if (!itemId) return;
    setLoading(true);
    setError(null);
    API.get(`/rest/v1/itinerary_items?id=eq.${itemId}`).then((response) => {
      if (response.isSuccess) {
        const rows = Array.isArray(response.result) ? response.result : [];
        setData(rows[0] || null);
      } else {
        setError(response.message || "Failed to load item.");
      }
      setLoading(false);
    });
  }, [item, itemId]);

  if (!visible) return null;

  const hasCoords = data?.latitude != null && data?.longitude != null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {loading ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : data ? (
              <>
                {isEditing && !readOnly ? (
                  <ItineraryItemForm
                    originalItem={data}
                    onSubmit={handleSave}
                    onCancel={() => setIsEditing(false)}
                  />
                ) : (
                  <>
                    <ItineraryItemDetail item={data} />
                    <ButtonTray style={styles.actionTray}>
                      {hasCoords && (
                        <Button
                          label="Navigate"
                          variant="primary"
                          onClick={handleNavigate}
                        />
                      )}
                      {!readOnly && (
                        <Button
                          label="Edit"
                          variant="secondary"
                          onClick={() => setIsEditing(true)}
                        />
                      )}
                      {!readOnly && (
                        <Button
                          label="Delete"
                          variant="danger"
                          onClick={handleDelete}
                        />
                      )}
                      <Button label="Close" variant="ghost" onClick={onClose} />
                    </ButtonTray>
                  </>
                )}
              </>
            ) : (
              <Text style={styles.emptyText}>No activity data found.</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ── ItineraryItemView ─────────────────────────────────────────────────────────

/**
 * ItineraryItemView
 *
 * Displays a single itinerary item.
 *
 * Props:
 *   item      - itinerary_items object from the DB
 *   listItem  - renders a pressable card that opens the detail popup
 *   index     - zero-based display index (shown as #1, #2 ...)
 *   isHost    - enables edit/delete in popup
 *   onModify  - called with updated item after edit
 *   onDelete  - called with deleted item after delete
 */
const ItineraryItemView = ({
  item,
  listItem = false,
  index,
  isHost,
  onModify,
  onDelete,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  if (!item) return null;

  if (listItem) {
    return (
      <>
        <Pressable
          onPress={() => setModalVisible(true)}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.indexBadge}>
              <Text style={styles.indexText}>{(index ?? 0) + 1}</Text>
            </View>
            <Text style={styles.cardName} numberOfLines={2}>
              {item.activity_name || "—"}
            </Text>
          </View>

          {!!item.start_time && (
            <Text style={styles.cardTime}>
              {formatDateTime(item.start_time)}
            </Text>
          )}

          {!!item.start_time && (
            <CountdownTimer
              startDate={item.start_time}
              startLabel="Starts in"
              compact
            />
          )}

          <Text style={styles.tapHint}>Tap to view details</Text>
        </Pressable>

        <ItineraryItemPopup
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          item={item}
          readOnly={!isHost}
          onModify={(updated) => {
            setModalVisible(false);
            onModify?.(updated);
          }}
          onDelete={(deleted) => {
            setModalVisible(false);
            onDelete?.(deleted);
          }}
        />
      </>
    );
  }

  return <ItineraryItemDetail item={item} />;
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Detail view
  detail: {
    gap: 14,
    paddingVertical: 8,
  },
  detailHeaderRow: {
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

  // Popup modal
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 12,
    maxHeight: "85%",
    overflow: "hidden",
  },
  modalContent: {
    padding: 16,
    gap: 14,
  },
  actionTray: {
    marginTop: 12,
    flexWrap: "wrap",
  },
  errorText: {
    color: "red",
    textAlign: "center",
  },
  emptyText: {
    textAlign: "center",
    color: "#888",
  },

  // List-item card
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    padding: 14,
    marginBottom: 10,
    gap: 6,
  },
  cardPressed: {
    opacity: 0.7,
    backgroundColor: "#f5f5f5",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  indexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  indexText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  cardName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },
  cardTime: {
    fontSize: 12,
    color: "#888",
    marginLeft: 38,
  },
  tapHint: {
    fontSize: 11,
    color: "#bbb",
    textAlign: "right",
    marginTop: 2,
  },
});

export default ItineraryItemView;

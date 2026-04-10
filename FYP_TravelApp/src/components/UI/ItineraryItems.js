import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import ItineraryItemView from "../entity/ItineraryItem/ItineraryItemView";
import ItineraryItemForm from "../entity/ItineraryItem/ItineraryItemForm";
import API from "../API/API";
import Button, { ButtonTray } from "./Button";

// ── CircleButton ─────────────────────────────────────────────────────────────

/**
 * CircleButton
 *
 * A small circular pressable button. Identical contract to the one in Caches.js.
 *
 * Props:
 *   label             – text shown inside the circle
 *   icon              – optional React element rendered before the label
 *   onClick()         – press handler
 *   styleLabel        – override for the label text style
 *   styleCircleButton – override for the circle container style
 */
export const CircleButton = ({
  label,
  icon,
  onClick,
  styleLabel,
  styleCircleButton,
}) => (
  <Pressable
    onPress={onClick}
    style={[styles.circleButton, styleCircleButton]}
  >
    {icon ?? null}
    <Text style={[styles.circleLabel, styleLabel]}>{label}</Text>
  </Pressable>
);

// ── ItineraryItemPopup ────────────────────────────────────────────────────────

/**
 * ItineraryItemPopup
 *
 * A reusable slide-up modal for viewing, editing, navigating to, or
 * deleting an itinerary item.
 *
 * Props:
 *   visible           – boolean controlling modal visibility
 *   onClose()         – called when the user dismisses the popup
 *   item              – itinerary_items object to show (pre-fetched)
 *   itemId            – UUID to fetch when `item` is not provided
 *   onNavigate(item)  – called when Navigate is pressed; receives the item
 *                       object (which has latitude + longitude). Hook this up
 *                       to your map / navigation logic.
 *   onModify(item)    – called after a successful save so the parent can
 *                       refresh its own state.
 *   onDelete(item)    – called after a successful delete.
 *   readOnly          – when true the Edit / Delete buttons are hidden.
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
  // Initialisations ─────────────────────────────────────────────────────────

  // State ───────────────────────────────────────────────────────────────────
  const [data, setData]       = useState(item || null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Handlers ────────────────────────────────────────────────────────────────

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
      const result = await API.delete(`/rest/v1/itinerary_items?id=eq.${data.id}`);
      if (result.isSuccess) {
        if (onDelete) onDelete(data);
        onClose();
      }
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  // Fetch when no item object is provided but an itemId is ──────────────────
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
        const rows = Array.isArray(response.result)
          ? response.result
          : [];
        setData(rows[0] || null);
      } else {
        setError(response.message || "Failed to load item.");
      }
      setLoading(false);
    });
  }, [item, itemId]);

  // View ────────────────────────────────────────────────────────────────────
  if (!visible) return null;

  const hasCoords = data?.latitude != null && data?.longitude != null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView contentContainerStyle={styles.modalContent}>

            {/* ── Loading / Error / Content ─────────────────── */}
            {loading ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : data ? (
              <>
                {isEditing && !readOnly ? (
                  /* ── Edit form ──────────────────────────────── */
                  <ItineraryItemForm
                    originalItem={data}
                    onSubmit={handleSave}
                    onCancel={() => setIsEditing(false)}
                  />
                ) : (
                  /* ── Detail view ───────────────────────────── */
                  <>
                    <ItineraryItemView item={data} />

                    {/* Action buttons */}
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
                      <Button
                        label="Close"
                        variant="ghost"
                        onClick={onClose}
                      />
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

// ── ItineraryItems (entry-point / circle-button trigger) ─────────────────────

/**
 * ItineraryItems
 *
 * Drop-in component that renders a yellow circle button which opens the
 * ItineraryItemPopup for the given item or itemId.
 *
 * Props – same as ItineraryItemPopup minus `visible` / `onClose`.
 */
const ItineraryItems = ({
  items = [],
  selectedItem = null,
  itemId = null,
  onNavigate,
  onModify,
  onDelete,
  readOnly = false,
}) => {
  const [visible, setVisible] = useState(false);

  const resolvedItem = selectedItem || (items.length > 0 ? items[0] : null);

  return (
    <View>
      <CircleButton label=" " onClick={() => setVisible(true)} />

      <ItineraryItemPopup
        visible={visible}
        onClose={() => setVisible(false)}
        item={resolvedItem}
        itemId={itemId}
        onNavigate={onNavigate}
        onModify={onModify}
        onDelete={onDelete}
        readOnly={readOnly}
      />
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  /* Circle trigger button */
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 100,
    backgroundColor: "#FFD700",
    alignItems: "center",
    justifyContent: "center",
  },
  circleLabel: {
    fontSize: 16,
  },

  /* Modal chrome */
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

  /* Action buttons row */
  actionTray: {
    marginTop: 12,
    flexWrap: "wrap",
  },

  /* Feedback text */
  errorText: {
    color: "red",
    textAlign: "center",
  },
  emptyText: {
    textAlign: "center",
    color: "#888",
  },
});

export default ItineraryItems;

import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
  Linking,
  Platform,
  Alert,
} from "react-native";
import TipCard from "./TipCard";
import Button, { ButtonTray } from "../../UI/Button";
import API from "../../API/API";

// Opens Google Maps walking directions (same helper pattern as MapScreen)
const openInMaps = (latitude, longitude) => {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const url = Platform.select({
    ios: `maps://app?daddr=${lat},${lng}&dirflg=w`,
    android: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`,
    default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`,
  });
  Linking.openURL(url).catch(() =>
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`,
    ),
  );
};

/**
 * TipDetailModal
 *
 * A slide-up modal that shows a full TipCard plus:
 *   - Coordinates chip (when available)
 *   - Navigate button to open walking directions (when coordinates available)
 *   - Delete button for the tip owner
 *   - Close button
 *
 * Props:
 *   visible       – boolean
 *   tip           – travel_tips row (with latitude / longitude)
 *   profile       – author profile object passed through to TipCard (optional)
 *   currentUserId – UUID of logged-in user (for delete visibility)
 *   onClose       – () => void
 *   onDelete      – (tipId: string) => void  called after successful deletion
 */
const TipDetailModal = ({ visible, tip, profile, currentUserId, onClose, onDelete }) => {
  const [deleting, setDeleting] = useState(false);

  if (!visible || !tip) return null;

  const hasCoords = tip.latitude != null && tip.longitude != null;
  const isOwner = currentUserId && tip.user_id === currentUserId;

  const handleNavigate = () => {
    if (!hasCoords) return;
    openInMaps(tip.latitude, tip.longitude);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Tip",
      "Permanently delete this travel tip?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            const res = await API.delete(`/rest/v1/travel_tips?id=eq.${tip.id}`);
            setDeleting(false);
            if (!res.isSuccess) {
              Alert.alert("Error", res.message || "Could not delete tip.");
              return;
            }
            onDelete?.(tip.id);
            onClose();
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>Travel Tip</Text>

            <TipCard tip={tip} profile={profile} />

            {hasCoords && (
              <View style={styles.coordChip}>
                <Text style={styles.coordLabel}>Coordinates</Text>
                <Text style={styles.coordValue}>
                  {Number(tip.latitude).toFixed(5)},{" "}
                  {Number(tip.longitude).toFixed(5)}
                </Text>
              </View>
            )}

            <ButtonTray style={styles.actions}>
              {hasCoords && (
                <Button
                  label="Navigate"
                  variant="primary"
                  onClick={handleNavigate}
                />
              )}
              {isOwner && (
                <Button
                  label="Delete"
                  variant="danger"
                  loading={deleting}
                  disabled={deleting}
                  onClick={handleDelete}
                />
              )}
              <Button
                label="Close"
                variant="ghost"
                onClick={onClose}
                disabled={deleting}
              />
            </ButtonTray>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    maxHeight: "80%",
    overflow: "hidden",
  },
  content: { padding: 16, gap: 12 },
  title: {
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
  actions: { marginTop: 4 },
});

export default TipDetailModal;

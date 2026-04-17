import React from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
} from "react-native";
import TipCard from "./TipCard";
import Button from "../../UI/Button";

/**
 * TipDetailModal
 *
 * A slide-up modal that shows a full TipCard plus its coordinate chip and a
 * close button.  Extracted from the inline TipDetailModal inside MapScreen.
 *
 * Props:
 *   visible  – boolean
 *   tip      – travel_tips row (with latitude / longitude)
 *   profile  – author profile object passed through to TipCard (optional)
 *   onClose  – () => void
 */
const TipDetailModal = ({ visible, tip, profile, onClose }) => {
  if (!visible || !tip) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>Travel Tip</Text>

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
});

export default TipDetailModal;

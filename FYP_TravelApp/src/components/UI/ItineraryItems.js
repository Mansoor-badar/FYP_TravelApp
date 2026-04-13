import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { ItineraryItemPopup } from "../entity/ItineraryItem/ItineraryItemView";

// Re-export ItineraryItemPopup so existing consumers of this file keep working
export { ItineraryItemPopup };

// ── CircleButton ─────────────────────────────────────────────────────────────

/**
 * CircleButton
 *
 * A small circular pressable button.
 *
 * Props:
 *   label             - text shown inside the circle
 *   icon              - optional React element rendered before the label
 *   onClick()         - press handler
 *   styleLabel        - override for the label text style
 *   styleCircleButton - override for the circle container style
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

// ── ItineraryItems (circle-button trigger) ────────────────────────────────────

/**
 * ItineraryItems
 *
 * Drop-in component that renders a yellow circle button which opens the
 * ItineraryItemPopup for the given item or itemId.
 *
 * Props - same as ItineraryItemPopup minus `visible` / `onClose`.
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
});

export default ItineraryItems;

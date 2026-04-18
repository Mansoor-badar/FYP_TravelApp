import { useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import Form from "../../UI/Form";
import API from "../../API/API";

// ── Default shape for a brand-new itinerary item ──────────────────────────────

const defaultItem = {
  trip_id: "",
  activity_name: "",
  activity_description: "",
  start_time: null,
  latitude: "",
  longitude: "",
  order_index: "",
};

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * ItineraryItemForm
 *
 * Reusable form for creating or editing an itinerary item.
 *
 * Props:
 *   originalItem   – existing item object (edit mode). Omit for create mode.
 *   tripId         – UUID of the parent trip (ignored when originalItem is set,
 *                    since the trip_id is already in the original record).
 *   onSubmit(item) – called with the saved/updated item on success.
 *   onCancel()     – called when the user presses Cancel.
 */
const ItineraryItemForm = ({
  originalItem,
  tripId,
  onSubmit,
  onCancel,
  deferToParent = false,
}) => {
  // Initialisations ─────────────────────────────────────────────────────────

  const toFlat = (i) => ({
    ...defaultItem,
    ...i,
    latitude: i?.latitude != null ? String(i.latitude) : "",
    longitude: i?.longitude != null ? String(i.longitude) : "",
    order_index: i?.order_index != null ? String(i.order_index) : "",
  });

  // State ───────────────────────────────────────────────────────────────────
  const [item, setItem] = useState(toFlat(originalItem));
  const [saving, setSaving] = useState(false);

  // Handlers ────────────────────────────────────────────────────────────────

  const handleChange = (field, value) =>
    setItem((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    // Validate required fields
    if (!item.activity_name.trim()) {
      Alert.alert("Validation Error", "Activity Name is required.");
      return;
    }
    if (!item.start_time) {
      Alert.alert("Validation Error", "Start Time is required.");
      return;
    }
    if (!item.order_index.trim()) {
      Alert.alert("Validation Error", "Order Index is required.");
      return;
    }
    if (!item.latitude.trim()) {
      Alert.alert("Validation Error", "Latitude is required.");
      return;
    }
    if (!item.longitude.trim()) {
      Alert.alert("Validation Error", "Longitude is required.");
      return;
    }

    const payload = {
      trip_id: originalItem?.trip_id ?? tripId ?? item.trip_id.trim(),
      activity_name: item.activity_name.trim(),
      start_time: item.start_time,
      order_index: parseInt(item.order_index, 10),
      latitude: parseFloat(item.latitude),
      longitude: parseFloat(item.longitude),
      ...(item.activity_description.trim() && {
        activity_description: item.activity_description.trim(),
      }),
    };

    if (deferToParent) {
      // Don't call API here; pass the prepared payload back to the parent
      onSubmit({ ...payload });
      return;
    }

    setSaving(true);
    let result;
    if (originalItem?.id) {
      // Strip `id` from the body — PostgREST 12+ rejects primary-key fields
      // in the request body when the same column is used in the URL filter.
      const { id: _id, ...patchPayload } = payload;
      result = await API.patch(
        `/rest/v1/itinerary_items?id=eq.${originalItem.id}`,
        patchPayload,
      );
    } else {
      result = await API.post(`/rest/v1/itinerary_items`, payload);
    }
    setSaving(false);

    if (result.isSuccess) {
      // Prefer the server-returned id for newly created rows
      const returnedId =
        originalItem?.id ??
        (Array.isArray(result.result)
          ? result.result[0]?.id
          : result.result?.id);
      onSubmit({ ...payload, id: returnedId });
    } else {
      Alert.alert(
        "Error",
        result.message || "Could not save item. Please try again.",
      );
    }
  };

  // View ────────────────────────────────────────────────────────────────────

  const submitLabel = originalItem ? "Save Changes" : "Add Activity";

  return (
    <Form onSubmit={handleSubmit} onCancel={onCancel} submitLabel={submitLabel}>
      {/* ── Activity ──────────────────────────────────── */}
      <Text style={styles.sectionHeading}>Activity *</Text>

      <Form.InputText
        label="Activity Name *"
        value={item.activity_name}
        onChange={(v) => handleChange("activity_name", v)}
        placeholder="e.g. Visit Eiffel Tower"
      />

      <Form.InputText
        label="Description"
        value={item.activity_description}
        onChange={(v) => handleChange("activity_description", v)}
        placeholder="e.g. Tickets pre-booked, meet at the entrance"
      />

      {/* ── Scheduling ────────────────────────────────── */}
      <Text style={styles.sectionHeading}>Scheduling *</Text>

      <Form.DatePicker
        label="Start Time *"
        value={item.start_time}
        onChange={(v) => handleChange("start_time", v)}
      />

      <Form.InputText
        label="Order Index *"
        value={item.order_index}
        onChange={(v) => handleChange("order_index", v)}
        placeholder="e.g. 1 (first activity of the day)"
      />

      {/* ── Location ──────────────────────────────────── */}
      <Text style={styles.sectionHeading}>Location *</Text>

      <Form.InputText
        label="Latitude *"
        value={item.latitude}
        onChange={(v) => handleChange("latitude", v)}
        placeholder="e.g. 48.8584"
      />

      <Form.InputText
        label="Longitude *"
        value={item.longitude}
        onChange={(v) => handleChange("longitude", v)}
        placeholder="e.g. 2.2945"
      />
    </Form>
  );
};

const styles = StyleSheet.create({
  sectionHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: "#000",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 4,
  },
});

export default ItineraryItemForm;

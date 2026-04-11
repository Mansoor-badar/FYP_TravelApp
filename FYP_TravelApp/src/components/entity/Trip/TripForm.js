import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Form from "../../UI/Form";
import API from "../../API/API";
import ItineraryItemForm from "../ItineraryItem/ItineraryItemForm";
import Button, { ButtonTray } from "../../UI/Button";
import { Modal } from "react-native";

// ── Options ───────────────────────────────────────────────────────────────────

const BUDGET_CATEGORY_OPTIONS = [
  { label: "Budget (approx £0 - £499)", value: "budget" },
  { label: "Economy (approx £500 - £999)", value: "economy" },
  { label: "Standard (approx £1000 - £1999)", value: "standard" },
  { label: "Premium (approx £2000 - £3999)", value: "premium" },
  { label: "Luxury (approx £4000+)", value: "luxury" },
];

// ── Default shape for a brand-new trip ────────────────────────────────────────

const defaultTrip = {
  title: "",
  description: "",
  destination: "",
  budget_category: null,
  primary_purpose: "",
  start_date: null,
  end_date: null,
  host_rules: "",
  is_public: true,
  number_of_participants: "",
};

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * TripForm
 *
 * Reusable form for creating or editing a trip.
 * After the trip is saved, it shows an embedded itinerary section so the
 * user can add activities using the existing ItineraryItemForm/Popup.
 *
 * Props:
 *   originalTrip    – existing trip object (edit mode). Omit for create mode.
 *   hostId          – UUID of the logged-in user (used as host_id on create).
 *   onSubmit(trip)  – called with the saved trip on success.
 *   onCancel()      – called when the user presses Cancel.
 */
const TripForm = ({ originalTrip, hostId, onSubmit, onCancel }) => {
  // Initialisations ─────────────────────────────────────────────────────────

  const toFlat = (t) => ({
    ...defaultTrip,
    ...t,
  });

  // State ───────────────────────────────────────────────────────────────────
  const [trip, setTrip] = useState(toFlat(originalTrip));
  const [saving, setSaving] = useState(false);

  // Saved trip id — once we have it we unlock the Itinerary section
  const [savedTripId, setSavedTripId] = useState(originalTrip?.id ?? null);

  // Itinerary items added in this session
  const [itineraryItems, setItineraryItems] = useState([]);

  // Popup state for adding a new itinerary item
  const [showItineraryModal, setShowItineraryModal] = useState(false);

  // Temp local id generator for unsaved itinerary items
  const makeLocalId = () =>
    `local-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  // Handlers ────────────────────────────────────────────────────────────────

  const handleChange = (field, value) =>
    setTrip((prev) => ({ ...prev, [field]: value }));

  const handleTogglePublic = () =>
    setTrip((prev) => ({ ...prev, is_public: !prev.is_public }));

  const handleSubmit = async () => {
    // Validate required fields
    if (!trip.title.trim()) {
      Alert.alert("Validation Error", "Title is required.");
      return;
    }
    if (!trip.destination.trim()) {
      Alert.alert("Validation Error", "Destination is required.");
      return;
    }

    // Determine host id (prefer prop, fall back to global.UserID)
    const resolvedHostId = hostId ?? global.UserID ?? null;

    const payload = {
      title: trip.title.trim(),
      destination: trip.destination.trim(),
      is_public: trip.is_public,
      ...(trip.description.trim() && { description: trip.description.trim() }),
      ...(trip.budget_category && { budget_category: trip.budget_category }),
      ...(trip.primary_purpose && { primary_purpose: trip.primary_purpose }),
      ...(trip.start_date && { start_date: trip.start_date }),
      ...(trip.end_date && { end_date: trip.end_date }),
      ...(trip.host_rules.trim() && { host_rules: trip.host_rules.trim() }),
      ...(trip.number_of_participants !== "" &&
        trip.number_of_participants !== null && {
          number_of_participants: parseInt(trip.number_of_participants, 10),
        }),
    };

    // Only include host_id when creating a new trip; require user to be logged in
    if (!originalTrip?.id) {
      if (!resolvedHostId) {
        Alert.alert(
          "Authentication Required",
          "You must be logged in to create a trip.",
        );
        return;
      }
      payload.host_id = resolvedHostId;
    }

    setSaving(true);
    let result;
    if (originalTrip?.id) {
      result = await API.patch(
        `/rest/v1/trips?id=eq.${originalTrip.id}`,
        payload,
      );
    } else {
      result = await API.post(`/rest/v1/trips`, payload);
    }
    setSaving(false);

    if (result.isSuccess) {
      // On create, Supabase returns the new row(s); grab the id so we can
      // immediately unlock the itinerary section.
      const newId = result.result?.[0]?.id ?? originalTrip?.id;
      if (newId) {
        setSavedTripId(newId);

        // Persist any locally-collected itinerary items now that we have a trip id
        await persistLocalItineraries(newId);
      }

      onSubmit({ ...payload, id: newId });
    } else {
      Alert.alert(
        "Error",
        result.message || "Could not save trip. Please try again.",
      );
    }
  };

  // (itinerary items are handled via the modal submit handler)

  const handleItineraryModalSubmit = async (itemPayload) => {
    // If trip is already saved, persist the item immediately (API path).
    if (savedTripId) {
      if (itemPayload.id) {
        setItineraryItems((prev) => [...prev, itemPayload]);
        setShowItineraryModal(false);
        return;
      }

      const postPayload = { ...itemPayload, trip_id: savedTripId };
      const res = await API.post(`/rest/v1/itinerary_items`, postPayload);
      if (res.isSuccess) {
        const created = Array.isArray(res.result) ? res.result[0] : res.result;
        setItineraryItems((prev) => [
          ...prev,
          { ...postPayload, id: created?.id },
        ]);
      } else {
        Alert.alert("Error", res.message || "Could not save itinerary item.");
      }
    } else {
      // Unsaved trip: keep the item locally and tag with a temporary local id
      const tempId = makeLocalId();
      setItineraryItems((prev) => [
        ...prev,
        { ...itemPayload, __localId: tempId },
      ]);
    }

    setShowItineraryModal(false);
  };

  const persistLocalItineraries = async (tripId) => {
    const locals = itineraryItems.filter((it) => !it.id && it.__localId);
    for (const local of locals) {
      const postPayload = {
        trip_id: tripId,
        activity_name: local.activity_name,
        ...(local.activity_description && {
          activity_description: local.activity_description,
        }),
        ...(local.start_time && { start_time: local.start_time }),
        ...(local.latitude != null &&
          local.latitude !== "" && { latitude: parseFloat(local.latitude) }),
        ...(local.longitude != null &&
          local.longitude !== "" && { longitude: parseFloat(local.longitude) }),
        ...(local.order_index != null &&
          local.order_index !== "" && {
            order_index: parseInt(local.order_index, 10),
          }),
      };

      const res = await API.post(`/rest/v1/itinerary_items`, postPayload);
      if (res.isSuccess) {
        const created = Array.isArray(res.result) ? res.result[0] : res.result;
        const returnedId = created?.id;
        setItineraryItems((prev) =>
          prev.map((it) =>
            it.__localId === local.__localId
              ? { ...it, id: returnedId, __localId: undefined }
              : it,
          ),
        );
      } else {
        console.error("Failed to persist itinerary item:", res.message);
      }
    }
  };

  // View ────────────────────────────────────────────────────────────────────

  const submitLabel = originalTrip ? "Save Changes" : "Create Trip";

  return (
    <Form
      onSubmit={handleSubmit}
      onCancel={onCancel}
      submitLabel={submitLabel}
      loading={saving}
    >
      {/* ── Trip Details ───────────────────────────────── */}
      <Text style={styles.sectionHeading}>Trip Details *</Text>

      <Form.InputText
        label="Title *"
        value={trip.title}
        onChange={(v) => handleChange("title", v)}
        placeholder="e.g. Summer Europe Adventure"
      />

      <Form.InputText
        label="Destination *"
        value={trip.destination}
        onChange={(v) => handleChange("destination", v)}
        placeholder="e.g. Paris, France"
      />

      <Form.InputText
        label="Description"
        value={trip.description}
        onChange={(v) => handleChange("description", v)}
        placeholder="A short summary of the trip"
      />

      {/* ── Budget & Purpose ───────────────────────────── */}
      <Text style={styles.sectionHeading}>Budget &amp; Purpose</Text>

      <Form.InputSelect
        label="Budget Category"
        prompt="Select budget category…"
        options={BUDGET_CATEGORY_OPTIONS}
        value={trip.budget_category}
        onChange={(v) => handleChange("budget_category", v)}
      />

      <Form.InputText
        label="Primary Purpose"
        value={trip.primary_purpose}
        onChange={(v) => handleChange("primary_purpose", v)}
        placeholder="e.g. Leisure, Backpacking, Business"
      />

      {/* ── Dates ─────────────────────────────────────── */}
      <Text style={styles.sectionHeading}>Dates</Text>

      <Form.DatePicker
        label="Start Date"
        value={trip.start_date}
        onChange={(v) => handleChange("start_date", v)}
      />

      <Form.DatePicker
        label="End Date"
        value={trip.end_date}
        onChange={(v) => handleChange("end_date", v)}
      />

      {/* ── Settings ──────────────────────────────────── */}
      <Text style={styles.sectionHeading}>Settings</Text>

      <Form.InputText
        label="Host Rules"
        value={trip.host_rules}
        onChange={(v) => handleChange("host_rules", v)}
        placeholder="e.g. No smoking, no late arrivals"
      />

      <Form.InputText
        label="Number of Participants"
        value={
          trip.number_of_participants !== null &&
          trip.number_of_participants !== undefined
            ? String(trip.number_of_participants)
            : ""
        }
        onChange={(v) => handleChange("number_of_participants", v)}
        placeholder="e.g. 4"
        keyboardType="numeric"
      />

      {/* is_public toggle */}
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Visibility</Text>
        <ButtonTray style={styles.toggleTray}>
          <Button
            label="Public"
            variant={trip.is_public ? "primary" : "ghost"}
            onClick={() => handleChange("is_public", true)}
          />
          <Button
            label="Private"
            variant={!trip.is_public ? "primary" : "ghost"}
            onClick={() => handleChange("is_public", false)}
          />
        </ButtonTray>
      </View>

      {/* ── Itinerary ─────────────────────────────────── */}
      <>
        <Text style={styles.sectionHeading}>Itinerary</Text>

        {/* List of items added so far (includes local drafts) */}
        {itineraryItems.length === 0 ? (
          <Text style={styles.emptyHint}>
            No activities yet — tap below to add your first one.
          </Text>
        ) : (
          itineraryItems.map((item, idx) => (
            <View
              key={item.id ?? item.__localId ?? idx}
              style={styles.itineraryRow}
            >
              <Text style={styles.itineraryIndex}>{idx + 1}.</Text>
              <Text style={styles.itineraryName}>
                {item.activity_name} {item.__localId ? " (draft)" : ""}
              </Text>
            </View>
          ))
        )}

        {/* Add Activity button — opens the itinerary modal. If trip is saved, the form will post directly; otherwise it will return a draft object to be saved later. */}
        <Button
          label="+ Add Activity"
          variant="secondary"
          onClick={() => setShowItineraryModal(true)}
        />

        {/* Modal for ItineraryItemForm reused for both local drafts and direct server saves */}
        <Modal visible={showItineraryModal} animationType="slide">
          <SafeAreaView style={styles.modalContainer}>
            <ItineraryItemForm
              tripId={savedTripId}
              deferToParent={!savedTripId}
              onSubmit={handleItineraryModalSubmit}
              onCancel={() => setShowItineraryModal(false)}
            />
          </SafeAreaView>
        </Modal>
      </>
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
  toggleRow: {
    marginBottom: 12,
  },
  toggleLabel: {
    color: "grey",
    fontSize: 14,
    marginBottom: 5,
  },
  toggleTray: {
    marginTop: 0,
  },
  emptyHint: {
    color: "#aaa",
    fontSize: 13,
    marginBottom: 8,
    fontStyle: "italic",
  },
  itineraryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  itineraryIndex: {
    fontSize: 13,
    color: "#888",
    width: 20,
  },
  itineraryName: {
    fontSize: 14,
    color: "#111",
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 24,
  },
});

export default TripForm;

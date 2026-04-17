import { useState } from "react";
import { Alert, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import Form from "../../UI/Form";
import API from "../../API/API";
import Button, { ButtonTray } from "../../UI/Button";
import useCurrentLocation from "../../../utils/useCurrentLocation";

const defaultTip = {
  location: "",
  tip_content: "",
  is_hidden_gem: false,
  latitude: "",
  longitude: "",
};

const toFlat = (t) => ({
  ...defaultTip,
  ...t,
  latitude: t?.latitude != null ? String(t.latitude) : "",
  longitude: t?.longitude != null ? String(t.longitude) : "",
  is_hidden_gem: t?.is_hidden_gem ? true : false,
});

const TipForm = ({ originalTip, onSubmit, onCancel }) => {
  const [tip, setTip] = useState(toFlat(originalTip));
  const [locLoading, setLocLoading] = useState(false);

  // Reuse the same location hook as the SOS button
  const { refreshLocation } = useCurrentLocation();

  const handleChange = (field, value) =>
    setTip((prev) => ({ ...prev, [field]: value }));

  // ── Use My Location ──────────────────────────────────────────────────────────
  // Mirrors the SOS button pattern: calls refreshLocation(), then fills both
  // latitude and longitude fields with the device coordinates.
  const handleUseMyLocation = async () => {
    setLocLoading(true);
    try {
      const coords = await refreshLocation();
      if (coords) {
        setTip((prev) => ({
          ...prev,
          latitude: String(coords.latitude),
          longitude: String(coords.longitude),
        }));
      } else {
        Alert.alert(
          "Location Unavailable",
          "Could not get your current location. Please enter coordinates manually or check your location permissions.",
        );
      }
    } catch (e) {
      Alert.alert("Error", "Failed to retrieve location.");
    } finally {
      setLocLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!String(tip.location ?? "").trim()) {
      Alert.alert("Validation Error", "Location is required.");
      return;
    }
    if (!String(tip.tip_content ?? "").trim()) {
      Alert.alert("Validation Error", "Tip content is required.");
      return;
    }

    const payload = {
      location: tip.location.trim(),
      tip_content: tip.tip_content.trim(),
      is_hidden_gem: tip.is_hidden_gem === true,
      ...(tip.latitude.trim() && { latitude: parseFloat(tip.latitude) }),
      ...(tip.longitude.trim() && { longitude: parseFloat(tip.longitude) }),
    };

    try {
      let result;
      if (originalTip) {
        // PATCH existing tip
        result = await API.patch(
          `/rest/v1/travel_tips?id=eq.${originalTip.id}`,
          payload,
        );
      } else {
        // Add user_id and POST
        const userId = global?.UserID;
        if (!userId) {
          Alert.alert(
            "Authentication Required",
            "Please sign in to add a tip.",
          );
          return;
        }
        result = await API.post(`/rest/v1/travel_tips`, {
          ...payload,
          user_id: userId,
        });
      }

      if (result.isSuccess) {
        // Try to return the created/updated row if available
        let saved = null;
        if (result.result) {
          saved = Array.isArray(result.result)
            ? result.result[0]
            : result.result;
        } else {
          saved = { ...payload, id: originalTip?.id };
        }
        onSubmit?.(saved);
      } else {
        Alert.alert("Error", result.message || "Failed to save tip.");
      }
    } catch (e) {
      console.error("[TipForm] save error", e);
      Alert.alert("Error", "An unexpected error occurred.");
    }
  };

  const submitLabel = originalTip ? "Save Tip" : "Add Tip";

  return (
    <Form onSubmit={handleSubmit} onCancel={onCancel} submitLabel={submitLabel}>
      <Text style={styles.sectionHeading}>Tip</Text>

      <Form.InputText
        label="Location *"
        value={tip.location}
        onChange={(v) => handleChange("location", v)}
        placeholder="e.g. Blue Lagoon"
      />

      <Form.InputText
        label="Tip Content *"
        value={tip.tip_content}
        onChange={(v) => handleChange("tip_content", v)}
        placeholder="Describe the tip"
      />

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Hidden Gem</Text>
        <ButtonTray style={styles.toggleTray}>
          <Button
            label="Yes"
            variant={tip.is_hidden_gem ? "primary" : "ghost"}
            onClick={() => handleChange("is_hidden_gem", true)}
          />
          <Button
            label="No"
            variant={!tip.is_hidden_gem ? "primary" : "ghost"}
            onClick={() => handleChange("is_hidden_gem", false)}
          />
        </ButtonTray>
      </View>

      {/* ── Coordinates ──────────────────────────────────────────────────── */}
      <Text style={styles.sectionHeading}>Optional: Coordinates</Text>

      {/* "Use My Location" button — fills lat/lng from the device's GPS,
          mirroring the SOS button which uses the same useCurrentLocation hook */}
      <View style={styles.locationButtonRow}>
        {locLoading ? (
          <View style={styles.locLoadingWrap}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.locLoadingText}>Getting location…</Text>
          </View>
        ) : (
          <Button
            label="📍 Use My Location"
            variant="secondary"
            onClick={handleUseMyLocation}
          />
        )}
      </View>

      <Form.InputText
        label="Latitude"
        value={tip.latitude}
        onChange={(v) => handleChange("latitude", v)}
        placeholder="decimal e.g. 51.5074"
        keyboardType="decimal-pad"
      />

      <Form.InputText
        label="Longitude"
        value={tip.longitude}
        onChange={(v) => handleChange("longitude", v)}
        placeholder="decimal e.g. -0.1278"
        keyboardType="decimal-pad"
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
  // Location button row
  locationButtonRow: {
    marginBottom: 8,
  },
  locLoadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
  },
  locLoadingText: {
    fontSize: 14,
    color: "#555",
  },
});

export default TipForm;

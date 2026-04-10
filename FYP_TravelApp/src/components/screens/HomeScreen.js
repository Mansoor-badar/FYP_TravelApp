import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../UI/Button";
import TripForm from "../entity/Trip/TripForm";
import API from "../API/API";
import TripView from "../entity/Trip/TripView";

const HomeScreen = () => {
  const [showTripModal, setShowTripModal] = useState(false);
  const [trips, setTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showTripView, setShowTripView] = useState(false);

  const fetchTrips = async () => {
    setLoadingTrips(true);
    const res = await API.get(`/rest/v1/trips?select=*`);
    setLoadingTrips(false);
    if (!res.isSuccess) {
      console.error("Failed to load trips:", res.message);
      return;
    }
    const rows = Array.isArray(res.result)
      ? res.result
      : res.result
        ? [res.result]
        : [];
    setTrips(rows);
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleTripCreated = (trip) => {
    setShowTripModal(false);
    Alert.alert("Success", "Trip created successfully.");
    fetchTrips();
  };

  const handleOpenTrip = (trip) => {
    setSelectedTrip(trip);
    setShowTripView(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.addButtonWrapper}>
          <Button
            label="+ Add Trip"
            onClick={() => setShowTripModal(true)}
            variant="secondary"
            styleButton={{ flex: 0, width: "100%" }}
          />
        </View>

        {loadingTrips ? (
          <ActivityIndicator
            size="large"
            color="#000"
            style={{ marginTop: 24 }}
          />
        ) : (
          <ScrollView
            style={styles.listContainer}
            contentContainerStyle={{ paddingBottom: 60 }}
          >
            {/* My Trips */}
            <Text style={styles.sectionHeader}>My Trips</Text>
            {(() => {
              const userId = global.UserID ?? null;
              const myTrips = userId
                ? trips.filter((t) => t.host_id === userId)
                : [];
              if (myTrips.length === 0) {
                return (
                  <Text style={styles.emptyHint}>You have no trips yet.</Text>
                );
              }
              return myTrips.map((t) => (
                <TripView
                  key={t.id}
                  trip={t}
                  compact
                  onPress={handleOpenTrip}
                />
              ));
            })()}

            {/* Available Trips */}
            <Text style={styles.sectionHeader}>Available Trips</Text>
            {(() => {
              const userId = global.UserID ?? null;
              const available = trips.filter(
                (t) => t.is_public && t.host_id !== userId,
              );
              if (available.length === 0) {
                return (
                  <Text style={styles.emptyHint}>
                    No public trips available.
                  </Text>
                );
              }
              return available.map((t) => (
                <TripView
                  key={t.id}
                  trip={t}
                  compact
                  onPress={handleOpenTrip}
                />
              ));
            })()}
          </ScrollView>
        )}

        <Modal visible={showTripModal} animationType="slide">
          <SafeAreaView style={styles.modalContainer}>
            <TripForm
              hostId={global.UserID}
              onSubmit={handleTripCreated}
              onCancel={() => setShowTripModal(false)}
            />
          </SafeAreaView>
        </Modal>

        <Modal visible={showTripView} animationType="slide">
          <SafeAreaView style={styles.modalContainer}>
            <TripView trip={selectedTrip} />
            <View style={styles.modalFooter}>
              <Button
                label="Close"
                onClick={() => setShowTripView(false)}
                variant="primary"
                styleButton={{ flex: 0, width: "100%" }}
              />
            </View>
          </SafeAreaView>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  inner: {
    flex: 1,
    alignItems: "stretch",
    justifyContent: "flex-start",
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
  },
  addButtonWrapper: {
    width: "100%",
    marginTop: 12,
    marginBottom: 12,
  },
  modalFooter: {
    width: "100%",
    marginTop: 18,
    paddingBottom: 24,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 24,
  },
  listContainer: {
    width: "100%",
    marginTop: 12,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
    marginTop: 12,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  emptyHint: {
    color: "#888",
    fontSize: 14,
    marginBottom: 8,
  },
});

export default HomeScreen;

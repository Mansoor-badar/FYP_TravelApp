import { Alert, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TripForm from "../../entity/Trip/TripForm";

/**
 * TripModifyScreen
 *
 * Screen for editing an existing trip.
 * Expects route.params.trip with the trip object to edit.
 */
const TripModifyScreen = ({ navigation, route }) => {
  const { trip } = route.params;

  // Receive the saved trip from TripForm and navigate back with updated data
  // so TripViewScreen can refresh its state from route.params.
  const handleSubmit = (savedTrip) => {
    Alert.alert("Success", "Trip updated successfully!", [
      {
        text: "OK",
        onPress: () => {
          // Navigate back to TripView with merged trip data
          navigation.navigate("TripView", {
            trip: { ...trip, ...savedTrip },
          });
        },
      },
    ]);
  };

  const handleCancel = () => navigation.goBack();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.titleBar}>
        <Text style={styles.titleText}>Edit Trip</Text>
      </View>
      <TripForm
        originalTrip={trip}
        hostId={global.UserID}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
  },
  titleBar: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    marginBottom: 8,
  },
  titleText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },
});

export default TripModifyScreen;

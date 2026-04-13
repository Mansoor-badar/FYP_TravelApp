import { Alert, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ItineraryItemForm from "../../entity/ItineraryItem/ItineraryItemForm";

/**
 * ItineraryAddScreen
 *
 * Screen for adding a new activity to a trip's itinerary.
 * Navigates back after a successful save so TripViewScreen can
 * refetch the itinerary via useFocusEffect (or the caller can
 * subscribe to the navigation event).
 *
 * route.params:
 *   tripId – UUID of the parent trip
 */
const ItineraryAddScreen = ({ navigation, route }) => {
  const { tripId } = route.params;

  const handleSubmit = () => {
    Alert.alert("Activity Added", "The activity has been added to the trip.", [
      { text: "OK", onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.titleBar}>
        <Text style={styles.titleText}>Add Activity</Text>
      </View>
      <ItineraryItemForm
        tripId={tripId}
        onSubmit={handleSubmit}
        onCancel={() => navigation.goBack()}
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

export default ItineraryAddScreen;

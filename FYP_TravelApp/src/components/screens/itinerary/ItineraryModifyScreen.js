import { Alert, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ItineraryItemForm from "../../entity/ItineraryItem/ItineraryItemForm";

/**
 * ItineraryModifyScreen
 *
 * Screen for editing an existing itinerary activity.
 * Navigates back after a successful save.
 *
 * route.params:
 *   item – the itinerary_items object to edit (must include id and trip_id)
 */
const ItineraryModifyScreen = ({ navigation, route }) => {
  const { item } = route.params;

  const handleSubmit = () => {
    Alert.alert("Activity Updated", "Your changes have been saved.", [
      { text: "OK", onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.titleBar}>
        <Text style={styles.titleText}>Edit Activity</Text>
      </View>
      <ItineraryItemForm
        originalItem={item}
        tripId={item.trip_id}
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

export default ItineraryModifyScreen;

import { Alert, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TripForm from "../../entity/Trip/TripForm";

/**
 * TripAddScreen
 *
 * Screen for creating a new trip. After creation, navigates back so
 * HomeScreen can refetch via its useFocusEffect.
 */
const TripAddScreen = ({ navigation }) => {
  const handleSubmit = (trip) => {
    Alert.alert("Success", "Trip created successfully!", [
      { text: "OK", onPress: () => navigation.goBack() },
    ]);
  };

  const handleCancel = () => navigation.goBack();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.titleBar}>
        <Text style={styles.titleText}>New Trip</Text>
      </View>
      <TripForm
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

export default TripAddScreen;

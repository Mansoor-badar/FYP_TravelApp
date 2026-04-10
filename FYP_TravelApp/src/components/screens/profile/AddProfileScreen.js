import { Alert, StyleSheet, View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icons from "../../UI/Icon";
import ProfileForm from "../../entity/Profile/ProfileForm";

/**
 * AddProfileScreen
 *
 * Registration screen. Delegates all form rendering and submission
 * logic to ProfileForm — this screen only handles navigation callbacks.
 */
const AddProfileScreen = ({ navigation }) => {
  // Handlers ─────────────────────────────────────────────────────────────────

  const handleSubmit = (savedProfile) => {
    Alert.alert("Success", "Account created! You can now log in.", [
      { text: "OK", onPress: () => navigation.navigate("Login") },
    ]);
  };

  const handleCancel = () => navigation.navigate("Login");

  // View ─────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {/* Screen title */}
      <View style={styles.titleBar}>
        <Icons.Person size={22} color="#000" />
        <Text style={styles.titleText}>Create Account</Text>
      </View>

      {/* The form component owns all state and API logic */}
      <ProfileForm onSubmit={handleSubmit} onCancel={handleCancel} />
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
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    marginBottom: 12,
  },
  titleText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },
});

export default AddProfileScreen;

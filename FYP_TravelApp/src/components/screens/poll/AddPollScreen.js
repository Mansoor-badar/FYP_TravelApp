import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PollForm from "../../entity/Poll/PollForm";

/**
 * AddPollScreen
 *
 * Full-screen poll creation screen. All poll creation logic lives here
 * (delegated to PollForm). GroupScreen has no creation logic.
 *
 * route.params:
 *   tripId – UUID of the trip to attach the poll to
 */
const AddPollScreen = ({ navigation, route }) => {
  const { tripId } = route.params ?? {};
  const userId = global.UserID ?? null;

  const handleSubmit = (_newPoll, _options) => {
    // Navigate back to the Group tab. GroupScreen's useEffect will
    // automatically re-fetch polls from the DB when myTrips re-loads
    // on focus, so the new poll will appear for ALL users.
    navigation.navigate("MainTabs", { screen: "Group" });
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Back button row */}
      <View style={styles.header}>
        <Pressable
          onPress={handleCancel}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && styles.backBtnPressed,
          ]}
          hitSlop={8}
        >
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>
      </View>

      {/* Poll creation form */}
      <PollForm
        tripId={tripId}
        createdBy={userId}
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
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backBtn: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  backBtnPressed: {
    opacity: 0.6,
  },
  backBtnText: {
    fontSize: 14,
    color: "#555",
  },
});

export default AddPollScreen;

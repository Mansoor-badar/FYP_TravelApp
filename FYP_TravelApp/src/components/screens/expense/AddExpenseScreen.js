import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ExpenseForm from "../../entity/Expense/ExpenseForm";

/**
 * AddExpenseScreen
 *
 * Full-screen expense creation. All logic delegates to ExpenseForm.
 *
 * route.params:
 *   tripId      – UUID of the trip
 *   tripMembers – [{ id, name }] accepted members including host
 */
const AddExpenseScreen = ({ navigation, route }) => {
  const { tripId, tripMembers = [] } = route.params ?? {};
  const userId = global.UserID ?? null;

  const handleSubmit = () => {
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

      <ExpenseForm
        tripId={tripId}
        currentUserId={userId}
        tripMembers={tripMembers}
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

export default AddExpenseScreen;

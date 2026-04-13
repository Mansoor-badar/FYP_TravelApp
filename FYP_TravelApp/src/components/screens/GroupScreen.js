import React from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const GroupScreen = () => (
  <SafeAreaView style={styles.container}>
    <View />
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
});

export default GroupScreen;

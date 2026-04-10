import { ScrollView, StyleSheet, Text, View } from "react-native";
import ProfileItem from "./ProfileItem";

/**
 * ProfileList
 *
 * Renders a scrollable list of ProfileItem rows.
 *
 * Props:
 *   profiles           – array of profile objects
 *   onSelect(profile)  – forwarded to each ProfileItem
 */
const ProfileList = ({ profiles = [], onSelect }) => {
  // View ────────────────────────────────────────────────────────────────────
  if (!profiles.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No profiles found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {profiles.map((profile) => (
        <ProfileItem
          key={profile.id ?? profile.username}
          profile={profile}
          onSelect={onSelect}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 15,
    color: "#aaa",
  },
});

export default ProfileList;

import { Pressable, StyleSheet, Text, View, Image } from "react-native";

/**
 * ProfileItem
 *
 * A single pressable row representing a profile in a list.
 *
 * Props:
 *   profile   – profile object (first_name, last_name, username, profile_image_url, …)
 *   onSelect(profile) – called when the row is pressed.
 */
const ProfileItem = ({ profile, onSelect }) => {
  // Initialisations ─────────────────────────────────────────────────────────
  const fullName = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
  const avatarUri =
    profile.profile_image_url || "https://i.sstatic.net/l60Hf.png";

  // View ────────────────────────────────────────────────────────────────────
  return (
    <Pressable
      onPress={() => onSelect(profile)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Image source={{ uri: avatarUri }} style={styles.avatar} />

      <View style={styles.info}>
        <Text style={styles.name}>{fullName || "—"}</Text>
        {!!profile.username && (
          <Text style={styles.username}>@{profile.username}</Text>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderColor: "#ededed",
    gap: 12,
  },
  rowPressed: {
    opacity: 0.6,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f0f0f0",
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },
  username: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },
});

export default ProfileItem;

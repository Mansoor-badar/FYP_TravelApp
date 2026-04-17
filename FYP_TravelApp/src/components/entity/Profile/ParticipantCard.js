import React from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";

/**
 * ParticipantCard
 *
 * Avatar + full name + @username + optional "Host" label + "View Profile"
 * button in a grid cell.
 *
 * Extracted from the inline ParticipantCard inside TripViewScreen so it can
 * be reused anywhere a member grid is needed.
 *
 * Props:
 *   profile        – user profile object (first_name, last_name, username,
 *                    profile_image_url)
 *   onViewProfile  – (profile) => void  called when "View Profile" is tapped
 *   isHost         – if true, shows a "Host" label under the username
 */
const ParticipantCard = ({ profile, onViewProfile, isHost = false }) => {
  const fullName = profile
    ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "—"
    : "Unknown User";
  const avatarUri =
    profile?.profile_image_url || "https://i.sstatic.net/l60Hf.png";

  return (
    <View style={styles.card}>
      <Image source={{ uri: avatarUri }} style={styles.avatar} />
      <Text style={styles.name} numberOfLines={1}>
        {fullName}
      </Text>
      {!!profile?.username && (
        <Text style={styles.username} numberOfLines={1}>
          @{profile.username}
        </Text>
      )}
      {isHost && <Text style={styles.hostLabel}>Host</Text>}
      <Pressable
        onPress={() => profile && onViewProfile?.(profile)}
        style={({ pressed }) => [
          styles.viewBtn,
          pressed && styles.viewBtnPressed,
        ]}
      >
        <Text style={styles.viewBtnText}>View Profile</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: "46%",
    backgroundColor: "#fafafa",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#e0e0e0",
    marginBottom: 6,
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
  },
  username: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
  },
  hostLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#007AFF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  viewBtn: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#000",
  },
  viewBtnPressed: { opacity: 0.5 },
  viewBtnText: { fontSize: 12, fontWeight: "600", color: "#000" },
});

export default ParticipantCard;

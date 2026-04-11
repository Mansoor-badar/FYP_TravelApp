import React from "react";
import { Pressable, Image, StyleSheet, Text, View } from "react-native";

/**
 * ProfileIcon
 *
 * Minimal inline component showing a circular avatar icon and the
 * user's username only. Useful where space is limited.
 */
export const ProfileIcon = ({ profile, onPress }) => {
  if (!profile) return null;
  const avatarUri =
    profile.profile_image_url || "https://i.sstatic.net/l60Hf.png";
  return (
    <Pressable
      onPress={() => onPress?.(profile)}
      style={({ pressed }) => [styles.iconWrap, pressed && styles.iconPressed]}
    >
      <Image source={{ uri: avatarUri }} style={styles.avatarIcon} />
      {!!profile.username && (
        <Text style={styles.iconUsername}>@{profile.username}</Text>
      )}
    </Pressable>
  );
};

/**
 * ProfileCard
 *
 * Compact card for lists (avatar + display name + username).
 * This is the same UI that previously lived in `ProfileCard.js`.
 */
export const ProfileCard = ({ profile, onPress }) => {
  if (!profile) return null;
  const fullName =
    `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "—";
  const avatarUri =
    profile.profile_image_url || "https://i.sstatic.net/l60Hf.png";

  return (
    <Pressable
      onPress={() => onPress?.(profile)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.row}>
        <Image source={{ uri: avatarUri }} style={styles.avatarSmall} />
        <View style={styles.info}>
          <Text style={styles.name}>{fullName}</Text>
          {!!profile.username && (
            <Text style={styles.username}>@{profile.username}</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
};

/**
 * ProfileView
 *
 * Displays a full profile card — avatar, name, username, phone,
 * bio, travel info, and social links.
 *
 * Props:
 *   profile – profile object to display.
 */
const ProfileView = ({ profile, circularAvatar = false }) => {
  if (!profile) return null;
  // Initialisations
  const fullName =
    `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
  const avatarUri =
    profile.profile_image_url || "https://i.sstatic.net/l60Hf.png";

  const socialLinks = profile.social_links ?? {};
  const hasSocial =
    socialLinks.instagram || socialLinks.facebook || socialLinks.twitter;

  return (
    <View style={styles.container}>
      {/* Avatar */}
      <Image
        source={{ uri: avatarUri }}
        style={circularAvatar ? styles.avatarCircle : styles.avatar}
      />

      {/* Name + username */}
      <View style={[styles.nameRow, circularAvatar && styles.nameRowCentered]}>
        <Text style={styles.fullName}>{fullName || "—"}</Text>
        {!!profile.username && (
          <Text style={styles.username}>@{profile.username}</Text>
        )}
      </View>

      {/* Quick-info chips */}
      <View style={styles.chipRow}>
        {!!profile.phone && (
          <View style={styles.chip}>
            <Text style={styles.chipText}>{profile.phone}</Text>
          </View>
        )}
        {!!profile.age && (
          <View style={styles.chip}>
            <Text style={styles.chipText}>{profile.age} yrs</Text>
          </View>
        )}
        {!!profile.gender && (
          <View style={styles.chip}>
            <Text style={styles.chipText}>
              {profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)}
            </Text>
          </View>
        )}
      </View>

      {/* Bio */}
      {!!profile.bio && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Bio</Text>
          <Text style={styles.bodyText}>{profile.bio}</Text>
        </View>
      )}

      {/* Travel */}
      {(!!profile.travel_history || !!profile.travel_preferences) && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Travel</Text>
          {!!profile.travel_history && (
            <Text style={styles.bodyText}>
              <Text style={styles.dimLabel}>History: </Text>
              {profile.travel_history}
            </Text>
          )}
          {!!profile.travel_preferences && (
            <Text style={styles.bodyText}>
              <Text style={styles.dimLabel}>Preferences: </Text>
              {profile.travel_preferences}
            </Text>
          )}
        </View>
      )}

      {/* Social links */}
      {hasSocial && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Social</Text>
          {!!socialLinks.instagram && (
            <Text style={styles.bodyText}>
              <Text style={styles.dimLabel}>Instagram: </Text>
              {socialLinks.instagram}
            </Text>
          )}
          {!!socialLinks.facebook && (
            <Text style={styles.bodyText}>
              <Text style={styles.dimLabel}>Facebook: </Text>
              {socialLinks.facebook}
            </Text>
          )}
          {!!socialLinks.twitter && (
            <Text style={styles.bodyText}>
              <Text style={styles.dimLabel}>Twitter: </Text>
              {socialLinks.twitter}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingVertical: 8,
  },

  /* Avatar (large) */
  avatar: {
    width: "100%",
    aspectRatio: 1.5,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    resizeMode: "cover",
  },

  /* Circular avatar variant for profile screen */
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: "center",
    backgroundColor: "#f0f0f0",
    resizeMode: "cover",
    marginBottom: 8,
  },

  /* Name block */
  nameRow: {
    gap: 2,
  },
  nameRowCentered: {
    alignItems: "center",
  },
  fullName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
  },
  username: {
    fontSize: 14,
    color: "#888",
  },

  /* Chips */
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fafafa",
  },
  chipText: {
    fontSize: 13,
    color: "#444",
  },

  /* Sections */
  section: {
    gap: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#000",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 3,
    marginBottom: 4,
  },
  bodyText: {
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
  },
  dimLabel: {
    color: "#888",
    fontWeight: "600",
  },

  /* Compact card styles (ProfileCard) */
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  cardPressed: { opacity: 0.7 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarSmall: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
  },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700", color: "#111" },

  /* ProfileIcon */
  iconWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconPressed: { opacity: 0.7 },
  avatarIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  iconUsername: { fontSize: 14, fontWeight: "700", color: "#111" },
});

export default ProfileView;

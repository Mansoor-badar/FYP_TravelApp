import { Image, StyleSheet, Text, View } from "react-native";

/**
 * ProfileView
 *
 * Displays a full profile card — avatar, name, username, phone,
 * bio, travel info, and social links.
 *
 * Props:
 *   profile – profile object to display.
 */
const ProfileView = ({ profile }) => {
  // Initialisations ─────────────────────────────────────────────────────────
  const fullName = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
  const avatarUri =
    profile.profile_image_url || "https://i.sstatic.net/l60Hf.png";

  const socialLinks = profile.social_links ?? {};
  const hasSocial =
    socialLinks.instagram || socialLinks.facebook || socialLinks.twitter;

  // View ────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Avatar */}
      <Image source={{ uri: avatarUri }} style={styles.avatar} />

      {/* Name + username */}
      <View style={styles.nameRow}>
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

  /* Avatar ────────────────────────────── */
  avatar: {
    width: "100%",
    aspectRatio: 1.5,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    resizeMode: "cover",
  },

  /* Name block ────────────────────────── */
  nameRow: {
    gap: 2,
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

  /* Chips ─────────────────────────────── */
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

  /* Sections ──────────────────────────── */
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
});

export default ProfileView;

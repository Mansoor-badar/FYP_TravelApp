import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View, Image } from "react-native";
import API from "../../API/API";

const formatDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const pad = (n) => (n < 10 ? "0" + n : n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * TipCard
 *
 * Layout: avatar left, username + location top, hidden-gem + edit on right,
 * tip content below, date at bottom. If `profile` prop is missing the card
 * will fetch the profile once using the tip.user_id.
 */
const TipCard = ({ tip, profile, onPress, onEdit }) => {
  if (!tip) return null;

  const [localProfile, setLocalProfile] = useState(profile || null);

  useEffect(() => {
    setLocalProfile(profile || null);
  }, [profile]);

  useEffect(() => {
    if (localProfile) return;
    if (!tip?.user_id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await API.get(
          `/rest/v1/profiles?id=eq.${tip.user_id}&select=id,username,profile_image_url`,
        );
        if (
          !cancelled &&
          res.isSuccess &&
          Array.isArray(res.result) &&
          res.result[0]
        ) {
          setLocalProfile(res.result[0]);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tip?.user_id, localProfile]);

  const username = localProfile?.username || tip.user_id || "anonymous";
  const avatarUri =
    localProfile?.profile_image_url || "https://i.sstatic.net/l60Hf.png";
  const isOwn = String(tip.user_id) === String(global?.UserID ?? "");

  return (
    <Pressable
      onPress={() => onPress?.(tip)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.rowMain}>
        <Image source={{ uri: avatarUri }} style={styles.avatarLeft} />

        <View style={styles.contentArea}>
          <View style={styles.topRow}>
            <View style={styles.titleBlock}>
              <Text style={styles.usernameText}>@{username}</Text>
              <Text style={styles.locationText}>
                {tip.location || "Unknown location"}
              </Text>
            </View>

            <View style={styles.actionsBlock}>
              {tip.is_hidden_gem ? (
                <Text style={[styles.badge, styles.hiddenGem]}>Hidden gem</Text>
              ) : null}

              {isOwn && onEdit ? (
                <Pressable
                  onPress={() => onEdit?.(tip)}
                  style={styles.editButton}
                >
                  <Text style={styles.editText}>Edit</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <Text style={styles.description}>{tip.tip_content || "—"}</Text>

          {tip.created_at ? (
            <Text style={styles.dateTextSmall}>
              {formatDate(tip.created_at)}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardPressed: { opacity: 0.7 },
  rowMain: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  avatarLeft: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#f0f0f0",
  },
  contentArea: { flex: 1 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleBlock: { flex: 1 },
  usernameText: { fontSize: 16, fontWeight: "700", color: "#111" },
  locationText: { fontSize: 13, color: "#666", marginTop: 4 },
  actionsBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 8,
  },
  description: { fontSize: 14, color: "#333", marginTop: 10 },
  badge: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: "700",
  },
  hiddenGem: { color: "#fff", backgroundColor: "#FF5722" },
  editButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#007AFF",
    backgroundColor: "#fff",
  },
  editText: { color: "#007AFF", fontWeight: "700", fontSize: 12 },
  dateTextSmall: { fontSize: 12, color: "#777", marginTop: 8 },
});

export default TipCard;

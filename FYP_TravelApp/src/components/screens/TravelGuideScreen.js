import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import API from "../API/API";
import TipCard from "../entity/Tip/TipCard";
import Button from "../UI/Button";

const TravelGuideScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [tips, setTips] = useState([]);
  const [profilesMap, setProfilesMap] = useState({});

  const isMounted = useRef(true);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch tips
      const tipsRes = await API.get("/rest/v1/travel_tips?select=*");
      const tipsData =
        tipsRes.isSuccess && Array.isArray(tipsRes.result)
          ? tipsRes.result
          : [];

      // Fetch profiles for users referenced by tips (batch request)
      const userIds = Array.from(
        new Set(tipsData.map((t) => t.user_id).filter(Boolean)),
      );
      const profiles = {};
      if (userIds.length > 0) {
        try {
          // PostgREST expects string values quoted inside in(...)
          const quoted = userIds.map((u) => `"${u}"`).join(",");
          const r = await API.get(
            `/rest/v1/users?id=in.(${quoted})&select=id,username,profile_image_url`,
          );
          if (r.isSuccess && Array.isArray(r.result)) {
            r.result.forEach((p) => {
              if (p && p.id) profiles[p.id] = p;
            });
          }
        } catch (err) {
          // ignore profile fetch errors — we'll fall back to user id
        }
      }

      if (!isMounted.current) return;
      setTips(tipsData);
      setProfilesMap(profiles);
    } catch (e) {
      console.error("[TravelGuideScreen] loadData error", e);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    loadData();

    const unsub = navigation?.addListener?.("focus", () => {
      loadData();
    });

    return () => {
      isMounted.current = false;
      if (unsub) unsub();
    };
  }, [navigation]);

  const ownUserId = global?.UserID ?? null;

  // Group all tips by user_id so we render a single "Community Tips" section
  const groupedAll = {};
  tips.forEach((t) => {
    const uid = t.user_id || "_anon";
    if (!groupedAll[uid]) groupedAll[uid] = [];
    groupedAll[uid].push(t);
  });

  // Order groups so the current user's tips (if any) appear first
  const groupOrder = [];
  if (ownUserId && groupedAll[ownUserId]) groupOrder.push(ownUserId);
  Object.keys(groupedAll).forEach((uid) => {
    if (uid !== ownUserId) groupOrder.push(uid);
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ marginTop: 10 }}>
          <Button
            label="+ Add Tip"
            variant="secondary"
            onPress={() => navigation.navigate("AddTip")}
          />
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#007AFF"
            style={{ marginTop: 24 }}
          />
        ) : (
          <>
            {/* Community Tips (includes a 'Your Tips' subsection) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Community Tips</Text>
              {groupOrder.length === 0 ? (
                <Text style={styles.emptyText}>
                  No tips from the community yet.
                </Text>
              ) : (
                <>
                  {/* Your Tips subsection (if present) */}
                  {ownUserId && groupedAll[ownUserId] ? (
                    <>
                      <Text style={styles.subsectionTitle}>Your Tips</Text>
                      <View style={styles.userBlock}>
                        {groupedAll[ownUserId].map((t) => (
                          <TipCard
                            key={t.id}
                            tip={t}
                            profile={profilesMap[ownUserId]}
                            onEdit={() =>
                              navigation.navigate("ModifyTip", { tipId: t.id })
                            }
                          />
                        ))}
                      </View>
                    </>
                  ) : null}

                  {/* Other users' tips */}
                  {groupOrder.filter((uid) => uid !== ownUserId).length > 0 ? (
                    <>
                      <Text style={styles.subsectionTitle}>Community</Text>
                      {groupOrder
                        .filter((uid) => uid !== ownUserId)
                        .map((uid) => (
                          <View key={uid} style={styles.userBlock}>
                            {groupedAll[uid].map((t) => (
                              <TipCard
                                key={t.id}
                                tip={t}
                                profile={profilesMap[uid]}
                              />
                            ))}
                          </View>
                        ))}
                    </>
                  ) : null}
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  inner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 12,
  },
  section: {
    marginTop: 10,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
    marginTop: 12,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
    marginTop: 12,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  emptyText: { fontSize: 13, color: "#888", fontStyle: "italic" },
  userBlock: { gap: 8, marginBottom: 6 },
});

export default TravelGuideScreen;

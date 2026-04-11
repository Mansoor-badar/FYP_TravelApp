import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import TipForm from "../../entity/Tip/TipForm";
import API from "../../API/API";

const AddTipScreen = ({ navigation, route }) => {
  const [loading, setLoading] = useState(false);
  const [originalTip, setOriginalTip] = useState(route?.params?.tip ?? null);

  useEffect(() => {
    const id = route?.params?.tipId;
    if (!id || originalTip) return;

    let mounted = true;
    setLoading(true);
    API.get(`/rest/v1/travel_tips?id=eq.${id}`).then((res) => {
      if (!mounted) return;
      if (res.isSuccess && Array.isArray(res.result) && res.result[0]) {
        setOriginalTip(res.result[0]);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [route?.params?.tipId]);

  const handleSaved = (saved) => {
    // Navigate back — TravelGuideScreen will refresh on focus
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <TipForm
          originalTip={originalTip}
          onSubmit={handleSaved}
          onCancel={() => navigation.goBack()}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});

export default AddTipScreen;

import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActivityIndicator, View, StyleSheet, Alert } from "react-native";
import TipForm from "../../entity/Tip/TipForm";
import API from "../../API/API";

const ModifyTipScreen = ({ navigation, route }) => {
  const tipId = route?.params?.tipId ?? null;
  const [loading, setLoading] = useState(false);
  const [originalTip, setOriginalTip] = useState(null);

  useEffect(() => {
    let mounted = true;
    if (!tipId) {
      Alert.alert("Invalid Request", "No tip id provided.");
      navigation.goBack();
      return;
    }

    setLoading(true);
    API.get(`/rest/v1/travel_tips?id=eq.${tipId}`)
      .then((res) => {
        if (!mounted) return;
        if (res.isSuccess && Array.isArray(res.result) && res.result[0]) {
          setOriginalTip(res.result[0]);
        } else {
          Alert.alert("Not Found", "Tip not found.");
          navigation.goBack();
        }
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
        Alert.alert("Error", "Failed to load tip.");
        navigation.goBack();
      });

    return () => {
      mounted = false;
    };
  }, [tipId]);

  const handleSaved = (saved) => {
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

export default ModifyTipScreen;

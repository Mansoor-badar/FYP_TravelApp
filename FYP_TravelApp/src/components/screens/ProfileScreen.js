import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Button from "../UI/Button";
import API from "../API/API";
import ProfileView from "../entity/Profile/ProfileView";
import ProfileForm from "../entity/Profile/ProfileForm";

const ProfileScreen = ({ navigation, onLogout }) => {
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 90; // approximate height of the floating tab bar

  const fetchProfile = async () => {
    const userId = global.UserID ?? null;
    if (!userId) {
      setProfile(null);
      return;
    }

    setLoadingProfile(true);
    const res = await API.get(`/rest/v1/users?id=eq.${userId}&select=*`);
    setLoadingProfile(false);

    if (!res.isSuccess) {
      console.error("Failed to load profile:", res.message);
      Alert.alert("Error", "Failed to load profile.");
      return;
    }

    const rows = Array.isArray(res.result)
      ? res.result
      : res.result
        ? [res.result]
        : [];
    setProfile(rows[0] ?? null);
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleProfileUpdated = () => {
    setShowEditModal(false);
    Alert.alert("Success", "Profile updated successfully.");
    fetchProfile();
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          global.UserID = null;

          if (typeof onLogout === "function") {
            onLogout();
            return;
          }

          if (navigation?.reset) {
            navigation.reset({ index: 0, routes: [{ name: "Login" }] });
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.header}>My Profile</Text>

        {loadingProfile ? (
          <ActivityIndicator size="large" color="#000" style={styles.loader} />
        ) : !profile ? (
          <View style={styles.centered}>
            <Text style={styles.emptyHint}>
              No profile found for this user.
            </Text>
            <View style={{ width: "100%", marginTop: 12 }}>
              <Button
                label="Create Profile"
                onClick={() => navigation.navigate("AddProfile")}
                variant="secondary"
                styleButton={{ flex: 0, width: "100%" }}
              />
            </View>
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            contentContainerStyle={{
              paddingBottom: (insets.bottom ?? 0) + TAB_BAR_HEIGHT + 32,
            }}
          >
            <ProfileView profile={profile} />

            <View style={styles.actions}>
              <Button
                label="Edit Profile"
                onClick={() => setShowEditModal(true)}
                variant="secondary"
                styleButton={{ flex: 0, width: "100%" }}
              />

              <Button
                label="Logout"
                onClick={handleLogout}
                variant="primary"
                styleButton={{ flex: 0, width: "100%" }}
              />
            </View>
          </ScrollView>
        )}

        <Modal visible={showEditModal} animationType="slide">
          <SafeAreaView style={styles.modalContainer}>
            <ProfileForm
              originalProfile={profile}
              onSubmit={handleProfileUpdated}
              onCancel={() => setShowEditModal(false)}
            />
          </SafeAreaView>
        </Modal>
      </View>
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
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  header: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    marginTop: 12,
    marginBottom: 16,
  },
  loader: {
    marginTop: 24,
  },
  content: {
    width: "100%",
  },
  actions: {
    width: "100%",
    marginTop: 24,
    gap: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 24,
  },
  emptyHint: {
    color: "#888",
    fontSize: 14,
    marginTop: 12,
  },
  centered: {
    alignItems: "center",
  },
});

export default ProfileScreen;

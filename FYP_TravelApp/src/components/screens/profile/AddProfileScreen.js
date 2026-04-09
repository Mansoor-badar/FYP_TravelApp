import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Form from "../../UI/Form";
import Icons from "../../UI/Icon";
import API from "../../API/API";

const BASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const API_KEY  = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

// Build the /users endpoint URL (mirrors the pattern shown by the user)
const usersEndpoint = BASE_URL
  ? `/rest/v1/users`
  : null;

// Default avatar shown when the user does not supply their own image URL.
// Confirmed accessible: resolves to a generic user icon PNG.
const DEFAULT_AVATAR = "https://i.sstatic.net/l60Hf.png";

const GENDER_OPTIONS = [
  { label: "Male",   value: "male"   },
  { label: "Female", value: "female" },
  { label: "Other",  value: "other"  },
];

const AddProfileScreen = ({ navigation }) => {
  // Required fields
  const [username, setUsername]   = useState("");
  const [password, setPassword]   = useState("");

  // Optional profile fields
  const [firstName,  setFirstName]  = useState("");
  const [lastName,   setLastName]   = useState("");
  const [phone,      setPhone]      = useState("");
  const [age,        setAge]        = useState("");
  const [gender,     setGender]     = useState(null);
  const [bio,        setBio]        = useState("");

  // FR01 fields
  const [travelHistory,     setTravelHistory]     = useState("");
  const [travelPreferences, setTravelPreferences] = useState("");

  // Profile image
  const [profileImageUrl, setProfileImageUrl] = useState("");

  // Social links
  const [instagram, setInstagram] = useState("");
  const [facebook,  setFacebook]  = useState("");
  const [twitter,   setTwitter]   = useState("");

  const handleSubmit = async () => {
    // Validate required fields
    if (!username.trim()) {
      Alert.alert("Validation Error", "Username is required.");
      return;
    }
    if (!password.trim()) {
      Alert.alert("Validation Error", "Password is required.");
      return;
    }
    if (!firstName.trim()) {
      Alert.alert("Validation Error", "First Name is required.");
      return;
    }
    if (!lastName.trim()) {
      Alert.alert("Validation Error", "Last Name is required.");
      return;
    }
    if (!phone.trim()) {
      Alert.alert("Validation Error", "Phone number is required.");
      return;
    }
    if (!age.trim()) {
      Alert.alert("Validation Error", "Age is required.");
      return;
    }
    if (isNaN(parseInt(age, 10)) || parseInt(age, 10) <= 0) {
      Alert.alert("Validation Error", "Please enter a valid age.");
      return;
    }
    if (!gender) {
      Alert.alert("Validation Error", "Please select a gender.");
      return;
    }

    if (!usersEndpoint) {
      Alert.alert("Config Error", "API base URL is not configured.");
      return;
    }

    // Build the payload — required fields always included, optional spread in if present
    const payload = {
      username:   username.trim(),
      password:   password.trim(),
      first_name: firstName.trim(),
      last_name:  lastName.trim(),
      phone:      phone.trim(),
      age:        parseInt(age, 10),
      gender,
      ...(bio.trim()               && { bio:                bio.trim()               }),
      ...(travelHistory.trim()     && { travel_history:     travelHistory.trim()     }),
      ...(travelPreferences.trim() && { travel_preferences: travelPreferences.trim() }),
      // Always send a profile image — use the default avatar if the user left it blank
      profile_image_url: profileImageUrl.trim() || DEFAULT_AVATAR,
    };

    // Build social_links JSONB only when at least one link is provided
    const socialLinks = {};
    if (instagram.trim()) socialLinks.instagram = instagram.trim();
    if (facebook.trim())  socialLinks.facebook  = facebook.trim();
    if (twitter.trim())   socialLinks.twitter   = twitter.trim();
    if (Object.keys(socialLinks).length > 0) payload.social_links = socialLinks;

    const response = await API.post(usersEndpoint, payload);

    if (response.isSuccess) {
      Alert.alert("Success", "Account created! You can now log in.", [
        { text: "OK", onPress: () => navigation.navigate("Login") },
      ]);
    } else {
      Alert.alert("Error", response.message || "Registration failed. Please try again.");
    }
  };

  const handleCancel = () => {
    navigation.navigate("Login");
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Screen Title */}
      <View style={styles.titleBar}>
        <Icons.Person size={22} color="#000" />
        <Text style={styles.titleText}>Create Account</Text>
      </View>

      <Form
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitLabel="Register"
      >
        {/* ── Required ─────────────────────────────── */}
        <Text style={styles.sectionHeading}>Account Details *</Text>

        <Form.InputText
          label="Username *"
          value={username}
          onChange={setUsername}
          placeholder="e.g. john_doe"
        />

        <Form.InputText
          label="Password *"
          value={password}
          onChange={setPassword}
          placeholder="Choose a password"
          secureTextEntry
        />

        {/* ── Personal Info ─────────────────────────── */}
        <Text style={styles.sectionHeading}>Personal Info</Text>

        <Form.InputText
          label="First Name *"
          value={firstName}
          onChange={setFirstName}
          placeholder="e.g. John"
        />

        <Form.InputText
          label="Last Name *"
          value={lastName}
          onChange={setLastName}
          placeholder="e.g. Doe"
        />

        <Form.InputText
          label="Phone *"
          value={phone}
          onChange={setPhone}
          placeholder="e.g. +44 7700 900000"
        />

        <Form.InputText
          label="Age *"
          value={age}
          onChange={setAge}
          placeholder="e.g. 25"
        />

        <Form.InputSelect
          label="Gender *"
          prompt="Select gender…"
          options={GENDER_OPTIONS}
          value={gender}
          onChange={setGender}
        />

        <Form.InputText
          label="Bio"
          value={bio}
          onChange={setBio}
          placeholder="Tell us a bit about yourself"
        />

        <Form.InputText
          label="Profile Image URL (leave blank for default)"
          value={profileImageUrl}
          onChange={setProfileImageUrl}
          placeholder={DEFAULT_AVATAR}
        />

        {/* ── Travel (FR01) ────────────────────────── */}
        <Text style={styles.sectionHeading}>Travel</Text>

        <Form.InputText
          label="Travel History"
          value={travelHistory}
          onChange={setTravelHistory}
          placeholder="e.g. France, Tokyo, New York"
        />

        <Form.InputText
          label="Travel Preferences"
          value={travelPreferences}
          onChange={setTravelPreferences}
          placeholder="e.g. Backpacking, Luxury, Solo"
        />

        {/* ── Social Links ─────────────────────────── */}
        <Text style={styles.sectionHeading}>Social Links</Text>

        <Form.InputText
          label="Instagram"
          value={instagram}
          onChange={setInstagram}
          placeholder="e.g. @your_handle"
        />

        <Form.InputText
          label="Facebook"
          value={facebook}
          onChange={setFacebook}
          placeholder="e.g. facebook.com/your_profile"
        />

        <Form.InputText
          label="Twitter / X"
          value={twitter}
          onChange={setTwitter}
          placeholder="e.g. @your_handle"
        />
      </Form>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
  },

  titleBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    marginBottom: 12,
  },
  titleText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },

  sectionHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: "#000",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 4,
  },
});

export default AddProfileScreen;

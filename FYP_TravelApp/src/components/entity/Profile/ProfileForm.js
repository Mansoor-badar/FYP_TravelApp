import { useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import Form from "../../UI/Form";
import API from "../../API/API";

// ── Constants ─────────────────────────────────────────────────────────────────

// Default avatar used when the user leaves the image URL field blank.
// API.js internally reads EXPO_PUBLIC_SUPABASE_URL so we don't need it here.
const DEFAULT_AVATAR = "https://i.sstatic.net/l60Hf.png";

const GENDER_OPTIONS = [
  { label: "Male",   value: "male"   },
  { label: "Female", value: "female" },
  { label: "Other",  value: "other"  },
];

// ── Default shape for a brand-new profile ────────────────────────────────────

const defaultProfile = {
  username:           "",
  password:           "",
  first_name:         "",
  last_name:          "",
  phone:              "",
  age:                "",
  gender:             null,
  bio:                "",
  profile_image_url:  "",
  travel_history:     "",
  travel_preferences: "",
  social_links: {
    instagram: "",
    facebook:  "",
    twitter:   "",
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * ProfileForm
 *
 * Reusable form for creating or editing a user profile.
 *
 * Props:
 *   originalProfile  – existing profile object (edit mode). Omit for create mode.
 *   onSubmit(profile) – called with the saved profile on success.
 *   onCancel()        – called when the user presses Cancel.
 */
const ProfileForm = ({ originalProfile, onSubmit, onCancel }) => {
  // Initialisations ─────────────────────────────────────────────────────────

  // Flatten social_links so each input has its own state key
  const toFlat = (p) => ({
    ...defaultProfile,
    ...p,
    instagram: p?.social_links?.instagram ?? "",
    facebook:  p?.social_links?.facebook  ?? "",
    twitter:   p?.social_links?.twitter   ?? "",
    age:       p?.age != null ? String(p.age) : "",
  });

  // State ───────────────────────────────────────────────────────────────────
  const [profile, setProfile] = useState(toFlat(originalProfile));

  // Handlers ────────────────────────────────────────────────────────────────

  const handleChange = (field, value) =>
    setProfile((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    // Validate required fields
    const required = [
      ["username",   "Username"],
      ["password",   "Password"],
      ["first_name", "First Name"],
      ["last_name",  "Last Name"],
      ["phone",      "Phone"],
      ["age",        "Age"],
    ];
    for (const [field, label] of required) {
      if (!String(profile[field] ?? "").trim()) {
        Alert.alert("Validation Error", `${label} is required.`);
        return;
      }
    }

    const parsedAge = parseInt(profile.age, 10);
    if (isNaN(parsedAge) || parsedAge <= 0) {
      Alert.alert("Validation Error", "Please enter a valid age.");
      return;
    }
    if (!profile.gender) {
      Alert.alert("Validation Error", "Please select a gender.");
      return;
    }

    // Build payload — column names match the users table exactly.
    // profile_image_url always gets a value: the user's URL or the default avatar.
    const payload = {
      username:          profile.username.trim(),
      password:          profile.password.trim(),
      first_name:        profile.first_name.trim(),
      last_name:         profile.last_name.trim(),
      phone:             profile.phone.trim(),
      age:               parsedAge,           // int4 in DB
      gender:            profile.gender,      // text in DB
      profile_image_url: profile.profile_image_url.trim() || DEFAULT_AVATAR,
      ...(profile.bio.trim()                && { bio:                profile.bio.trim()                }),
      ...(profile.travel_history.trim()     && { travel_history:     profile.travel_history.trim()     }),
      ...(profile.travel_preferences.trim() && { travel_preferences: profile.travel_preferences.trim() }),
    };

    // social_links JSONB — only add when at least one value is filled
    const socialLinks = {};
    if (profile.instagram.trim()) socialLinks.instagram = profile.instagram.trim();
    if (profile.facebook.trim())  socialLinks.facebook  = profile.facebook.trim();
    if (profile.twitter.trim())   socialLinks.twitter   = profile.twitter.trim();
    if (Object.keys(socialLinks).length > 0) payload.social_links = socialLinks;

    // POST (create) or PATCH (edit) via Supabase PostgREST ──────────────────
    // Endpoint: /rest/v1/users  (matches the "users" table in the DB)
    // Filter:   ?id=eq.<uuid>   (PostgREST row filter syntax for PATCH/PUT)
    // API.js automatically attaches the apikey + Bearer auth headers.
    let result;
    if (originalProfile) {
      // PATCH updates only the columns we send — safer than PUT which would
      // blank out any column we omit. API.js sends method PUT; Supabase accepts
      // both PUT and PATCH for row-level updates via the REST API.
      const patchEndpoint = `/rest/v1/users?id=eq.${originalProfile.id}`;
      result = await API.put(patchEndpoint, payload);
    } else {
      // POST creates a new row. Supabase returns 201 on success.
      result = await API.post(`/rest/v1/users`, payload);
    }

    if (result.isSuccess) {
      onSubmit({ ...payload, id: originalProfile?.id });
    } else {
      Alert.alert("Error", result.message || "Could not save profile. Please try again.");
    }
  };

  // View ────────────────────────────────────────────────────────────────────

  const submitLabel = originalProfile ? "Save Changes" : "Register";

  return (
    <Form onSubmit={handleSubmit} onCancel={onCancel} submitLabel={submitLabel}>

      {/* ── Account Details ───────────────────────────────── */}
      <Text style={styles.sectionHeading}>Account Details *</Text>

      <Form.InputText
        label="Username *"
        value={profile.username}
        onChange={(v) => handleChange("username", v)}
        placeholder="e.g. john_doe"
      />

      <Form.InputText
        label="Password *"
        value={profile.password}
        onChange={(v) => handleChange("password", v)}
        placeholder="Choose a password"
        secureTextEntry
      />

      {/* ── Personal Info ─────────────────────────────────── */}
      <Text style={styles.sectionHeading}>Personal Info</Text>

      <Form.InputText
        label="First Name *"
        value={profile.first_name}
        onChange={(v) => handleChange("first_name", v)}
        placeholder="e.g. John"
      />

      <Form.InputText
        label="Last Name *"
        value={profile.last_name}
        onChange={(v) => handleChange("last_name", v)}
        placeholder="e.g. Doe"
      />

      <Form.InputText
        label="Phone *"
        value={profile.phone}
        onChange={(v) => handleChange("phone", v)}
        placeholder="e.g. +44 7700 900000"
      />

      <Form.InputText
        label="Age *"
        value={profile.age}
        onChange={(v) => handleChange("age", v)}
        placeholder="e.g. 25"
      />

      <Form.InputSelect
        label="Gender *"
        prompt="Select gender…"
        options={GENDER_OPTIONS}
        value={profile.gender}
        onChange={(v) => handleChange("gender", v)}
      />

      <Form.InputText
        label="Bio"
        value={profile.bio}
        onChange={(v) => handleChange("bio", v)}
        placeholder="Tell us a bit about yourself"
      />

      <Form.InputText
        label="Profile Image URL (leave blank to use default avatar)"
        value={profile.profile_image_url}
        onChange={(v) => handleChange("profile_image_url", v)}
        placeholder={DEFAULT_AVATAR}  // default shown as hint; saved automatically if left blank
      />

      {/* ── Travel ────────────────────────────────────────── */}
      <Text style={styles.sectionHeading}>Travel</Text>

      <Form.InputText
        label="Travel History"
        value={profile.travel_history}
        onChange={(v) => handleChange("travel_history", v)}
        placeholder="e.g. France, Tokyo, New York"
      />

      <Form.InputText
        label="Travel Preferences"
        value={profile.travel_preferences}
        onChange={(v) => handleChange("travel_preferences", v)}
        placeholder="e.g. Backpacking, Luxury, Solo"
      />

      {/* ── Social Links ──────────────────────────────────── */}
      <Text style={styles.sectionHeading}>Social Links</Text>

      <Form.InputText
        label="Instagram"
        value={profile.instagram}
        onChange={(v) => handleChange("instagram", v)}
        placeholder="e.g. @your_handle"
      />

      <Form.InputText
        label="Facebook"
        value={profile.facebook}
        onChange={(v) => handleChange("facebook", v)}
        placeholder="e.g. facebook.com/your_profile"
      />

      <Form.InputText
        label="Twitter / X"
        value={profile.twitter}
        onChange={(v) => handleChange("twitter", v)}
        placeholder="e.g. @your_handle"
      />
    </Form>
  );
};

const styles = StyleSheet.create({
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

export default ProfileForm;

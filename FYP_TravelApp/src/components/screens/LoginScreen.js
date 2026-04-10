import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icons from "../UI/Icon";
import API from "../API/API";
import Button, { ButtonTray } from "../UI/Button";

const BASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const API_KEY  = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

const LoginScreen = ({ navigation }) => {
  const [username, setUsername]     = useState("");
  const [password, setPassword]     = useState("");
  const [errorMsg, setErrorMsg]     = useState("");
  const [isLoading, setIsLoading]   = useState(false);

  const handleLogin = async () => {
    setErrorMsg("");

    if (!username.trim() || !password.trim()) {
      setErrorMsg("Please enter your username and password.");
      return;
    }

    if (!BASE_URL || !API_KEY) {
      setErrorMsg("API configuration is missing. Check your .env file.");
      return;
    }

    setIsLoading(true);

    try {
      // Fetch all users from the Supabase REST endpoint
      const endpoint = `/rest/v1/users?select=id,username,password&apikey=${API_KEY}`;
      const response = await API.get(endpoint);

      if (!response.isSuccess) {
        setErrorMsg(response.message || "Failed to reach the server.");
        setIsLoading(false);
        return;
      }

      const users = Array.isArray(response.result) ? response.result : [];

      // Match credentials (case-sensitive)
      const matchedUser = users.find(
        (u) =>
          u.username === username.trim() &&
          u.password === password.trim()
      );

      if (!matchedUser) {
        setErrorMsg("Invalid username or password.");
        setIsLoading(false);
        return;
      }

      // Persist the authenticated user ID globally
      global.UserID = matchedUser.id;

      // Reset the stack so the user cannot navigate back to Login
      navigation.reset({
        index: 0,
        routes: [{ name: "MainTabs" }],
      });
    } catch (err) {
      setErrorMsg("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        {/* Header */}
        <View style={styles.header}>
          <Icons.Person size={40} color="#000" />
          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.subtitle}>Welcome back. Please log in.</Text>
        </View>

        {/* Username */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Username</Text>
          <View style={styles.inputRow}>
            <Icons.Person size={18} color="#555" />
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter username"
              placeholderTextColor="#aaa"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Password */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputRow}>
            <Icons.Lock size={18} color="#555" />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              placeholderTextColor="#aaa"
              secureTextEntry
            />
          </View>
        </View>

        {/* Error message */}
        {!!errorMsg && (
          <Text style={styles.errorText}>{errorMsg}</Text>
        )}

        {/* Login button */}
        <ButtonTray>
          <Button
            label="Log In"
            icon={<Icons.Submit size={18} color="#fff" />}
            onPress={handleLogin}
            loading={isLoading}
            variant="primary"
          />
        </ButtonTray>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Register button */}
        <ButtonTray>
          <Button
            label="Create an Account"
            icon={<Icons.Add size={18} color="#000" />}
            onPress={() => navigation.navigate("AddProfile")}
            variant="secondary"
          />
        </ButtonTray>
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
    justifyContent: "center",
  },

  /* Header */
  header: {
    alignItems: "center",
    marginBottom: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000",
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#555",
    marginTop: 4,
  },

  /* Fields */
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000",
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 48,
    gap: 10,
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#000",
  },

  /* Buttons */
  /* Error */
  errorText: {
    color: "#cc0000",
    fontSize: 13,
    marginBottom: 8,
    marginTop: -4,
  },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd",
  },
  dividerText: {
    fontSize: 13,
    color: "#999",
  },
});

export default LoginScreen;

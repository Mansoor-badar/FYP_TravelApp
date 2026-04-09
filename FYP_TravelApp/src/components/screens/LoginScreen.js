import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icons from "../UI/Icon";

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter your username and password.");
      return;
    }
    // TODO: implement login logic against the API
    Alert.alert("Login", `Logging in as ${username}`);
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

        {/* Login button */}
        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
          activeOpacity={0.8}
        >
          <Icons.Submit size={18} color="#fff" />
          <Text style={styles.loginButtonText}>Log In</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Register button */}
        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => navigation.navigate("AddProfile")}
          activeOpacity={0.8}
        >
          <Icons.Add size={18} color="#000" />
          <Text style={styles.registerButtonText}>Create an Account</Text>
        </TouchableOpacity>
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
  loginButton: {
    height: 48,
    borderRadius: 6,
    backgroundColor: "#000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
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

  registerButton: {
    height: 48,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
  },
  registerButtonText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "600",
  },
});

export default LoginScreen;

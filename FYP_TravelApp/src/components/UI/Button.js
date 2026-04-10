import React from "react";
import { Pressable, StyleSheet, Text, View, ActivityIndicator } from "react-native";

const Button = ({
  label,
  icon,
  onPress,
  onClick,
  variant = "primary",
  disabled = false,
  loading = false,
  styleButton,
  styleLabel,
}) => {
  const pressHandler = onPress || onClick;

  const variantButtonStyle = variantButtonStyles[variant] ?? variantButtonStyles.primary;
  const variantLabelStyle  = variantLabelStyles[variant]  ?? variantLabelStyles.primary;
  const indicatorColor     = variant === "primary" || variant === "danger" ? "#fff" : "#000";

  return (
    <Pressable
      onPress={pressHandler}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        variantButtonStyle,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        styleButton,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={indicatorColor} />
      ) : (
        <>
          {icon ?? null}
          {label != null && (
            <Text style={[styles.label, variantLabelStyle, styleLabel]}>{label}</Text>
          )}
        </>
      )}
    </Pressable>
  );
};

export const ButtonTray = ({ children, style }) => (
  <View style={[styles.buttonTray, style]}>{children}</View>
);

const variantButtonStyles = StyleSheet.create({
  primary: {
    backgroundColor: "#000",
    borderWidth: 0,
  },
  secondary: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#000",
  },
  danger: {
    backgroundColor: "#cc0000",
    borderWidth: 0,
  },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#ccc",
  },
});

const variantLabelStyles = StyleSheet.create({
  primary:   { color: "#fff" },
  secondary: { color: "#000" },
  danger:    { color: "#fff" },
  ghost:     { color: "#555" },
});


const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    flex: 1,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.75,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
  },
  buttonTray: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
});

export default Button;

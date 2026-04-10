import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

const TAB_ICONS = {
  Home:        "home",
  Group:       "group",
  Map:         "map",
  TravelGuide: "explore",
  Profile:     "person",
};

const TAB_LABELS = {
  Home:        "Home",
  Group:       "Group",
  Map:         "Map",
  TravelGuide: "Guide",
  Profile:     "Profile",
};

/**
 * BottomNavBar — custom tab bar for @react-navigation/bottom-tabs.
 *
 * Receives `state`, `descriptors`, and `navigation` from the Tab Navigator.
 */
const BottomNavBar = ({ state, navigation }) => {
  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const isActive  = state.index === index;
        const iconName  = TAB_ICONS[route.name]  ?? "circle";
        const label     = TAB_LABELS[route.name] ?? route.name;

        return (
          <Pressable
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={styles.pressable}
          >
            <View style={[styles.circle, isActive && styles.circleActive]}>
              <MaterialIcons
                name={iconName}
                size={22}
                color={isActive ? "#fff" : "#555"}
              />
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 8,
    // Shadow (iOS)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    // Elevation (Android)
    elevation: 10,
  },
  pressable: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  circleActive: {
    backgroundColor: "#000",
  },
  label: {
    fontSize: 11,
    color: "#888",
    fontWeight: "500",
  },
  labelActive: {
    color: "#000",
    fontWeight: "700",
  },
});

export default BottomNavBar;

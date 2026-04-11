import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import LoginScreen from "./src/components/screens/LoginScreen";
import AddProfileScreen from "./src/components/screens/profile/AddProfileScreen";
import HomeScreen from "./src/components/screens/HomeScreen";
import GroupScreen from "./src/components/screens/GroupScreen";
import MapScreen from "./src/components/screens/MapScreen";
import TravelGuideScreen from "./src/components/screens/TravelGuideScreen";
import ProfileScreen from "./src/components/screens/ProfileScreen";
import AddTipScreen from "./src/components/screens/tip/AddTipScreen";
import ModifyTipScreen from "./src/components/screens/tip/ModifyTipScreen";
import TripAddScreen from "./src/components/screens/trip/TripAddScreen";
import TripModifyScreen from "./src/components/screens/trip/TripModifyScreen";
import TripViewScreen from "./src/components/screens/trip/TripViewScreen";
import BottomNavBar from "./src/components/UI/BottomNavBar";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomNavBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Group" component={GroupScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="TravelGuide" component={TravelGuideScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{ headerShown: false }}
        >
          {/* Auth screens — no bottom nav */}
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="AddProfile" component={AddProfileScreen} />
          <Stack.Screen name="AddTip" component={AddTipScreen} />
          <Stack.Screen name="ModifyTip" component={ModifyTipScreen} />
          {/* Trip screens — pushed from HomeScreen */}
          <Stack.Screen name="TripView" component={TripViewScreen} />
          <Stack.Screen name="TripAdd" component={TripAddScreen} />
          <Stack.Screen name="TripModify" component={TripModifyScreen} />

          {/* Authenticated app — Tab navigator with BottomNavBar */}
          <Stack.Screen name="MainTabs" component={MainTabs} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

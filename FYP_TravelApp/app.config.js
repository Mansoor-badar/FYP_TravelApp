import 'dotenv/config';

export default {
  "expo": {
    "name": "FYP_TravelApp",
    "slug": "FYP_TravelApp",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "config": {
        "googleMapsApiKey": process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "edgeToEdgeEnabled": true,
      "config": {
        "googleMaps": {
          "apiKey": process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY
        }
      },
      "package": "com.mansoorbadar.FYP_TravelApp"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "@react-native-community/datetimepicker",
      "expo-font"
    ],
    "extra": {
      "eas": {
        "projectId": "046d6151-3f3e-4cff-88e5-4afce46e985f"
      }
    }
  }
};

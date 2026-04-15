import { useState, useCallback, useEffect } from 'react';
import * as Location from 'expo-location';

// ─── useCurrentLocation ───────────────────────────────────────────────────────
//
// Requests foreground location permission on mount and exposes:
//   location        – { latitude, longitude } or null
//   permissionError – true when the user denied permission
//   loading         – true while permission/location is being fetched
//   refreshLocation – call to re-fetch the current position on demand
// ─────────────────────────────────────────────────────────────────────────────

const useCurrentLocation = () => {
  const [location, setLocation] = useState(null);
  const [permissionError, setPermissionError] = useState(false);
  const [loading, setLoading] = useState(false);

  const refreshLocation = useCallback(async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionError(true);
        setLoading(false);
        return null;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      setLocation(coords);
      setLoading(false);
      return coords;
    } catch {
      setLoading(false);
      return null;
    }
  }, []);

  // Fetch once on mount so the location is ready when needed
  useEffect(() => {
    refreshLocation();
  }, [refreshLocation]);

  return { location, permissionError, loading, refreshLocation };
};

export default useCurrentLocation;

import API from './API';

// ─── SafetyStatusAPI ──────────────────────────────────────────────────────────
//
// All DB calls for the `safety_status` table live here.
// Table schema:
//   id (uuid), user_id (uuid), trip_id (uuid),
//   last_lat (numeric), last_long (numeric),
//   is_sos_active (bool), safety_passkey (text), updated_at (timestamptz)
// ─────────────────────────────────────────────────────────────────────────────

const SafetyStatusAPI = {};

/**
 * Fetch all safety_status rows for a trip.
 * Used by GroupScreen to find active SOS alerts across all members.
 */
SafetyStatusAPI.getByTrip = (tripId) =>
  API.get(`/rest/v1/safety_status?trip_id=eq.${tripId}&select=*`);

/**
 * Fetch the safety_status row for a specific user + trip.
 * Returns the single row or null if none exists yet.
 */
SafetyStatusAPI.getByUserAndTrip = (userId, tripId) =>
  API.get(
    `/rest/v1/safety_status?user_id=eq.${userId}&trip_id=eq.${tripId}&select=*`,
  );

/**
 * Fetch all ACTIVE SOS rows across a set of trip IDs (for the map).
 * tripIds – string[] of UUIDs
 */
SafetyStatusAPI.getActiveSosByTrips = (tripIds) => {
  if (!tripIds || tripIds.length === 0)
    return Promise.resolve({ isSuccess: true, result: [] });
  const ids = tripIds.map((id) => `"${id}"`).join(',');
  return API.get(
    `/rest/v1/safety_status?trip_id=in.(${ids})&is_sos_active=eq.true&last_lat=not.is.null&last_long=not.is.null&select=*`,
  );
};

/**
 * Create a new safety_status record for a user + trip.
 * Called the very first time a user presses SOS on a trip.
 */
SafetyStatusAPI.create = (userId, tripId, { isActive, passkey, lat, long }) =>
  API.post('/rest/v1/safety_status', {
    user_id: userId,
    trip_id: tripId,
    is_sos_active: isActive,
    safety_passkey: passkey ?? null,
    last_lat: lat ?? null,
    last_long: long ?? null,
    updated_at: new Date().toISOString(),
  });

/**
 * Activate SOS – PATCH the existing row.
 * Sets is_sos_active=true, stores the passkey, and saves the current position.
 */
SafetyStatusAPI.activateSos = (userId, tripId, { passkey, lat, long }) =>
  API.patch(
    `/rest/v1/safety_status?user_id=eq.${userId}&trip_id=eq.${tripId}`,
    {
      is_sos_active: true,
      safety_passkey: passkey,
      last_lat: lat,
      last_long: long,
      updated_at: new Date().toISOString(),
    },
  );

/**
 * Deactivate SOS – PATCH to clear the active flag and passkey.
 */
SafetyStatusAPI.deactivateSos = (userId, tripId) =>
  API.patch(
    `/rest/v1/safety_status?user_id=eq.${userId}&trip_id=eq.${tripId}`,
    {
      is_sos_active: false,
      safety_passkey: null,
      updated_at: new Date().toISOString(),
    },
  );

/**
 * Refresh only the location fields (e.g. background periodic update).
 */
SafetyStatusAPI.updateLocation = (userId, tripId, { lat, long }) =>
  API.patch(
    `/rest/v1/safety_status?user_id=eq.${userId}&trip_id=eq.${tripId}`,
    {
      last_lat: lat,
      last_long: long,
      updated_at: new Date().toISOString(),
    },
  );

export default SafetyStatusAPI;
